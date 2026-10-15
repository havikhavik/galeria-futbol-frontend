import type { ReactNode } from "react";

import { Footer } from "../../../shared/components/Footer/Footer";
import { submitSearch } from "../../../shared/utils/navigation";

import { HomeHeader } from "./HomeHeader";
import { StadiumBackground } from "./StadiumBackground";
import styles from "./PublicLayout.module.css";

type PublicLayoutProps = {
  /** Stadium starts fully darkened (pages without hero). */
  dimmed?: boolean;
  searchValue?: string;
  children: ReactNode;
};

export function PublicLayout({
  dimmed = false,
  searchValue,
  children,
}: PublicLayoutProps) {
  return (
    <>
      <StadiumBackground dimmed={dimmed} />
      <div className={styles.page}>
        <div className={styles.header}>
          <HomeHeader onSearchSubmit={submitSearch} searchValue={searchValue} />
        </div>
        <main>{children}</main>
      </div>
      <Footer />
    </>
  );
}
