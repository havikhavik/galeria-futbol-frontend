import { type ReactNode, useEffect, useState } from "react";

import { routes } from "../../../app/router/routes";
import { Footer } from "../../../shared/components/Footer/Footer";
import { navigateTo } from "../../../shared/utils/navigation";

import { LiveSearchContext, useLiveSearch } from "../liveSearch";

import { SiteHeader } from "./SiteHeader";
import { StadiumBackground } from "./StadiumBackground";
import styles from "./PublicLayout.module.css";

type PublicLayoutProps = {
  /** Page without hero: stadium fully darkened and header solid. */
  dimmed?: boolean;
  /** The page has the gallery: every search field searches as you type. */
  liveSearch?: boolean;
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
    };
  }, [dimmed]);

  return chrome;
}

// Pages without gallery (album detail): the mobile search button goes to the
// search page.
function goToSearchPage() {
  navigateTo(routes.search);
}

export function PublicLayout({
  dimmed = false,
  liveSearch = false,
  children,
}: PublicLayoutProps) {
  const { solid, docked } = useChrome(dimmed);
  const live = useLiveSearch(liveSearch);

  // One search field at a time: on the home page, while a search is active
  // and the bar is not pinned, the hero field is the one in view.
  const hideHeaderSearch = Boolean(live?.active) && !docked && !dimmed;

  return (
    <LiveSearchContext.Provider value={live}>
      <StadiumBackground dimmed={dimmed} />
      <SiteHeader
        solid={solid}
        docked={docked}
        hideSearch={hideHeaderSearch}
        onMobileSearch={live?.openMobileSearch ?? goToSearchPage}
      />
      <main className={styles.main}>{children}</main>
      <Footer />
    </LiveSearchContext.Provider>
  );
}
