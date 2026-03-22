import { navigateTo } from "../shared/utils/navigation";
import { AdminLayout } from "../features/admin/components/AdminLayout";
import { routes } from "../app/router/routes";
import { useAlbumsList } from "../features/admin/albums/hooks/useAlbumsList";
import {
  ATTRIBUTE_LABELS,
  TEAM_TYPE_LABELS,
} from "../features/admin/albums/constants";
import type {
  AttributeFilterKey,
  TeamTypeFilter,
} from "../features/admin/albums/types";
import styles from "./AdminAlbumsPage.module.css";

const BADGE_CLASS: Record<string, string> = {
  CLUB: styles.badgeClub,
  NATIONAL: styles.badgeSelection,
};

export function AdminAlbumsPage() {
  const {
    albums,
    loading,
    loadingMore,
    error,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    attributeFilters,
    toggleAttributeFilter,
    clearAttributeFilters,
    getAlbumThumbnail,
    markThumbnailError,
    deletingId,
    setDeletingId,
    deleteError,
    isCreatingDraft,
    createDraftError,
    handleDelete,
    handleCreateDraft,
    currentPage,
    totalPages,
    sentinelRef,
  } = useAlbumsList({
    onDraftCreated: (id) =>
      navigateTo(routes.adminAlbumEdit.replace(":id", String(id))),
  });

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
                        onError={() => markThumbnailError(album.id)}
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
                      className={`${styles.badge} ${BADGE_CLASS[album.teamType] ?? ""}`}
                    >
                      {TEAM_TYPE_LABELS[album.teamType] ?? album.teamType}
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
