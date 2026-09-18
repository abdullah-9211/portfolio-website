"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

const ReducedMotionContext = createContext(false);

export function ReducedMotionProvider({ children }: { children: ReactNode }) {
  const prefersReduced = usePrefersReducedMotion();
  return (
    <ReducedMotionContext.Provider value={prefersReduced}>
      {children}
    </ReducedMotionContext.Provider>
  );
}

export function useReducedMotion() {
  return useContext(ReducedMotionContext);
}
