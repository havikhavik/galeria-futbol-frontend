const BAR_SELECTOR = "[data-category-bar]";

export function headerHeight(): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--hh");
  return parseFloat(value) || 61;
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Scroll position where the category bar pins right below the header. */
export function galleryTop(): number | null {
  const gallery = document.querySelector(BAR_SELECTOR)?.parentElement;
  if (!gallery) return null;
  return gallery.getBoundingClientRect().top + window.scrollY - headerHeight() + 1;
}

/**
 * Brings the gallery to the top of the screen (from the hero or from further
 * down), so the results of a new tab, league, filter or sort start in view.
 * Returns whether it had to scroll.
 */
export function scrollToGallery(smooth = !prefersReducedMotion()): boolean {
  const top = galleryTop();
  if (top === null || Math.abs(window.scrollY - top) <= 2) return false;
  window.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
  return true;
}
