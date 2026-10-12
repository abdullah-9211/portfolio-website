"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";

const MODEL = "/models/link.glb";
/** Turned so he faces out over the valley, a little to the left, with his back to us. */
const FACING = Math.PI * 0.92;

/**
 * "Ocarina of Time Link" by projectmgame, used under CC BY 4.0.
 * https://sketchfab.com/3d-models/ocarina-of-time-link-c62717add333410987482d44959e56c7
 */
function Model({ animate }: { animate: boolean }) {
  const { scene } = useGLTF(MODEL);
  const sway = useRef<THREE.Group>(null);

  // Stand the model on the origin, one unit tall, whatever units it was made in.
  const { object, scale, offset } = useMemo(() => {
    const object = scene.clone(true);
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.roughness = 0.75;
      material.metalness = 0;
      if (material.map) material.map.anisotropy = 8;
    });
    return { object, scale: 1 / size.y, offset: new THREE.Vector3(-centre.x, -box.min.y, -centre.z) };
  }, [scene]);

  // Do the expensive first-frame work as soon as the model arrives, while the scene is still
  // off screen: upload every texture, compile the shaders, and draw once.
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const root = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    object.traverse((child) => {
      const material = (child as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (material?.map) gl.initTexture(material.map);
    });
    gl.compile(root, camera);
    invalidate();
  }, [object, gl, camera, root, invalidate]);

  useFrame((state) => {
    if (!sway.current || !animate) return;
    const t = state.clock.elapsedTime;
    // He is a statue of a model, so the life comes from weight shifting and breathing.
    sway.current.rotation.y = FACING + Math.sin(t * 0.5) * 0.035;
    sway.current.rotation.z = Math.sin(t * 0.8) * 0.006;
    sway.current.scale.setScalar(1 + Math.sin(t * 1.6) * 0.003);
  });

  return (
    <group ref={sway} rotation={[0, FACING, 0]}>
      <group scale={scale}>
        <primitive object={object} position={offset} />
      </group>
    </group>
  );
}

/**
 * Link, standing on the knoll in the vista. A real 3D model drawn on its
 * own transparent canvas over the landscape, lit to match it: a low warm
 * sun from the right and behind, and cool light from the sky.
 */
export function LinkFigure() {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(false);
  // Once the side quests are near, the model is loaded and kept ready, so it is there the
  // moment its scene appears.
  const [near, setNear] = useState(false);

  useEffect(() => {
    const act = root.current?.closest(".act");
    if (!act) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "150% 0px" },
    );
    io.observe(act);
    return () => io.disconnect();
  }, []);

  // Only animate while the scene he stands in is the one on screen.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const panel = el.closest<HTMLElement>("[data-panel]");
    const check = () => {
      const q = panel ? parseFloat(panel.style.getPropertyValue("--q")) || 0 : 0;
      const rect = el.getBoundingClientRect();
      const onScreen = rect.bottom > 0 && rect.top < window.innerHeight;
      setActive(onScreen && panel?.style.visibility !== "hidden" && q > 0.44);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  return (
    <div ref={root} className="link-figure" aria-hidden="true">
      {near && (
        <Canvas
          orthographic
          camera={{ position: [0, 0.5, 5], zoom: 1, near: 0.1, far: 20, left: -0.6, right: 0.6, top: 1.06, bottom: -0.04 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          frameloop={active && !reduced ? "always" : "demand"}
        >
          <hemisphereLight args={["#cfd9d2", "#4a5a2a", 1.5]} />
          <directionalLight position={[4, 2.2, -2.5]} intensity={4.2} color="#ffbd72" />
          <directionalLight position={[-3, 1.5, 3]} intensity={1.3} color="#b7c8cf" />
          <Suspense fallback={null}>
            <Model animate={active && !reduced} />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}

useGLTF.preload(MODEL);
