import { AppProviders } from "./providers/AppProviders";
import { getAppPathname, routes } from "./router/routes";
import { AlbumDetailPage } from "../pages/AlbumDetailPage";
import { CategoriesPage } from "../pages/CategoriesPage";
import { HomePage } from "../pages/HomePage";
import { ResultsPage } from "../pages/ResultsPage";

function App() {
  const pathname = getAppPathname(window.location.pathname);

  let page;
  if (pathname === routes.categories) {
    page = <CategoriesPage />;
  } else if (pathname === routes.search) {
    page = <ResultsPage />;
  } else if (pathname.startsWith("/albums/")) {
    page = <AlbumDetailPage />;
  } else {
    page = <HomePage />;
  }

  return <AppProviders>{page}</AppProviders>;
}

export default App;
