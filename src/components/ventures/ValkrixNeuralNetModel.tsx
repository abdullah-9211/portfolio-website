"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

// Same three-stop brand gradient used by .card-valkrix's aurora glow and
// .text-gradient-valkrix — this badge is a 3D extension of that identity
// rather than a new palette.
const STOP_1 = new THREE.Color("#4f7df3");
const STOP_2 = new THREE.Color("#a85de8");
const STOP_3 = new THREE.Color("#e85dbe");
const CORE_GLOW = "#e0a8f0";

function gradientColor(t: number) {
  const c = new THREE.Color();
  if (t < 0.5) {
    c.lerpColors(STOP_1, STOP_2, t / 0.5);
  } else {
    c.lerpColors(STOP_2, STOP_3, (t - 0.5) / 0.5);
  }
  return c;
}

type NetNode = {
  x: number;
  y: number;
  z: number;
  size: number;
  color: THREE.Color;
  layer: number;
};

type NetEdge = {
  aIdx: number;
  bIdx: number;
  midpoint: [number, number, number];
  quaternion: [number, number, number, number];
  length: number;
  color: THREE.Color;
};

// Three layers — input / hidden / output — the smallest count that still
// unambiguously reads as "a neural network diagram" rather than a generic
// node graph, per the client's ask to replace the old star/nebula swirl
// with an actual neural net illustration. Asymmetric layer widths
// (3-4-2) match how real MLP diagrams are commonly drawn, rather than a
// perfectly symmetric (and less recognizable) shape.
const LAYER_COUNTS = [3, 4, 2];
const LAYER_X = [-0.46, 0, 0.46];
const LAYER_SPACING = 0.24;

function buildNetwork() {
  const nodesByLayer: NetNode[][] = LAYER_COUNTS.map((count, li) => {
    const t = li / (LAYER_COUNTS.length - 1);
    const color = gradientColor(t);
    return Array.from({ length: count }, (_, ni) => ({
      x: LAYER_X[li],
      y: (ni - (count - 1) / 2) * LAYER_SPACING,
      // Small deterministic z jitter (not random — keeps the memoized
      // layout stable across re-renders) so the diagram has a touch of
      // depth instead of sitting perfectly flat.
      z: Math.sin(li * 2.1 + ni * 1.3) * 0.035,
      size: li === 1 ? 0.046 : 0.054,
      color,
      layer: li,
    }));
  });

  const nodes = nodesByLayer.flat();
  const layerStart: number[] = [];
  let acc = 0;
  for (const layerNodes of nodesByLayer) {
    layerStart.push(acc);
    acc += layerNodes.length;
  }

  const edges: NetEdge[] = [];
  // Per-node adjacency, built alongside the edges below: `forwardAdj` only
  // holds next-layer neighbors (used to trace a click "signal burst"
  // forward toward the output layer), while `nodeEdgeIdx` holds every edge
  // touching a node in either direction (used to highlight a hovered
  // node's full set of connections, not just its outgoing ones).
  const forwardAdj: number[][] = nodes.map(() => []);
  const nodeEdgeIdx: number[][] = nodes.map(() => []);

  for (let li = 0; li < nodesByLayer.length - 1; li++) {
    const tMid = (li + 0.5) / (LAYER_COUNTS.length - 1);
    const edgeColor = gradientColor(tMid);
    for (let ai = 0; ai < nodesByLayer[li].length; ai++) {
      const a = nodesByLayer[li][ai];
      const aIdx = layerStart[li] + ai;
      for (let bi = 0; bi < nodesByLayer[li + 1].length; bi++) {
        const b = nodesByLayer[li + 1][bi];
        const bIdx = layerStart[li + 1] + bi;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const dir = new THREE.Vector3(dx, dy, dz).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir
        );
        const edgeIdx = edges.length;
        edges.push({
          aIdx,
          bIdx,
          midpoint: [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2],
          quaternion: [quat.x, quat.y, quat.z, quat.w],
          length,
          color: edgeColor,
        });
        forwardAdj[aIdx].push(bIdx);
        nodeEdgeIdx[aIdx].push(edgeIdx);
        nodeEdgeIdx[bIdx].push(edgeIdx);
      }
    }
  }

  return { nodesByLayer, nodes, edges, forwardAdj, nodeEdgeIdx };
}

type Network = ReturnType<typeof buildNetwork>;

/** Greedy forward path from a node to the output layer, hopping to
 * whichever next-layer neighbor sits closest in y each step — keeps a
 * click-triggered burst visually smooth instead of zig-zagging. A node
 * already in the output layer has no forward neighbors, so it returns a
 * single-node "path," which callers treat as "flash in place," not
 * "travel." */
function buildForwardPath(network: Network, startIdx: number): number[] {
  const path = [startIdx];
  let current = startIdx;
  while (network.forwardAdj[current].length > 0) {
    const currentY = network.nodes[current].y;
    let best = network.forwardAdj[current][0];
    let bestDist = Infinity;
    for (const idx of network.forwardAdj[current]) {
      const d = Math.abs(network.nodes[idx].y - currentY);
      if (d < bestDist) {
        bestDist = d;
        best = idx;
      }
    }
    path.push(best);
    current = best;
  }
  return path;
}

function nodeTuple(n: NetNode): [number, number, number] {
  return [n.x, n.y, n.z];
}

/**
 * A small traveling bright pulse that hops from node to node along a fixed
 * path — either one of the two always-on background paths, or a transient
 * "burst" spawned by clicking a node (see `bursts` state below).
 *
 * Only rendered while `animate` is true, same convention as
 * CareerThreadModel's TravelingSpaceship: there's no single "correct"
 * static mid-pulse position, so reduced motion omits it entirely and the
 * plain node+edge diagram remains a complete, legible resting image.
 */
function SignalPulse({
  path,
  speed,
  phaseOffset,
  loop = true,
  boost = 0,
  onComplete,
}: {
  path: [number, number, number][];
  speed: number;
  phaseOffset: number;
  /** Background ambient pulses loop forever; click-triggered bursts play
   * once and report back so the parent can drop them from state. */
  loop?: boolean;
  boost?: number;
  onComplete?: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(phaseOffset);
  const done = useRef(false);
  const segments = path.length - 1;

  useFrame((_, delta) => {
    if (!meshRef.current || done.current) return;
    t.current += delta;
    const totalDuration = segments * speed;
    if (!loop && t.current >= totalDuration) {
      done.current = true;
      onComplete?.();
      return;
    }
    const phase = (t.current % totalDuration) / speed; // 0..segments
    const segIndex = Math.min(Math.floor(phase), segments - 1);
    const localT = phase - segIndex;
    const a = path[segIndex];
    const b = path[segIndex + 1];
    meshRef.current.position.set(
      a[0] + (b[0] - a[0]) * localT,
      a[1] + (b[1] - a[1]) * localT,
      a[2] + (b[2] - a[2]) * localT
    );
    if (matRef.current) {
      // Fades in/out across each hop rather than staying constantly lit,
      // so it reads as a discrete pulse traveling the network instead of
      // a node-sized light just sliding around.
      const fade = Math.sin(localT * Math.PI);
      matRef.current.emissiveIntensity = 1.1 + fade * (1.8 + boost);
    }
  });

  return (
    <mesh ref={meshRef} position={path[0]}>
      <sphereGeometry args={[0.032, 8, 8]} />
      <meshStandardMaterial
        ref={matRef}
        color="#0d0a18"
        emissive={CORE_GLOW}
        emissiveIntensity={1.4}
      />
    </mesh>
  );
}

let burstId = 0;

/**
 * Valkrix's badge: a small layered neural network illustration — three
 * node layers connected edge-to-edge in the brand gradient — replacing
 * the previous spiral-of-stars concept per the client's explicit feedback
 * ("make this a neural network instead of star network"). Nodes are small
 * spheres, edges are thin connecting cylinders between adjacent layers;
 * this is meant to read unambiguously as a neural net diagram, not an
 * abstract cosmic shape.
 *
 * Interactive, per client follow-up ("make it bigger and a little
 * interactive"): hovering a node highlights it and every edge touching it
 * — a small "trace the network" effect — and clicking a node fires an
 * extra signal burst that races forward along the network toward the
 * output layer (or, if the clicked node is already in the output layer,
 * flashes brightly in place). Both are deliberately restrained ("a
 * little") rather than a redesign: the resting diagram and its two
 * background pulses are unchanged, this just layers a cursor-reactive
 * highlight and a one-shot burst on top.
 *
 * Reduced motion: hover highlighting still works (it's an instant React
 * state swap, not a per-frame animation), but a click no longer spawns a
 * traveling burst — instead the clicked node's forward path flashes at
 * full brightness for one brief instant, the same "instant pose-swap"
 * convention DeskSetupModel established for click reactions under
 * `prefers-reduced-motion: reduce`.
 *
 * Static/reduced-motion frame: the full node+edge lattice at rest, no
 * rotation, no ambient pulse — a complete, legible diagram on its own,
 * matching every other model's resting-frame convention in this codebase.
 */
export function ValkrixNeuralNetModel({ animate }: { animate: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const network = useMemo(buildNetwork, []);
  const t = useRef(0);
  const { gl, invalidate } = useThree();

  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [bursts, setBursts] = useState<{ id: number; path: [number, number, number][] }[]>([]);
  const [flashNodes, setFlashNodes] = useState<Set<number>>(new Set());
  const flashTimeout = useRef<number | null>(null);

  useFrame((_, delta) => {
    if (!animate || !groupRef.current) return;
    t.current += delta;
    // Restrained sway, not a full spin — this is a diagram, not the old
    // nebula, so it should mostly sit still and let the signal pulses
    // carry the motion.
    groupRef.current.rotation.y = Math.sin(t.current * 0.4) * 0.09;
    groupRef.current.position.y = Math.sin(t.current * 0.9) * 0.015;
  });

  const pulsePaths = useMemo<[number, number, number][][]>(() => {
    const { nodesByLayer } = network;
    return [
      [nodesByLayer[0][0], nodesByLayer[1][0], nodesByLayer[2][0]].map(nodeTuple),
      [nodesByLayer[0][2], nodesByLayer[1][3], nodesByLayer[2][1]].map(nodeTuple),
    ];
  }, [network]);

  const highlightedEdges = useMemo(() => {
    if (hoveredNode == null) return null;
    return new Set(network.nodeEdgeIdx[hoveredNode]);
  }, [hoveredNode, network]);

  function flashPath(idxs: number[]) {
    setFlashNodes(new Set(idxs));
    if (flashTimeout.current != null) window.clearTimeout(flashTimeout.current);
    flashTimeout.current = window.setTimeout(() => {
      setFlashNodes(new Set());
      invalidate();
    }, 420);
    invalidate();
  }

  function handleNodeClick(idx: number) {
    const path = buildForwardPath(network, idx);
    if (animate && path.length >= 2) {
      const id = burstId++;
      const tuples = path.map((i) => nodeTuple(network.nodes[i]));
      setBursts((prev) => [...prev, { id, path: tuples }]);
    } else {
      // Output-layer node under animate, or any node under reduced
      // motion: no travel, just a bright instant flash along the path.
      flashPath(path);
    }
  }

  return (
    <group ref={groupRef} rotation={[0.1, -0.18, 0]}>
      {network.edges.map((edge, i) => {
        const isHighlighted = highlightedEdges?.has(i) ?? false;
        const isFlashed = flashNodes.has(edge.aIdx) && flashNodes.has(edge.bIdx);
        return (
          <mesh key={i} position={edge.midpoint} quaternion={edge.quaternion}>
            <cylinderGeometry args={[0.009, 0.009, edge.length, 6]} />
            <meshStandardMaterial
              color="#0d0a18"
              emissive={isHighlighted || isFlashed ? CORE_GLOW : edge.color}
              emissiveIntensity={0.55 + (isHighlighted ? 0.9 : 0) + (isFlashed ? 1.1 : 0)}
              roughness={0.5}
            />
          </mesh>
        );
      })}
      {network.nodes.map((node, i) => {
        const isHovered = hoveredNode === i;
        const isFlashed = flashNodes.has(i);
        return (
          <mesh
            key={i}
            position={[node.x, node.y, node.z]}
            scale={isHovered ? 1.35 : 1}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              setHoveredNode(i);
              gl.domElement.style.cursor = "pointer";
            }}
            onPointerOut={(e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              setHoveredNode((cur) => (cur === i ? null : cur));
              gl.domElement.style.cursor = "auto";
            }}
            onClick={(e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              handleNodeClick(i);
            }}
          >
            <sphereGeometry args={[node.size, 10, 10]} />
            <meshStandardMaterial
              color="#0d0a18"
              emissive={isHovered || isFlashed ? CORE_GLOW : node.color}
              emissiveIntensity={1.05 + (isHovered ? 0.7 : 0) + (isFlashed ? 1.0 : 0)}
              roughness={0.3}
            />
          </mesh>
        );
      })}
      {animate &&
        pulsePaths.map((path, i) => (
          <SignalPulse key={`bg-${i}`} path={path} speed={0.85} phaseOffset={i * 0.85} />
        ))}
      {animate &&
        bursts.map((burst) => (
          <SignalPulse
            key={burst.id}
            path={burst.path}
            speed={0.5}
            phaseOffset={0}
            loop={false}
            boost={1.4}
            onComplete={() =>
              setBursts((prev) => prev.filter((b) => b.id !== burst.id))
            }
          />
        ))}
    </group>
  );
}
