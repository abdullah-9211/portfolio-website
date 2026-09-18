"use client";

import { useEffect, useState } from "react";

const QUERY = "(hover: hover) and (pointer: fine)";

/**
 * True only for devices that can genuinely hover with a precise pointer
 * (mouse/trackpad). Used to gate effects like magnetic tilt so touch
 * devices never attach the listeners in the first place.
 */
export function usePointerFine(): boolean {
  const [isPointerFine, setIsPointerFine] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(QUERY);
    setIsPointerFine(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsPointerFine(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isPointerFine;
}
