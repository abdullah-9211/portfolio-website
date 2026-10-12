"use client";

/* three.js uniforms are mutated every frame by design. */
/* eslint-disable react-hooks/immutability */

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// The artwork is flat, so depth is faked: a height map shifts each pixel
// by how far forward it sits, and the same map gives a surface normal to
// light. Moving the pointer then turns the figure and moves the light.
const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uDepth;
  uniform vec2 uPointer;
  uniform float uTime;
  uniform float uStrike;
  varying vec2 vUv;

  void main() {
    float d0 = texture2D(uDepth, vUv).r;
    vec2 uv = vUv + (d0 - 0.42) * uPointer * vec2(-0.05, 0.032);
    // Breathing: the chest rises a little.
    uv.y -= sin(uTime * 1.5) * 0.004 * smoothstep(0.25, 0.75, vUv.y) * d0;

    vec4 c = texture2D(uMap, uv);
    float d = texture2D(uDepth, uv).r;
    float e = 0.005;
    float dx = texture2D(uDepth, uv + vec2(e, 0.0)).r - texture2D(uDepth, uv - vec2(e, 0.0)).r;
    float dy = texture2D(uDepth, uv + vec2(0.0, e)).r - texture2D(uDepth, uv - vec2(0.0, e)).r;
    vec3 n = normalize(vec3(-dx * 7.0, -dy * 7.0, 1.0));

    vec3 key = normalize(vec3(uPointer * 0.9, 0.9));
    float lit = max(dot(n, key), 0.0);

    // The forge is off to the lower left. Its light flickers and flares on a hammer strike.
    vec3 fire = normalize(vec3(-0.85, -0.45, 0.35));
    float flicker = 0.72 + 0.28 * sin(uTime * 7.3) * sin(uTime * 3.1 + 1.0);
    float rim = pow(max(dot(n, fire), 0.0), 2.2) * (1.0 - d * 0.55);

    vec3 col = c.rgb * (0.86 + 0.34 * lit);
    col += vec3(1.0, 0.52, 0.14) * rim * (0.7 * flicker + uStrike * 2.2);
    col += vec3(1.0, 0.7, 0.35) * uStrike * 0.12 * c.rgb;
    gl_FragColor = vec4(col * c.a, c.a);
  }
`;

function Figure({ animate, strike }: { animate: boolean; strike: React.RefObject<number> }) {
  const pointer = useRef(new THREE.Vector2());
  const viewport = useThree((state) => state.viewport);
  const invalidate = useThree((state) => state.invalidate);

  // Loaded without suspending: the still image underneath covers the wait.
  const uniforms = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const map = loader.load("/photos/forge/beaver.webp", () => invalidate());
    const depth = loader.load("/photos/forge/beaver-depth.webp", () => invalidate());
    map.colorSpace = THREE.SRGBColorSpace;
    return {
      uMap: { value: map },
      uDepth: { value: depth },
      uPointer: { value: new THREE.Vector2() },
      uTime: { value: 0 },
      uStrike: { value: 0 },
    };
  }, [invalidate]);

  useFrame((state, dt) => {
    if (!animate) return;
    uniforms.uTime.value += dt;
    // Follow the pointer with some weight, and sway a little when it is away.
    const idleX = Math.sin(uniforms.uTime.value * 0.6) * 0.25;
    pointer.current.set(state.pointer.x || idleX, state.pointer.y);
    uniforms.uPointer.value.lerp(pointer.current, Math.min(1, dt * 4));
    strike.current = Math.max(0, strike.current - dt * 2.4);
    uniforms.uStrike.value = strike.current;
  });

  // The canvas has the artwork's shape, so the plane simply fills it.
  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} transparent depthWrite={false} blending={THREE.CustomBlending} blendSrc={THREE.OneFactor} blendDst={THREE.OneMinusSrcAlphaFactor} />
    </mesh>
  );
}

export default function BeaverScene({ animate, strike }: { animate: boolean; strike: React.RefObject<number> }) {
  return (
    <Canvas camera={{ position: [0, 0, 3], fov: 30 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true, premultipliedAlpha: true }} frameloop={animate ? "always" : "demand"}>
      <Figure animate={animate} strike={strike} />
    </Canvas>
  );
}
