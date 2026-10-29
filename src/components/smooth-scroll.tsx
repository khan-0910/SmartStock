"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Lenis smooth scrolling for the app and content pages. One instance, its own
 * rAF loop, reset to the top on navigation. Off for reduced-motion users.
 * Native <dialog> and anything marked data-lenis-prevent scroll normally.
 */
export function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.1,
      anchors: { offset: -24 },
      stopInertiaOnNavigate: true,
      prevent: (node) => node.nodeName === "DIALOG" || !!node.closest?.("dialog"),
    });
    lenisRef.current = lenis;
    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true });
  }, [pathname]);

  return null;
}
