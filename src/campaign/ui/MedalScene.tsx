"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { Font, type FontData } from "three/examples/jsm/loaders/FontLoader.js";
import fontData from "./medal-font.json";

const SILVER = "#dfe3ea";
const font = new Font(fontData as unknown as FontData);

/** Raised lettering, centred on its own origin. */
function lettering(text: string, size: number, depth: number) {
  const g = new THREE.ExtrudeGeometry(font.generateShapes(text, size), { depth, bevelEnabled: false, curveSegments: 6 });
  g.center();
  return g;
}

function starShape(points: number, outer: number, inner: number) {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function leafShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.075, 0.1, 0, 0.26);
  shape.quadraticCurveTo(-0.075, 0.1, 0, 0);
  return shape;
}

/** A struck silver medal on a ribbon. It hangs from a pivot and swings like a real one. */
function Medal({ animate }: { animate: boolean }) {
  const swing = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const state = useRef({ theta: 0.7, omega: 0, phi: Math.PI * 1.5, phiV: 0, lastY: 0, started: false, idle: 0 });
  const drag = useRef({ active: false, x: 0, lastX: 0 });

  const geo = useMemo(() => {
    // The coin's cross-section, revolved: a flat field with a raised, rounded rim.
    const profile = [
      [0, 0.05], [0.8, 0.05], [0.84, 0.09], [0.9, 0.11], [0.97, 0.1], [1, 0.06],
      [1, -0.06], [0.97, -0.1], [0.9, -0.11], [0.84, -0.09], [0.8, -0.05], [0, -0.05],
    ]
      .reverse()
      .map(([x, y]) => new THREE.Vector2(x, y));
    const coin = new THREE.LatheGeometry(profile, 96);
    coin.rotateX(Math.PI / 2);
    const bevel = { depth: 0.05, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.022, bevelSegments: 4 };
    const star = new THREE.ExtrudeGeometry(starShape(5, 0.36, 0.15), bevel);
    const leaf = new THREE.ExtrudeGeometry(leafShape(), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 });
    return {
      coin,
      star,
      leaf,
      silver: lettering("SILVER", 0.2, 0.03),
      medal: lettering("MEDAL", 0.2, 0.03),
      term: lettering("FALL 2021", 0.11, 0.022),
    };
  }, []);

  // Two sprays of laurel, one up each side, leaving a gap at the top and bottom.
  const leaves = useMemo(() => {
    const out: { pos: [number, number, number]; rot: number }[] = [];
    for (const side of [-1, 1]) {
      for (let i = 0; i < 11; i++) {
        const a = -Math.PI / 2 + side * (0.38 + i * 0.235);
        out.push({ pos: [Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0.05], rot: a + side * 0.62 - Math.PI / 2 + (side === 1 ? 0 : Math.PI) * 0 });
      }
    }
    return out;
  }, []);

  const ribbon = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 8;
    const ctx = c.getContext("2d")!;
    const bands: [string, number][] = [["#2f5d2e", 14], ["#e9efe4", 6], ["#6fa64a", 24], ["#e9efe4", 6], ["#2f5d2e", 14]];
    let x = 0;
    for (const [color, w] of bands) {
      ctx.fillStyle = color;
      ctx.fillRect(x, 0, w, 8);
      x += w;
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useFrame((_, dt) => {
    const s = state.current;
    const d = Math.min(dt, 0.05);
    if (!s.started) {
      s.started = true;
      s.lastY = window.scrollY;
    }
    // Scrolling the page gives the medal a push, the way walking would.
    const y = window.scrollY;
    const scrollV = (y - s.lastY) / Math.max(d, 0.001);
    s.lastY = y;
    if (animate) s.omega += Math.max(-0.5, Math.min(0.5, scrollV * 0.00012));
    s.omega = Math.max(-3.2, Math.min(3.2, s.omega));

    // A damped pendulum.
    s.omega += (-9.5 * Math.sin(s.theta) - 1.15 * s.omega) * d;
    s.theta += s.omega * d;

    // The face spins freely when thrown, then settles facing forward.
    if (!drag.current.active) {
      // Never dead-on: a slow turn to either side keeps light moving across the metal.
      s.idle += d;
      const front = Math.round(s.phi / Math.PI) * Math.PI + Math.sin(s.idle * 0.7) * 0.42;
      s.phiV += ((front - s.phi) * 5 - s.phiV * 2.2) * d;
      s.phi += s.phiV * d;
    }
    if (swing.current) swing.current.rotation.z = animate ? s.theta : 0;
    if (spin.current) spin.current.rotation.y = animate ? s.phi : 0;
  });

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    drag.current = { active: true, x: e.clientX, lastX: e.clientX };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.lastX;
    drag.current.lastX = e.clientX;
    state.current.phi += dx * 0.012;
    state.current.phiV = dx * 0.5;
    state.current.omega += dx * 0.004;
  };
  const onUp = () => {
    drag.current.active = false;
  };

  const metal = <meshStandardMaterial color={SILVER} metalness={1} roughness={0.16} envMapIntensity={1.35} />;
  const field = <meshStandardMaterial color="#8d95a2" metalness={1} roughness={0.36} envMapIntensity={1} />;

  return (
    <group position={[0, 1.95, 0]}>
      <group ref={swing}>
        {/* Ribbon: two bands meeting at the ring. */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.27, -0.72, -0.03]} rotation={[0, 0, side * -0.36]}>
            <boxGeometry args={[0.52, 1.56, 0.02]} />
            <meshStandardMaterial map={ribbon} roughness={0.85} metalness={0} />
          </mesh>
        ))}
        <mesh position={[0, -1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.14, 0.035, 12, 32]} />
          {metal}
        </mesh>

        <group ref={spin} position={[0, -2.62, 0]} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
          <mesh geometry={geo.coin}>{field}</mesh>
          {/* Rim, drawn again brighter than the field. */}
          <mesh rotation={[0, 0, 0]}>
            <torusGeometry args={[0.93, 0.07, 18, 96]} />
            {metal}
          </mesh>

          {/* Front: a star inside a laurel wreath. */}
          <mesh geometry={geo.star} position={[0, 0.02, 0.05]}>
            {metal}
          </mesh>
          {leaves.map((l, i) => (
            <mesh key={i} geometry={geo.leaf} position={l.pos} rotation={[0, 0, l.rot]}>
              {metal}
            </mesh>
          ))}

          {/* Back: what it was for. */}
          <group rotation={[0, Math.PI, 0]} position={[0, 0, -0.05]}>
            <mesh geometry={geo.silver} position={[0, 0.2, 0.012]}>
              {metal}
            </mesh>
            <mesh geometry={geo.medal} position={[0, -0.08, 0.012]}>
              {metal}
            </mesh>
            <mesh geometry={geo.term} position={[0, -0.4, 0.01]}>
              {metal}
            </mesh>
            <mesh position={[0, 0, 0.005]}>
              <torusGeometry args={[0.74, 0.012, 8, 96]} />
              {metal}
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

export default function MedalScene({ animate }: { animate: boolean }) {
  return (
    <Canvas camera={{ position: [0, 0, 6.4], fov: 34 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }} frameloop={animate ? "always" : "demand"}>
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      {/* A small studio built from light panels, so the silver has something to reflect. */}
      <Environment resolution={256}>
        <color attach="background" args={["#05080d"]} />
        <Lightformer form="rect" intensity={5} position={[0, 4, 2]} scale={[7, 1.2, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={3} position={[-4, 0.5, 2]} scale={[1.2, 6, 1]} color="#bfe6ff" />
        <Lightformer form="rect" intensity={2.4} position={[4, -0.5, 2]} scale={[1, 6, 1]} color="#cdeeb0" />
        <Lightformer form="circle" intensity={2} position={[0, -3, 3]} scale={3} color="#ffffff" />
        <Lightformer form="rect" intensity={1.5} position={[0, 0, -5]} scale={[10, 10, 1]} color="#27425f" />
        {/* Behind the camera: what the flat faces of the medal see. */}
        <Lightformer form="rect" intensity={0.22} position={[0, 1, 7]} scale={[12, 9, 1]} color="#c9d3e0" />
        <Lightformer form="rect" intensity={3} position={[3, -1, 6]} scale={[0.6, 7, 1]} color="#eaf6ff" />
        <Lightformer form="rect" intensity={6} position={[-2.5, 3, 6]} scale={[1.6, 3.4, 1]} color="#ffffff" />
      </Environment>
      <Medal animate={animate} />
      {animate && <Sparkles count={36} scale={[3.4, 4.6, 1.5]} position={[0, -0.4, 0]} size={2.2} speed={0.35} color="#dff5c8" opacity={0.7} />}
    </Canvas>
  );
}
