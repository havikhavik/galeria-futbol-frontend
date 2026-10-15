import { type RefObject, useEffect, useState } from "react";

export type ScrollEdges = {
  /** Content is wider than the scroller. */
  overflows: boolean;
  /** Scrolled away from the start. */
  scrolled: boolean;
  /** Scrolled to the end. */
  atEnd: boolean;
};

const NONE: ScrollEdges = { overflows: false, scrolled: false, atEnd: false };

/** Tracks the horizontal scroll position of a scroller to fade its edges. */
export function useScrollEdges(
  ref: RefObject<HTMLElement | null>,
  watch: unknown,
): ScrollEdges {
  const [edges, setEdges] = useState<ScrollEdges>(NONE);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      const overflows = element.scrollWidth > element.clientWidth + 1;
      const next = {
        overflows,
        scrolled: overflows && element.scrollLeft > 4,
        atEnd:
          overflows &&
          element.scrollLeft + element.clientWidth >= element.scrollWidth - 4,
      };
      setEdges((prev) =>
        prev.overflows === next.overflows &&
        prev.scrolled === next.scrolled &&
        prev.atEnd === next.atEnd
          ? prev
          : next,
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    Array.from(element.children).forEach((child) => observer.observe(child));
    element.addEventListener("scroll", measure, { passive: true });
    void document.fonts?.ready.then(measure);

    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", measure);
    };
  }, [ref, watch]);

  return edges;
}
