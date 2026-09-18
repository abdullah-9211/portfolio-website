"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useMotionValue, useSpring, useTransform } from "framer-motion";
import { usePointerFine } from "@/lib/usePointerFine";
import { useReducedMotion } from "@/components/primitives/ReducedMotionProvider";

const MAX_TILT_DEG = 6;

/**
 * Magnetic tilt for the venture cards. Gated behind a real pointer-fine
 * media query check (not just visually disabled on touch) and skipped
 * entirely under reduced-motion, since it's a motion effect.
 */
export function useMagneticTilt() {
  const isPointerFine = usePointerFine();
  const prefersReduced = useReducedMotion();
  const enabled = isPointerFine && !prefersReduced;

  const ref = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 200, damping: 20 });
  const springY = useSpring(rawY, { stiffness: 200, damping: 20 });

  const rotateX = useTransform(springY, [-0.5, 0.5], [MAX_TILT_DEG, -MAX_TILT_DEG]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-MAX_TILT_DEG, MAX_TILT_DEG]);

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!enabled || !ref.current) return;
    const bounds = ref.current.getBoundingClientRect();
    rawX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    rawY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  }

  function handlePointerLeave() {
    rawX.set(0);
    rawY.set(0);
  }

  return {
    ref,
    enabled,
    rotateX,
    rotateY,
    handlePointerMove,
    handlePointerLeave,
  };
}
