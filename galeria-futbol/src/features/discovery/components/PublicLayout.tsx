import { type ReactNode, useEffect, useState } from "react";

import { Footer } from "../../../shared/components/Footer/Footer";

import { SiteHeader } from "./SiteHeader";
import { StadiumBackground } from "./StadiumBackground";
import styles from "./PublicLayout.module.css";

type PublicLayoutProps = {
  /** Page without hero: stadium fully darkened and header solid. */
  dimmed?: boolean;
  searchValue?: string;
  children: ReactNode;
};

type Chrome = { solid: boolean; docked: boolean };

const BAR_SELECTOR = "[data-category-bar]";

function headerHeight(): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--hh");
  return parseFloat(value) || 61;
}

/**
 * Header and category bar state. "docked": the bar is pinned under the header
 * (both share one surface). "solid": the header shows its surface and search.
 */
function useChrome(dimmed: boolean): Chrome {
  const [chrome, setChrome] = useState<Chrome>({ solid: dimmed, docked: false });

  useEffect(() => {
    const root = document.documentElement;
    let ticking = false;

    const update = () => {
      ticking = false;
      const bar = document.querySelector(BAR_SELECTOR);
      const docked = bar
        ? bar.getBoundingClientRect().top <= headerHeight() + 0.5
        : false;
      const solid = dimmed || docked || window.scrollY > window.innerHeight * 0.5;

      if (docked) root.dataset.docked = "true";
      else delete root.dataset.docked;

      setChrome((prev) =>
        prev.solid === solid && prev.docked === docked ? prev : { solid, docked },
      );
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      delete root.dataset.docked;
      delete root.dataset.searchOpen;
    };
  }, [dimmed]);

  return chrome;
}

// Mobile search button: jumps to the gallery so the bar pins, shows the
// search field inside it and focuses it. The jump is instant so the field is
// already visible when focused: iOS only opens the keyboard if focus happens
// within the tap.
function openMobileSearch() {
  const root = document.documentElement;
  const bar = document.querySelector<HTMLElement>(BAR_SELECTOR);
  const gallery = bar?.parentElement;
  if (gallery) {
    const top =
      gallery.getBoundingClientRect().top + window.scrollY - headerHeight() + 1;
    if (window.scrollY < top) window.scrollTo({ top, behavior: "auto" });
    root.dataset.docked = "true";
  }
  root.dataset.searchOpen = "true";
  bar
    ?.querySelector<HTMLInputElement>("[data-mobile-search] input")
    ?.focus({ preventScroll: true });
}

export function PublicLayout({
  dimmed = false,
  searchValue,
  children,
}: PublicLayoutProps) {
  const { solid, docked } = useChrome(dimmed);

  return (
    <>
      <StadiumBackground dimmed={dimmed} />
      <SiteHeader
        solid={solid}
        docked={docked}
        searchValue={searchValue}
        onMobileSearch={openMobileSearch}
      />
      <main className={styles.main}>{children}</main>
      <Footer />
    </>
  );
}
