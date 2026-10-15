import { type RefObject, useEffect } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab and Shift+Tab cycling inside a modal dialog while it's open. */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const container = ref.current;
      if (event.key !== "Tab" || !container) return;

      const items = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.getClientRects().length > 0);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      const outside = !container.contains(current);

      if (event.shiftKey && (current === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [ref, active]);
}
