import { useCallback, useState } from "react";
import { AdminLayout } from "../features/admin/components/AdminLayout";
import {
  deleteAdminCollection,
  fetchAdminCollections,
  type AdminCollectionCard,
} from "../features/admin/collections/api";
import { routes } from "../app/router/routes";
import { useApiData } from "../shared/hooks/useApiData";
import { navigateTo } from "../shared/utils/navigation";
import styles from "./AdminCollectionsPage.module.css";

function formatDateRange(startDate: string, endDate: string): string {
  const format = (value: string): string => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  return `${format(startDate)} → ${format(endDate)}`;
}

export function AdminCollectionsPage() {
  const loadCollections = useCallback(() => fetchAdminCollections(), []);
  const {
    data: collections,
    setData: setCollections,
    isLoading: loading,
    error,
  } = useApiData<AdminCollectionCard[]>(loadCollections, {
    initialData: [],
  });
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    try {
      await deleteAdminCollection(id);
      setCollections((prev) => prev.filter((c) => c.id !== id));
    } catch {
      return;
    } finally {
      setDeletingId(null);
    }
  };

  const openCollectionEditor = (id: number) => {
    if (deletingId === id) return;
    navigateTo(routes.adminCollectionEdit.replace(":id", String(id)));
  };

  return (
    <AdminLayout title="Colecciones">
      <div className={styles.toolbar}>
        <div className={styles.spacer} />
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => navigateTo(routes.adminCollectionNew)}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nueva colección
        </button>
      </div>

      {loading && <p className={styles.loading}>Cargando...</p>}
      {error && (
        <p className={styles.error}>No se pudieron cargar las colecciones.</p>
      )}
      {!loading && !error && collections.length === 0 && (
        <p className={styles.empty}>No hay colecciones todavía.</p>
      )}

      {!loading && !error && collections.length > 0 && (
        <div className={styles.grid}>
          {collections.map((col) => (
            <div
              key={col.id}
              className={styles.card}
              role="button"
              tabIndex={0}
              onClick={() => openCollectionEditor(col.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openCollectionEditor(col.id);
                }
              }}
              aria-label={`Editar colección ${col.name}`}
            >
              <div className={styles.cardBannerWrap}>
                {col.bannerImage ? (
                  <img
                    src={col.bannerImage}
                    alt={`Banner de ${col.name}`}
                    className={styles.cardBanner}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={styles.cardBannerPlaceholder}>Sin banner</div>
                )}
                <span
                  className={`${styles.statusBadge} ${col.active ? styles.statusActive : styles.statusInactive}`}
                >
                  {col.active ? "Activa" : "Inactiva"}
                </span>
              </div>

              <div className={styles.cardBody}>
                <p className={styles.cardName}>{col.name}</p>
                <p className={styles.cardMetaStrong}>
                  {col.itemCount} {col.itemCount === 1 ? "álbum" : "álbumes"}
                  <span className={styles.metaDot}>·</span>
                  Prioridad {col.priority}
                </p>
                <p className={styles.cardMeta}>
                  {formatDateRange(col.startDate, col.endDate)}
                </p>
                {col.description && (
                  <p className={styles.cardDescription}>{col.description}</p>
                )}
              </div>

              {deletingId === col.id ? (
                <div className={styles.deleteConfirm}>
                  <span>¿Eliminar?</span>
                  <button
                    type="button"
                    className={styles.btnDanger}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(col.id);
                    }}
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    className={styles.btnCancel}
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeletingId(null);
                    }}
                  >
                    No
                  </button>
                </div>
              ) : (
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={`${styles.btnIcon} ${styles.btnIconDanger}`}
                    title="Eliminar"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeletingId(col.id);
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
