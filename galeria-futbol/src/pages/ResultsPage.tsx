import { CatalogGallery } from "../features/discovery/components/CatalogGallery";
import { PublicLayout } from "../features/discovery/components/PublicLayout";
import { readSearchParams } from "../shared/utils/parsers";

export function ResultsPage() {
  const query = readSearchParams().get("q") || "";

  return (
    <PublicLayout dimmed searchValue={query}>
      <CatalogGallery mode="search" />
    </PublicLayout>
  );
}
