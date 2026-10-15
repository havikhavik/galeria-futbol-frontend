import { CatalogGallery } from "../features/discovery/components/CatalogGallery";
import { PublicLayout } from "../features/discovery/components/PublicLayout";

export function ResultsPage() {
  return (
    <PublicLayout dimmed liveSearch>
      <CatalogGallery mode="search" />
    </PublicLayout>
  );
}
