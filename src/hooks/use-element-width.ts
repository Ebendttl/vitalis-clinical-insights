"use client";

import { type RefCallback, useCallback, useState } from "react";

/**
 * Observed content width. Charts render inside a fixed-height box, so measuring
 * width after mount causes no layout shift (only the SVG fills in).
 */
export function useElementWidth<T extends HTMLElement>(): [RefCallback<T>, number] {
  const [width, setWidth] = useState(0);
  const ref = useCallback((node: T | null) => {
    if (!node) return;
    setWidth(node.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}
