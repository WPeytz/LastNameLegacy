"use client";

import { useEffect } from "react";

// When the app runs inside an iframe (the PeytzGames play page), report the
// content height to the parent so compact pages fit without empty space.
// Long pages stay within the original game viewport and scroll internally.
export default function EmbedResizer() {
  useEffect(() => {
    if (window.self === window.top) return;

    const maxEmbedHeight = window.innerHeight;

    // html/body height and any viewport-relative min-height (min-h-screen, or
    // arbitrary values like min-h-[calc(100vh-4rem)]) all track the iframe's
    // viewport, so the reported height would ratchet upward forever as the
    // parent grows the iframe. Pin them to natural sizes while embedded.
    const style = document.createElement("style");
    style.textContent = `
      html, body { height: auto !important; min-height: 0 !important; }
      .min-h-screen,
      [class*="min-h-["] { min-height: 0 !important; }
    `;
    document.head.appendChild(style);

    let frame = 0;
    const report = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        window.parent.postMessage(
          {
            type: "embed:height",
            height: Math.min(document.documentElement.scrollHeight, maxEmbedHeight),
          },
          "*",
        );
      });
    };

    const observer = new ResizeObserver(report);
    observer.observe(document.body);
    report();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      style.remove();
    };
  }, []);

  return null;
}
