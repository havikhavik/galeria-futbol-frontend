import { AppProviders } from "./providers/AppProviders";
import { ProtectedRoute } from "./router/ProtectedRoute";
import { getAppPathname, routes, toAppPath } from "./router/routes";
import { AlbumDetailPage } from "../pages/AlbumDetailPage";
import { AdminDashboardPage } from "../pages/AdminDashboardPage";
import { AdminAlbumsPage } from "../pages/AdminAlbumsPage";
import { AdminAlbumEditPage } from "../pages/AdminAlbumEditPage.tsx";
import { AdminCollectionsPage } from "../pages/AdminCollectionsPage";
import { AdminCollectionEditorPage } from "../pages/AdminCollectionEditorPage";
import { AdminLoginPage } from "../pages/AdminLoginPage";
import { HomePage } from "../pages/HomePage";
import { ResultsPage } from "../pages/ResultsPage";
import { isAdminAuthenticated } from "../shared/auth/adminSession";
import { navigateTo, navigateWithCurrentUrl } from "../shared/utils/navigation";

function App() {
  const pathname = getAppPathname(window.location.pathname);

  const protectedPage =
    pathname === routes.admin ? (
      <AdminDashboardPage />
    ) : pathname === routes.adminAlbums ? (
      <AdminAlbumsPage />
    ) : pathname === routes.adminCollections ? (
      <AdminCollectionsPage />
    ) : pathname === routes.adminAlbumNew ||
      pathname.startsWith("/admin/albums/") ? (
      <AdminAlbumEditPage />
    ) : pathname === routes.adminCollectionNew ||
      pathname.startsWith("/admin/collections/") ? (
      <AdminCollectionEditorPage />
    ) : null;

  if (pathname === routes.adminLogin) {
    if (isAdminAuthenticated()) {
      navigateTo(routes.admin, { replace: true });
      return <AppProviders>{null}</AppProviders>;
    }
    return (
      <AppProviders>
        <AdminLoginPage />
      </AppProviders>
    );
  }

  if (protectedPage)
    return (
      <AppProviders>
        <ProtectedRoute>{protectedPage}</ProtectedRoute>
      </AppProviders>
    );

  // The category grid became the category bar of the gallery: old links land
  // on the home page with the same tab selected.
  if (pathname === routes.categories) {
    const teamType = new URLSearchParams(window.location.search).get("teamType");
    navigateWithCurrentUrl(
      (url) => {
        url.pathname = toAppPath(routes.home);
        url.search = "";
        if (teamType === "CLUB" || teamType === "NATIONAL") {
          url.searchParams.set("teamType", teamType);
        }
      },
      { replace: true },
    );
    return <AppProviders>{null}</AppProviders>;
  }

  const page =
    pathname === routes.search ? (
      <ResultsPage />
    ) : pathname.startsWith("/albums/") ? (
      <AlbumDetailPage />
    ) : (
      <HomePage />
    );

  return <AppProviders>{page}</AppProviders>;
}

export default App;
