import { useState, type ReactNode } from "react";
import { getAppPathname, routes } from "../../../app/router/routes";
import {
  clearAdminSession,
  getAdminToken,
} from "../../../shared/auth/adminSession";
import { navigateTo } from "../../../shared/utils/navigation";
import styles from "./AdminLayout.module.css";

interface Props {
  children: ReactNode;
  title: string;
}

function currentPath() {
  return getAppPathname(window.location.pathname);
}

export function AdminLayout({ children, title }: Props) {
  const pathname = currentPath();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    clearAdminSession();
    navigateTo(routes.adminLogin);
  };

  const token = getAdminToken();
  // Decode email from JWT payload (no crypto validation needed here — display only)
  let email = "";
  try {
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      email = payload.sub ?? payload.email ?? "";
    }
  } catch {
    // ignore
  }

  const navItems = [
    {
      label: "Dashboard",
      path: routes.admin,
      exact: true,
      icon: (
        <svg
          className={styles.navIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      label: "Álbumes",
      path: routes.adminAlbums,
      exact: false,
      icon: (
        <svg
          className={styles.navIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      ),
    },
    {
      label: "Colecciones",
      path: routes.adminCollections,
      exact: false,
      icon: (
        <svg
          className={styles.navIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ),
    },
  ];

  function isActive(item: { path: string; exact: boolean }) {
    if (item.exact) return pathname === item.path;
    return pathname.startsWith(item.path);
  }

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className={styles.shell}>
      {mobileMenuOpen && (
        <button
          type="button"
          className={styles.mobileBackdrop}
          onClick={closeMobileMenu}
          aria-label="Cerrar menú"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.brand}>
          <p className={styles.brandName}>GALERIA FUTBOL</p>
          <p className={styles.brandSub}>Panel de administración</p>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              className={`${styles.navItem} ${isActive(item) ? styles.active : ""}`}
              onClick={() => {
                closeMobileMenu();
                navigateTo(item.path);
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <p className={styles.mobileBrand}>GALERIA FUTBOL</p>
            <h1 className={styles.topbarTitle}>{title}</h1>
          </div>

          <div className={styles.topbarUser}>
            {email && <span className={styles.userEmail}>{email}</span>}
            <button
              type="button"
              className={styles.topbarLogoutBtn}
              onClick={handleLogout}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className={styles.topbarLogoutText}>Salir</span>
            </button>
            <button
              type="button"
              className={styles.mobileMenuBtn}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Abrir menú"
              aria-expanded={mobileMenuOpen}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
