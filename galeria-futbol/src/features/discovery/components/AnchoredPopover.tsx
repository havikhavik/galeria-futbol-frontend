import {
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";

import styles from "./AnchoredPopover.module.css";

type AnchoredPopoverProps = {
  id: string;
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  /** Close request. `returnFocus` is true when closed with Escape. */
  onClose: (returnFocus: boolean) => void;
  /** Narrow variant (sort options). */
  narrow?: boolean;
  role?: string;
  labelledBy?: string;
  children: ReactNode;
};

const EDGE = 12;
const GAP = 8;

/**
 * Dropdown mounted on <body> so the sticky bar never clips it, and anchored
 * to its button: 8px below, aligned to the button's right edge, at least 12px
 * from the screen edges. Its height is capped to the space left below.
 */
export function AnchoredPopover({
  id,
  open,
  anchorRef,
  onClose,
  narrow = false,
  role = "dialog",
  labelledBy,
  children,
}: AnchoredPopoverProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open) return;

    const place = () => {
      const popover = popoverRef.current;
      const anchor = anchorRef.current;
      if (!popover || !anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = popover.offsetWidth;
      const left = Math.max(
        EDGE,
        Math.min(rect.right - width, window.innerWidth - EDGE - width),
      );
      popover.style.left = `${left}px`;
      popover.style.top = `${rect.bottom + GAP}px`;
      popover.style.setProperty(
        "--max-height",
        `${Math.max(180, window.innerHeight - rect.bottom - GAP - EDGE)}px`,
      );
    };

    place();
    window.addEventListener("scroll", place, { passive: true, capture: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, { capture: true });
      window.removeEventListener("resize", place);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => {
      popoverRef.current
        ?.querySelector<HTMLElement>("input, [aria-selected='true']")
        ?.focus({ preventScroll: true });
    }, 30);

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose(true);
    };

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, anchorRef, onClose]);

  return createPortal(
    <div
      ref={popoverRef}
      id={id}
      role={role}
      aria-labelledby={labelledBy}
      className={`${styles.popover} ${narrow ? styles.narrow : ""} ${
        open ? styles.open : ""
      }`}
    >
      {children}
    </div>,
    document.body,
  );
}
