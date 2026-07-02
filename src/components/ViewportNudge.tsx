"use client";

import { useEffect } from "react";

/**
 * iOS PWA quirk: nothing forces WebKit to repaint after cold-launch, bfcache
 * resume, or the font-swap reflow, so the tail of a scrollable region can stay
 * unpainted until the user manually scrolls. Force a reflow on the events
 * known to trigger that — cheaper and more reliable than scrolling the page,
 * and works without knowing which element on the current screen scrolls.
 */
export default function ViewportNudge() {
  useEffect(() => {
    const nudge = () => {
      void document.documentElement.offsetHeight;
      document.documentElement.style.overflow = "hidden";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.documentElement.style.overflow = "";
        });
      });
    };
    nudge();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", nudge);
    window.addEventListener("pageshow", nudge);
    document.addEventListener("visibilitychange", nudge);
    return () => {
      vv?.removeEventListener("resize", nudge);
      window.removeEventListener("pageshow", nudge);
      document.removeEventListener("visibilitychange", nudge);
    };
  }, []);

  return null;
}
