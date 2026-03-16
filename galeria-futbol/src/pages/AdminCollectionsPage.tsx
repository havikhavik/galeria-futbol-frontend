import { useEffect, useState } from "react";
import { AdminLayout } from "../features/admin/components/AdminLayout";
import { routes } from "../app/router/routes";
import { httpClient } from "../shared/api/httpClient";
import { navigateTo } from "../shared/utils/navigation";
import styles from "./AdminCollectionsPage.module.css";

interface Collection {
  id: number;
  name: string;
  description?: string;
  itemCount: number;
}

export function AdminCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    httpClient
      .getJson<Collection[]>("admin/collections")
      .then((data) => {
        setCollections(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${httpClient.buildUrl(`admin/collections/${id}`)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken") ?? ""}`,
        },
        credentials: "omit",
      });
      setCollections((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // keep UI stable
    } finally {
      setDeletingId(null);
    }
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
            <div key={col.id} className={styles.card}>
              <p className={styles.cardName}>{col.name}</p>
              {col.description && (
                <p className={styles.cardMeta}>{col.description}</p>
              )}
              <p className={styles.cardMeta}>{col.itemCount} elementos</p>

              {deletingId === col.id ? (
                <div className={styles.deleteConfirm}>
                  <span>¿Eliminar?</span>
                  <button
                    type="button"
                    className={styles.btnDanger}
                    onClick={() => handleDelete(col.id)}
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    className={styles.btnCancel}
                    onClick={() => setDeletingId(null)}
                  >
                    No
                  </button>
                </div>
              ) : (
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.btnIcon}
                    title="Editar"
                    onClick={() =>
                      navigateTo(
                        routes.adminCollectionEdit.replace(
                          ":id",
                          String(col.id),
                        ),
                      )
                    }
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={`${styles.btnIcon} ${styles.btnIconDanger}`}
                    title="Eliminar"
                    onClick={() => setDeletingId(col.id)}
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
