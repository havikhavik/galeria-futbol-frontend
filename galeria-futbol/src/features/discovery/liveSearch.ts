import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  updateUrlSearchParams,
  useUrlSearchParams,
} from "../../shared/hooks/useUrlSearchParams";

import { galleryTop, prefersReducedMotion } from "./galleryScroll";

const DEBOUNCE_MS = 250;
const MIN_LENGTH = 2;

const HEADER_INPUT = "[data-header-search] input";
const BAR_INPUT = "[data-mobile-search] input";

export type LiveSearch = {
  /** Text shared by every search field on the page. */
  value: string;
  /** One letter typed: the search waits for a second one. */
  showHint: boolean;
  /** A search is active, or the user opened the mobile search. */
  active: boolean;
  change: (raw: string) => void;
  /** Enter: search right away and add a history entry. */
  commit: (raw: string) => void;
  /** Mobile header button: open the search field inside the bar. */
  openMobileSearch: () => void;
};

export const LiveSearchContext = createContext<LiveSearch | null>(null);

export function useLiveSearchContext(): LiveSearch | null {
  return useContext(LiveSearchContext);
}

const isMobile = () => window.matchMedia("(max-width: 820px)").matches;

const currentUrlQuery = () =>
  new URLSearchParams(window.location.search).get("q") || "";

function focusAtEnd(input: HTMLInputElement | null) {
  if (!input) return;
  input.focus({ preventScroll: true });
  const end = input.value.length;
  try {
    input.setSelectionRange(end, end);
  } catch {
    // Some input types don't support selection ranges.
  }
}

/**
 * Live search for pages with the gallery. Results follow the `q` URL param:
 * while typing it is updated with replaceState (after 250ms, from 2 letters);
 * Enter updates it right away with pushState. The first search of a session
 * also adds a history entry, so Back returns to the catalog.
 */
export function useLiveSearch(enabled: boolean): LiveSearch | null {
  const urlQuery = useUrlSearchParams().get("q") || "";
  const [value, setValue] = useState(urlQuery);
  const [showHint, setShowHint] = useState(false);
  const [mobileRequested, setMobileRequested] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  const pushedRef = useRef(Boolean(urlQuery));

  const active = Boolean(urlQuery) || mobileRequested;

  // Back/forward: the fields show the query of that history entry.
  useEffect(() => {
    const onPopState = () => {
      window.clearTimeout(timerRef.current);
      const q = currentUrlQuery();
      setValue(q);
      setShowHint(false);
      pushedRef.current = Boolean(q);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    if (active) root.dataset.qOn = "true";
    else delete root.dataset.qOn;
    return () => {
      delete root.dataset.qOn;
    };
  }, [enabled, active]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  // Brings the results into view. A search typed in the hero moves the focus
  // to the header field (the bar field, on mobile) once the bar is pinned,
  // because the hero field hides at that point.
  const reveal = useCallback((fromHero: boolean) => {
    const root = document.documentElement;
    const top = galleryTop();
    const needsScroll = top !== null && Math.abs(window.scrollY - top) > 2;
    const smooth = needsScroll && !prefersReducedMotion() && !(fromHero && isMobile());

    if (needsScroll && top !== null) {
      window.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
    }
    if (!fromHero) return;

    let done = false;
    const moveFocus = () => {
      if (done) return;
      done = true;
      if (top !== null) root.dataset.docked = "true";
      root.dataset.qOn = "true";
      focusAtEnd(
        document.querySelector<HTMLInputElement>(isMobile() ? BAR_INPUT : HEADER_INPUT),
      );
    };
    if (smooth) {
      window.addEventListener("scrollend", moveFocus, { once: true });
      window.setTimeout(moveFocus, 700);
    } else {
      moveFocus();
    }
  }, []);

  const applyQuery = useCallback((query: string, push: boolean) => {
    updateUrlSearchParams(
      (p) => {
        if (query) p.set("q", query);
        else p.delete("q");
        p.delete("page");
      },
      { push },
    );
  }, []);

  const clearQuery = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setShowHint(false);
    pushedRef.current = false;
    applyQuery("", false);
  }, [applyQuery]);

  const change = useCallback(
    (raw: string) => {
      setValue(raw);
      window.clearTimeout(timerRef.current);
      const query = raw.trim();

      if (!query) {
        clearQuery();
        return;
      }
      if (query.length < MIN_LENGTH) {
        setShowHint(true);
        return;
      }
      setShowHint(false);
      if (query === currentUrlQuery()) return;

      const fromHero = Boolean(
        document.activeElement?.closest("[data-hero-search]"),
      );
      timerRef.current = window.setTimeout(() => {
        applyQuery(query, !pushedRef.current);
        pushedRef.current = true;
        reveal(fromHero);
      }, DEBOUNCE_MS);
    },
    [applyQuery, clearQuery, reveal],
  );

  const commit = useCallback(
    (raw: string) => {
      window.clearTimeout(timerRef.current);
      const query = raw.trim();
      if (!query) {
        clearQuery();
        return;
      }
      if (query.length < MIN_LENGTH) {
        setShowHint(true);
        return;
      }
      setShowHint(false);

      const field = document.activeElement as HTMLElement | null;
      const fromHero = Boolean(field?.closest("[data-hero-search]"));
      applyQuery(query, true);
      pushedRef.current = true;
      // Closes the on-screen keyboard.
      if (isMobile()) field?.blur();
      reveal(fromHero && !isMobile());
    },
    [applyQuery, clearQuery, reveal],
  );

  // The jump is instant so the bar field is visible when focused: iOS only
  // opens the keyboard if focus happens within the tap.
  const openMobileSearch = useCallback(() => {
    const root = document.documentElement;
    const top = galleryTop();
    if (top !== null) {
      if (window.scrollY < top) window.scrollTo({ top, behavior: "auto" });
      root.dataset.docked = "true";
    }
    root.dataset.qOn = "true";
    setMobileRequested(true);
    focusAtEnd(document.querySelector<HTMLInputElement>(BAR_INPUT));
  }, []);

  const live = useMemo(
    () => ({ value, showHint, active, change, commit, openMobileSearch }),
    [value, showHint, active, change, commit, openMobileSearch],
  );

  return enabled ? live : null;
}
