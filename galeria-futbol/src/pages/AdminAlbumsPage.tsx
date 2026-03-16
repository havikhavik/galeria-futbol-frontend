import { useEffect, useMemo, useRef, useState } from "react";
import { AdminLayout } from "../features/admin/components/AdminLayout";
import { routes } from "../app/router/routes";
import { httpClient } from "../shared/api/httpClient";
import type { HttpClientError } from "../shared/api/httpClient";
import { getAdminToken } from "../shared/auth/adminSession";
import { navigateTo } from "../shared/utils/navigation";
import {
  fetchAdminAlbumsPageWithFallback,
  mapAdminAlbumToRow,
} from "../features/admin/albums/api";
import {
  ATTRIBUTE_LABELS,
  DEFAULT_ATTRIBUTE_FILTERS,
  TEAM_TYPE_LABELS,
} from "../features/admin/albums/constants";
import type {
  AlbumRow,
  AttributeFilterKey,
  AttributeFilters,
  TeamTypeFilter,
} from "../features/admin/albums/types";
import styles from "./AdminAlbumsPage.module.css";

const BADGE_CLASS: Record<string, string> = {
  CLUB: styles.badgeClub,
  NATIONAL: styles.badgeSelection,
  RETRO: styles.badgeRetro,
};

export function AdminAlbumsPage() {
  const [albums, setAlbums] = useState<AlbumRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TeamTypeFilter>("");
  const [attributeFilters, setAttributeFilters] = useState<AttributeFilters>(
    DEFAULT_ATTRIBUTE_FILTERS,
  );
  const [thumbnailErrors, setThumbnailErrors] = useState<Set<number>>(
    new Set(),
  );
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [createDraftError, setCreateDraftError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const queryKey = useMemo(() => {
    return JSON.stringify({
      search: search.trim(),
      typeFilter,
      attributeFilters,
    });
  }, [search, typeFilter, attributeFilters]);

  useEffect(() => {
    setAlbums([]);
    setCurrentPage(0);
    setTotalPages(1);
    setError(false);
    setLoading(true);
    setThumbnailErrors(new Set());
  }, [queryKey]);

  useEffect(() => {
    let cancelled = false;

    const loadPage = async () => {
      try {
        if (currentPage > 0) {
          setLoadingMore(true);
        }

        const pageData = await fetchAdminAlbumsPageWithFallback(
          currentPage,
          search,
          typeFilter,
          attributeFilters,
        );

        const normalized: AlbumRow[] = (pageData.content ?? []).map(
          mapAdminAlbumToRow,
        );

        if (!cancelled) {
          setTotalPages(pageData.totalPages ?? 1);
          setAlbums((prev) => {
            if (currentPage === 0) return normalized;
            const existingIds = new Set(prev.map((album) => album.id));
            const nextItems = normalized.filter(
              (album) => !existingIds.has(album.id),
            );
            return [...prev, ...nextItems];
          });
          setLoading(false);
          setLoadingMore(false);
          setError(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
          setLoadingMore(false);
        }
      }
    };

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [currentPage, queryKey, search, typeFilter, attributeFilters]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        const hasMore = currentPage + 1 < totalPages;
        if (
          entry.isIntersecting &&
          hasMore &&
          !loading &&
          !loadingMore &&
          !error
        ) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      { rootMargin: "320px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [currentPage, totalPages, loading, loadingMore, error]);

  const toggleAttributeFilter = (key: AttributeFilterKey) => {
    setAttributeFilters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const clearAttributeFilters = () => {
    setAttributeFilters(DEFAULT_ATTRIBUTE_FILTERS);
  };

  const getAlbumThumbnail = (album: AlbumRow): string | null => {
    if (thumbnailErrors.has(album.id)) {
      return album.fallbackThumbnail ?? null;
    }
    return album.thumbnail ?? album.fallbackThumbnail ?? null;
  };

  const handleDelete = async (id: number) => {
    setDeleteError(null);
    try {
      const token = getAdminToken();
      const response = await fetch(
        `${httpClient.buildUrl(`admin/albums/${id}`)}`,
        {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: "omit",
        },
      );

      if (!response.ok) {
        const failed = new Error(
          `DELETE admin/albums/${id} failed: ${response.status}`,
        ) as HttpClientError;
        failed.status = response.status;
        throw failed;
      }

      setAlbums((prev) => prev.filter((a) => a.id !== id));
    } catch (error) {
      const httpError = error as HttpClientError;
      const status = httpError?.status;
      if (status === 401 || status === 403) {
        setDeleteError(
          "No tienes permisos para eliminar este álbum. Vuelve a iniciar sesión.",
        );
      } else {
        setDeleteError(
          `No se pudo eliminar el álbum${status ? ` (HTTP ${status})` : ""}.`,
        );
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateDraft = async () => {
    if (isCreatingDraft) return;

    setIsCreatingDraft(true);
    setCreateDraftError(null);

    try {
      const draft = await httpClient.postJson<
        { id?: number },
        Record<string, never>
      >("admin/albums/draft", {});
      if (!draft.id) {
        throw new Error("Draft sin ID");
      }

      navigateTo(routes.adminAlbumEdit.replace(":id", String(draft.id)));
    } catch (error) {
      const httpError = error as HttpClientError;
      const status = httpError?.status;
      const detail = httpError?.detail?.trim();

      if (status || detail) {
        console.error("Draft creation failed", {
          status,
          detail,
          message: httpError?.message,
        });
      }

      if (status === 401 || status === 403) {
        setCreateDraftError(
          "Tu sesión no tiene permisos para crear borradores. Vuelve a iniciar sesión.",
        );
      } else if (status === 404) {
        setCreateDraftError(
          "El endpoint de borrador no está disponible en el backend actual.",
        );
      } else if (status === 409) {
        setCreateDraftError(
          "No se pudo crear el borrador por conflicto de datos. Intenta nuevamente.",
        );
      } else {
        setCreateDraftError(
          `No se pudo crear el borrador${status ? ` (HTTP ${status})` : ""}. Intenta nuevamente.`,
        );
      }
    } finally {
      setIsCreatingDraft(false);
    }
  };

  return (
    <AdminLayout title="Álbumes">
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <svg
            className={styles.searchIcon}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Buscar álbum..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TeamTypeFilter)}
        >
          <option value="">Club + Selección</option>
          <option value="CLUB">Club</option>
          <option value="NATIONAL">Selección</option>
        </select>

        <div className={styles.spacer} />

        <button
          type="button"
          className={`${styles.btnPrimary} ${styles.newAlbumBtn}`}
          onClick={handleCreateDraft}
          disabled={isCreatingDraft}
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
          {isCreatingDraft ? "Creando..." : "Nuevo álbum"}
        </button>
      </div>

      {createDraftError ? (
        <p className={styles.error}>{createDraftError}</p>
      ) : null}
      {deleteError ? <p className={styles.error}>{deleteError}</p> : null}

      <div className={styles.attributeFilters}>
        {(Object.keys(ATTRIBUTE_LABELS) as AttributeFilterKey[]).map((key) => (
          <button
            key={key}
            type="button"
            className={`${styles.attributeChip} ${attributeFilters[key] ? styles.attributeChipActive : ""}`}
            onClick={() => toggleAttributeFilter(key)}
          >
            {ATTRIBUTE_LABELS[key]}
          </button>
        ))}
        <button
          type="button"
          className={styles.clearFiltersBtn}
          onClick={clearAttributeFilters}
        >
          Limpiar filtros
        </button>
      </div>

      <div className={styles.tableWrapper}>
        {loading && <p className={styles.loading}>Cargando...</p>}
        {error && (
          <p className={styles.error}>No se pudieron cargar los álbumes.</p>
        )}
        {!loading && !error && albums.length === 0 && (
          <p className={styles.empty}>No se encontraron álbumes.</p>
        )}
        {!loading && !error && albums.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Portada</th>
                <th>Nombre</th>
                <th className={styles.colLeague}>Liga</th>
                <th className={styles.colSeason}>Temporada</th>
                <th>Tipo</th>
                <th className={styles.colImages}>Imágenes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {albums.map((album) => (
                <tr key={album.id}>
                  <td>
                    {getAlbumThumbnail(album) ? (
                      <img
                        src={getAlbumThumbnail(album) ?? ""}
                        alt={album.name}
                        className={styles.thumbnail}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setThumbnailErrors((prev) => {
                            const next = new Set(prev);
                            next.add(album.id);
                            return next;
                          })
                        }
                      />
                    ) : (
                      <div className={styles.thumbnailPlaceholder}>
                        Sin imagen
                      </div>
                    )}
                  </td>
                  <td>{album.name}</td>
                  <td className={styles.colLeague}>{album.league}</td>
                  <td className={styles.colSeason}>{album.season}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${BADGE_CLASS[album.retro ? "RETRO" : album.teamType] ?? ""}`}
                    >
                      {TEAM_TYPE_LABELS[
                        album.retro ? "RETRO" : album.teamType
                      ] ?? album.teamType}
                    </span>
                  </td>
                  <td className={styles.colImages}>
                    {album.imageCount ?? "…"}
                  </td>
                  <td>
                    {deletingId === album.id ? (
                      <div className={styles.deleteConfirm}>
                        <span>¿Eliminar?</span>
                        <button
                          type="button"
                          className={styles.btnDanger}
                          onClick={() => handleDelete(album.id)}
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
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.btnIcon}
                          title="Editar"
                          onClick={() =>
                            navigateTo(
                              routes.adminAlbumEdit.replace(
                                ":id",
                                String(album.id),
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
                          onClick={() => setDeletingId(album.id)}
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && !error && loadingMore && (
          <p className={styles.loadingMore}>Cargando más álbumes...</p>
        )}

        {!loading && !error && currentPage + 1 < totalPages && (
          <div
            ref={sentinelRef}
            className={styles.scrollSentinel}
            aria-hidden="true"
          />
        )}
      </div>
    </AdminLayout>
  );
}
