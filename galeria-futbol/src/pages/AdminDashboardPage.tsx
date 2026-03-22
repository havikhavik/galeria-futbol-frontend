import { useEffect, useState } from "react";
import { AdminLayout } from "../features/admin/components/AdminLayout";
import { routes } from "../app/router/routes";
import { loadAdminDashboardMetrics } from "../features/admin/dashboard/api";
import type { AdminDashboardMetrics } from "../features/admin/dashboard/types";
import { navigateTo } from "../shared/utils/navigation";
import styles from "./AdminDashboardPage.module.css";

const CARD_DEFS = [
  ["Total Álbumes", "totalAlbums"],
  ["Colecciones", "totalCollections"],
  ["Selecciones", "totalSelections"],
  ["Clubes", "totalClubs"],
  ["Imágenes", "totalImages"],
] as const;

export function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics>({
    totalAlbums: 0,
    totalCollections: 0,
    totalSelections: 0,
    totalClubs: 0,
    totalImages: null,
  });
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const nextMetrics = await loadAdminDashboardMetrics();
        if (!cancelled) setMetrics(nextMetrics);
        if (!cancelled) setError(false);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminLayout title="Dashboard">
      {error && (
        <p className={styles.error}>No se pudieron cargar las métricas.</p>
      )}
      <div className={styles.grid}>
        {CARD_DEFS.map(([label, key]) => (
          <div key={label} className={styles.card}>
            <p className={styles.cardLabel}>{label}</p>
            <p
              className={`${styles.cardValue} ${
                typeof metrics[key] === "number"
                  ? ""
                  : styles.cardValueUnavailable
              }`}
            >
              {typeof metrics[key] === "number"
                ? metrics[key].toLocaleString()
                : "—"}
            </p>
          </div>
        ))}
      </div>

      <section className={styles.ctaSection} aria-label="Acciones principales">
        <button
          type="button"
          className={styles.ctaButton}
          onClick={() => navigateTo(routes.adminAlbums)}
        >
          Gestionar álbumes
        </button>
        <button
          type="button"
          className={styles.ctaButton}
          onClick={() => navigateTo(routes.adminCollections)}
        >
          Gestionar colecciones destacadas
        </button>
      </section>
    </AdminLayout>
  );
}
