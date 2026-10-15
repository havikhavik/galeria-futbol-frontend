import { CatalogGallery } from "../features/discovery/components/CatalogGallery";
import { FeaturedCollectionsCarousel } from "../features/discovery/components/FeaturedCollectionsCarousel";
import { HeroSection } from "../features/discovery/components/HeroSection";
import { NavigationCards } from "../features/discovery/components/NavigationCards";
import { PublicLayout } from "../features/discovery/components/PublicLayout";
import { submitSearch } from "../shared/utils/navigation";

import styles from "./HomePage.module.css";

export function HomePage() {
  return (
    <PublicLayout>
      <HeroSection onSearchSubmit={submitSearch} />
      <div className={styles.navigation}>
        <NavigationCards />
      </div>
      <FeaturedCollectionsCarousel />
      <CatalogGallery mode="home" />
    </PublicLayout>
  );
}
