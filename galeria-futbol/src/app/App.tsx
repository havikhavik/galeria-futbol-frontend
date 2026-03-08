import { AppProviders } from "./providers/AppProviders";
import { getAppPathname, routes } from "./router/routes";
import { DiscoveryPage } from "../pages/DiscoveryPage";
import { HomePage } from "../pages/HomePage";
import { ResultsPage } from "../pages/ResultsPage";

function App() {
  const pathname = getAppPathname(window.location.pathname);

  let page;
  if (pathname === routes.discovery) {
    page = <DiscoveryPage />;
  } else if (pathname === routes.search) {
    page = <ResultsPage />;
  } else {
    page = <HomePage />;
  }

  return <AppProviders>{page}</AppProviders>;
}

export default App;
