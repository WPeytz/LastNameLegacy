"use client";

import { useEffect } from "react";

// When the app runs inside an iframe (the PeytzGames play page), report the
// content height to the parent so it can size the iframe to fit and the
// nested scrollbar disappears.
export default function EmbedResizer() {
  useEffect(() => {
    if (window.self === window.top) return;

    // html/body height and min-h-screen all track the iframe's viewport, so
    // the reported height would ratchet upward forever as the parent grows
    // the iframe. Pin them to natural/fixed sizes while embedded.
    const style = document.createElement("style");
    style.textContent = `
      html, body { height: auto !important; min-height: 0 !important; }
      .min-h-screen { min-height: 600px !important; }
    `;
    document.head.appendChild(style);

    let frame = 0;
    const report = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        window.parent.postMessage(
          { type: "embed:height", height: document.documentElement.scrollHeight },
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
