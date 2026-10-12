"use client";

/* three.js keeps its geometry and material state in mutable buffers that are
   written every frame, which is what the React compiler rules below forbid. */
/* eslint-disable react-hooks/immutability */

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import land from "./land.json";
import { REGIONS, type Stats } from "./events";

type GlobeProps = {
  stats: Stats;
  /** Region to turn toward, or null to drift. */
  focus: number | null;
  animate: boolean;
  /** Reports what the visitor has turned the globe to face, or null while it is aimed for them. */
  onFacing?: (name: string | null) => void;
};

const points = land as number[];
const COUNT = points.length / 3;
const DEG = Math.PI / 180;

const HEALTHY = new THREE.Color("#6fdc7c");
const STRESSED = new THREE.Color("#e3c26a");
const BURNT = new THREE.Color("#e2714f");
const DEAD = new THREE.Color("#6f6660");
const ICE = new THREE.Color("#eef6ff");
const OCEAN_COOL = new THREE.Color("#0b2a4a");
const OCEAN_HOT = new THREE.Color("#2a1c2c");

/** A name for open water at a latitude and longitude. */
function oceanAt(lat: number, lon: number) {
  if (lat > 66) return "Arctic Ocean";
  if (lat < -55) return "Southern Ocean";
  if (lon > -70 && lon < 20) return "Atlantic Ocean";
  if (lon >= 20 && lon < 120 && lat < 30) return "Indian Ocean";
  return "Pacific Ocean";
}

function Planet({ stats, focus, animate, onFacing }: GlobeProps) {
  const group = useRef<THREE.Group>(null);
  const ocean = useRef<THREE.MeshBasicMaterial>(null);
  const geometry = useRef<THREE.BufferGeometry>(null);
  const drag = useRef({ active: false, x: 0, y: 0, yaw: 0, tilt: 0 });
  // Once the visitor turns the globe it stays where they left it until the next decision.
  const held = useRef(false);
  const yaw = useRef(1.2);
  const tilt = useRef(0.25);
  const dom = useThree((state) => state.gl.domElement);

  const facing = useRef<string | null>(null);
  const frame = useRef(0);
  const report = useRef(onFacing);
  useEffect(() => {
    report.current = onFacing;
  });

  useEffect(() => {
    held.current = false;
    facing.current = null;
    report.current?.(null);
  }, [focus]);

  // Dragging is handled on the canvas element, so it works anywhere on it and keeps
  // working when the pointer leaves the sphere mid-drag.
  useEffect(() => {
    const down = (e: PointerEvent) => {
      drag.current = { active: true, x: e.clientX, y: e.clientY, yaw: yaw.current, tilt: tilt.current };
      held.current = true;
      dom.setPointerCapture(e.pointerId);
      dom.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (!drag.current.active) return;
      yaw.current = drag.current.yaw + (e.clientX - drag.current.x) * 0.008;
      tilt.current = Math.max(-1.1, Math.min(1.1, drag.current.tilt + (e.clientY - drag.current.y) * 0.006));
    };
    const up = (e: PointerEvent) => {
      drag.current.active = false;
      dom.style.cursor = "grab";
      if (dom.hasPointerCapture(e.pointerId)) dom.releasePointerCapture(e.pointerId);
    };
    dom.style.cursor = "grab";
    dom.style.touchAction = "pan-y";
    dom.addEventListener("pointerdown", down);
    dom.addEventListener("pointermove", move);
    dom.addEventListener("pointerup", up);
    dom.addEventListener("pointercancel", up);
    return () => {
      dom.removeEventListener("pointerdown", down);
      dom.removeEventListener("pointermove", move);
      dom.removeEventListener("pointerup", up);
      dom.removeEventListener("pointercancel", up);
    };
  }, [dom]);

  const { positions, colors, targets } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const lat = points[i * 3] * DEG;
      const lon = points[i * 3 + 1] * DEG;
      positions[i * 3] = Math.cos(lat) * Math.sin(lon);
      positions[i * 3 + 1] = Math.sin(lat);
      positions[i * 3 + 2] = Math.cos(lat) * Math.cos(lon);
    }
    return { positions, colors: new Float32Array(COUNT * 3).fill(0.4), targets: new Float32Array(COUNT * 3) };
  }, []);

  // Work out what every point of land should look like for the current state of the world.
  useEffect(() => {
    const damage = Math.min(1, Math.max(0, (stats.heat - 25) / 75) * 0.62 + Math.max(0, (78 - stats.bio) / 78) * 0.6);
    const c = new THREE.Color();
    const oceanNow = OCEAN_COOL.clone().lerp(OCEAN_HOT, Math.min(1, stats.heat / 100));
    // Ice holds only above a latitude that climbs as the sea rises.
    const iceLine = 60 + (stats.sea / 100) * 26;
    for (let i = 0; i < COUNT; i++) {
      const lat = Math.abs(points[i * 3]);
      const region = points[i * 3 + 2];
      // Vary each point a little so the land is not one flat colour.
      const jitter = ((i * 2654435761) % 1000) / 1000;
      if (region === 6) {
        if (lat >= iceLine) c.copy(ICE);
        else c.copy(oceanNow).lerp(DEAD, 0.25);
      } else {
        const d = Math.min(1, damage + (jitter - 0.5) * 0.3);
        if (d < 0.4) c.copy(HEALTHY).lerp(STRESSED, d / 0.4);
        else if (d < 0.75) c.copy(STRESSED).lerp(BURNT, (d - 0.4) / 0.35);
        else c.copy(BURNT).lerp(DEAD, (d - 0.75) / 0.25);
        // Coasts and lowlands go under as the sea rises.
        if (jitter < (stats.sea - 35) / 160) c.copy(oceanNow).lerp(c, 0.15);
        if (focus !== null && region === focus) c.lerp(ICE, 0.1);
        else if (focus !== null) c.multiplyScalar(0.55);
      }
      targets[i * 3] = c.r;
      targets[i * 3 + 1] = c.g;
      targets[i * 3 + 2] = c.b;
    }
    if (ocean.current) ocean.current.userData.target = oceanNow;
    if (!animate) {
      colors.set(targets);
      if (geometry.current) geometry.current.attributes.color.needsUpdate = true;
      if (ocean.current) ocean.current.color.copy(oceanNow);
    }
  }, [stats, focus, animate, colors, targets]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const k = Math.min(1, delta * 3);

    if (!drag.current.active && !held.current) {
      if (focus !== null) {
        const target = -REGIONS[focus].lon * DEG;
        // Turn the short way round.
        let d = (target - yaw.current) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        yaw.current += d * k;
        tilt.current += (REGIONS[focus].lat * DEG * 0.6 - tilt.current) * k;
      } else if (animate) {
        yaw.current += delta * 0.12;
        tilt.current += (0.25 - tilt.current) * k;
      }
    }
    g.rotation.y = yaw.current;
    g.rotation.x = tilt.current;

    // Once the visitor has taken hold of the globe, name whatever is facing them.
    if (held.current && frame.current++ % 6 === 0) {
      const ct = Math.cos(tilt.current);
      const dx = -ct * Math.sin(yaw.current);
      const dy = Math.sin(tilt.current);
      const dz = ct * Math.cos(yaw.current);
      let best = -1;
      let bestDot = 0.988; // within about nine degrees of land
      for (let i = 0; i < COUNT; i++) {
        const dot = positions[i * 3] * dx + positions[i * 3 + 1] * dy + positions[i * 3 + 2] * dz;
        if (dot > bestDot) {
          bestDot = dot;
          best = i;
        }
      }
      const name =
        best >= 0 ? REGIONS[points[best * 3 + 2]].name : oceanAt(Math.asin(dy) / DEG, Math.atan2(dx, dz) / DEG);
      if (name !== facing.current) {
        facing.current = name;
        report.current?.(name);
      }
    }

    if (animate && geometry.current) {
      let changed = false;
      for (let i = 0; i < colors.length; i++) {
        const diff = targets[i] - colors[i];
        if (Math.abs(diff) > 0.002) {
          colors[i] += diff * Math.min(1, delta * 2.4);
          changed = true;
        }
      }
      if (changed) geometry.current.attributes.color.needsUpdate = true;
      const target = ocean.current?.userData.target as THREE.Color | undefined;
      if (ocean.current && target) ocean.current.color.lerp(target, Math.min(1, delta * 2.4));
    }
    if (!animate) state.invalidate();
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[0.985, 48, 48]} />
        <meshBasicMaterial ref={ocean} color="#0b2a4a" />
      </mesh>
      <points>
        <bufferGeometry ref={geometry}>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.027} vertexColors sizeAttenuation />
      </points>
    </group>
  );
}

/** The planet, drawn as points of land on a dark ocean. It changes colour as the world does. */
export default function Globe(props: GlobeProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.9], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      frameloop={props.animate ? "always" : "demand"}
    >
      <Planet {...props} />
    </Canvas>
  );
}
