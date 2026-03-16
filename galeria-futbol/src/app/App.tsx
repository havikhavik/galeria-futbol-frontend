import { AppProviders } from "./providers/AppProviders";
import { ProtectedRoute } from "./router/ProtectedRoute";
import { getAppPathname, routes } from "./router/routes";
import { AlbumDetailPage } from "../pages/AlbumDetailPage";
import { AdminDashboardPage } from "../pages/AdminDashboardPage";
import { AdminAlbumsPage } from "../pages/AdminAlbumsPage";
import { AdminAlbumEditPage } from "../pages/AdminAlbumEditPage.tsx";
import { AdminCollectionsPage } from "../pages/AdminCollectionsPage";
import { AdminCollectionEditorPage } from "../pages/AdminCollectionEditorPage";
import { AdminLoginPage } from "../pages/AdminLoginPage";
import { CategoriesPage } from "../pages/CategoriesPage";
import { HomePage } from "../pages/HomePage";
import { ResultsPage } from "../pages/ResultsPage";
import { isAdminAuthenticated } from "../shared/auth/adminSession";
import { navigateTo } from "../shared/utils/navigation";

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

  const page =
    pathname === routes.categories ? (
      <CategoriesPage />
    ) : pathname === routes.search ? (
      <ResultsPage />
    ) : pathname.startsWith("/albums/") ? (
      <AlbumDetailPage />
    ) : (
      <HomePage />
    );

  return <AppProviders>{page}</AppProviders>;
}

export default App;
