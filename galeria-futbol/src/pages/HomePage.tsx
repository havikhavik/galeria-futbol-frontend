import { CatalogGallery } from "../features/discovery/components/CatalogGallery";
import { HeroSection } from "../features/discovery/components/HeroSection";
import { PublicLayout } from "../features/discovery/components/PublicLayout";
import { submitSearch } from "../shared/utils/navigation";

export function HomePage() {
  return (
    <PublicLayout liveSearch>
      <HeroSection onSearchSubmit={submitSearch} />
      <CatalogGallery mode="home" />
    </PublicLayout>
  );
}
