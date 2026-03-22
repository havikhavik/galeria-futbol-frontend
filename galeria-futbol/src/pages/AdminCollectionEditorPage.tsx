import { useRef } from "react";

import { routes } from "../app/router/routes";
import { useCollectionEditor } from "../features/admin/collections/hooks/useCollectionEditor";
import { AdminLayout } from "../features/admin/components/AdminLayout";
import { navigateTo } from "../shared/utils/navigation";

import styles from "./AdminCollectionEditorPage.module.css";

export function AdminCollectionEditorPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    isNewMode,
    collectionId,
    isLoading,
    isNotFound,
    loadError,
    saveError,
    saveSuccess,
    isSaving,
    form,
    setForm,
    touched,
    validationErrors,
    hasRequiredBanner,
    isAssociationDisabledInCreate,
    isUploadingBanner,
    bannerPreviewUrl,
    associatedAlbums,
    albumsSearchQuery,
    setAlbumsSearchQuery,
    albumsResults,
    isSearchingAlbums,
    albumsSearchError,
    pendingRemoveAlbumId,
    setPendingRemoveAlbumId,
    handleCancel,
    handleBlur,
    handlePickBanner,
    handleRemoveBanner,
    addAlbumToCollection,
    confirmRemoveAssociatedAlbum,
    handleSave,
    pageTitle,
    breadcrumbTitle,
    durationLabel,
  } = useCollectionEditor();

  if (isLoading) {
    return (
      <AdminLayout title={isNewMode ? "Nueva colección" : "Editar colección"}>
        <div className={styles.skeletonBlock} />
        <div className={styles.skeletonGrid}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      </AdminLayout>
    );
  }

  if (isNotFound || (!isNewMode && !collectionId)) {
    return (
      <AdminLayout title="Editar colección">
        <div className={styles.notFound}>
          <h2>Colección no encontrada</h2>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => navigateTo(routes.adminCollections)}
          >
            Volver a colecciones
          </button>
        </div>
      </AdminLayout>
    );
  }

  if (!form) {
    return (
      <AdminLayout title="Editar colección">
        <div className={styles.notFound}>
          <h2>No se pudo abrir el editor</h2>
          {loadError ? <p className={styles.helperText}>{loadError}</p> : null}
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => navigateTo(routes.adminCollections)}
          >
            Volver a colecciones
          </button>
        </div>
      </AdminLayout>
    );
  }

  const errors = validationErrors;

  return (
    <AdminLayout title={pageTitle}>
      <header className={styles.topbarArea}>
        <div>
          <p className={styles.breadcrumb}>Colecciones › {breadcrumbTitle}</p>
          <h2 className={styles.pageTitle}>{pageTitle}</h2>
        </div>
      </header>

      <div className={styles.actionsRow}>
        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={handleCancel}
          disabled={isSaving}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={handleSave}
          disabled={isSaving || isUploadingBanner}
        >
          {isSaving ? "Guardando..." : "Guardar"}
        </button>
      </div>

      {loadError && <p className={styles.globalError}>{loadError}</p>}
      {saveError && <p className={styles.globalError}>{saveError}</p>}
      {saveSuccess && <p className={styles.success}>{saveSuccess}</p>}

      <div className={styles.layout}>
        <section className={styles.leftColumn}>
          <article className={styles.card}>
            <h3 className={styles.sectionTitle}>Información general</h3>

            <label className={styles.fieldLabel} htmlFor="collection-title">
              Título (Obligatorio)
            </label>
            <input
              id="collection-title"
              className={styles.input}
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              onBlur={() => handleBlur("title")}
              placeholder="Mundial 2026 - Historia de Camisetas"
            />
            <p className={styles.helperText}>
              El slug se construye automáticamente a partir del título al
              guardar.
            </p>
            {touched.title && errors.title && (
              <p className={styles.fieldError}>{errors.title}</p>
            )}

            <label
              className={styles.fieldLabel}
              htmlFor="collection-description"
            >
              Descripción (Opcional)
            </label>
            <textarea
              id="collection-description"
              className={styles.textarea}
              rows={4}
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </article>

          <article className={styles.card}>
            <div className={styles.imagesHeader}>
              <h3 className={styles.sectionTitle}>Imagen de banner</h3>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingBanner}
              >
                {isUploadingBanner
                  ? "Subiendo..."
                  : bannerPreviewUrl
                    ? "Cambiar"
                    : "Seleccionar"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className={styles.hiddenInput}
                onChange={handlePickBanner}
              />
            </div>

            <div className={styles.cardPreviewShell}>
              <article className={styles.previewCard}>
                <div className={styles.previewCardBanner}>
                  {bannerPreviewUrl ? (
                    <img
                      src={bannerPreviewUrl}
                      alt="Banner de colección"
                      className={styles.previewCardImage}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <p className={styles.previewCardPlaceholder}>
                      Subí una imagen de banner para la colección.
                    </p>
                  )}

                  {bannerPreviewUrl ? (
                    <div className={styles.bannerActionsOverlay}>
                      <button
                        type="button"
                        className={styles.bannerOverlayBtn}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingBanner}
                      >
                        Cambiar
                      </button>
                      <button
                        type="button"
                        className={styles.bannerRemoveBtn}
                        onClick={handleRemoveBanner}
                        aria-label="Quitar banner"
                      >
                        ×
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className={styles.previewCardBody}>
                  <p className={styles.previewCardTitle}>
                    {form.title.trim() || "Título de colección"}
                  </p>
                  <button
                    type="button"
                    className={styles.previewCardCta}
                    disabled
                  >
                    Ver colección
                  </button>
                </div>
              </article>
            </div>
            {bannerPreviewUrl ? (
              <p className={styles.previewLabelSingle}>
                Esta vista representa la tarjeta que se muestra en colecciones
                destacadas.
              </p>
            ) : null}
            {!hasRequiredBanner && (
              <p className={styles.fieldError}>El banner es obligatorio.</p>
            )}
          </article>

          <article className={styles.card}>
            <h3 className={styles.sectionTitle}>Álbumes asociados</h3>
            {isAssociationDisabledInCreate ? (
              <p className={styles.helperText}>
                Guardá la colección primero para poder agregar álbumes.
              </p>
            ) : (
              <>
                <p className={styles.helperText}>
                  {associatedAlbums.length} Álbumes Asociados
                </p>

                <div className={styles.albumSearchWrapper}>
                  <input
                    type="text"
                    className={styles.input}
                    value={albumsSearchQuery}
                    onChange={(event) =>
                      setAlbumsSearchQuery(event.target.value)
                    }
                    placeholder="Buscar Álbumes..."
                  />
                  {(isSearchingAlbums || albumsResults.length > 0) && (
                    <div className={styles.searchDropdown}>
                      {isSearchingAlbums ? (
                        <p className={styles.dropdownHint}>Buscando...</p>
                      ) : (
                        albumsResults.map((album) => {
                          const already = associatedAlbums.some(
                            (item) => item.id === album.id,
                          );
                          return (
                            <button
                              key={album.id}
                              type="button"
                              className={`${styles.searchResultItem} ${already ? styles.searchResultDisabled : ""}`}
                              onClick={() => addAlbumToCollection(album)}
                              disabled={already}
                            >
                              <img
                                src={album.thumbnail || ""}
                                alt={album.title}
                                className={styles.searchResultThumb}
                                referrerPolicy="no-referrer"
                              />
                              <span className={styles.searchResultTitle}>
                                {album.title}
                              </span>
                              {already && (
                                <span className={styles.searchResultTag}>
                                  Ya agregado
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {albumsSearchError && (
                  <p className={styles.fieldError}>{albumsSearchError}</p>
                )}

                <div className={styles.associatedList}>
                  {associatedAlbums.map((album) => (
                    <div key={album.id} className={styles.associatedRow}>
                      <img
                        src={album.thumbnail || ""}
                        alt={album.title}
                        className={styles.associatedThumb}
                        referrerPolicy="no-referrer"
                      />
                      <span className={styles.associatedTitle}>
                        {album.title}
                      </span>

                      {pendingRemoveAlbumId === album.id ? (
                        <div className={styles.inlineConfirm}>
                          <span>¿Quitar?</span>
                          <button
                            type="button"
                            className={styles.linkDanger}
                            onClick={() =>
                              confirmRemoveAssociatedAlbum(album.id)
                            }
                          >
                            Sí
                          </button>
                          <button
                            type="button"
                            className={styles.linkBtn}
                            onClick={() => setPendingRemoveAlbumId(null)}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={styles.linkDanger}
                          onClick={() => setPendingRemoveAlbumId(album.id)}
                          aria-label="Quitar álbum"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}

                  {associatedAlbums.length === 0 && (
                    <p className={styles.helperText}>
                      No hay álbumes asociados todavía.
                    </p>
                  )}
                </div>
              </>
            )}
          </article>
        </section>

        <aside className={styles.rightColumn}>
          <article className={styles.card}>
            <h3 className={styles.sectionTitle}>Fechas de colección</h3>
            <div className={styles.datesGrid}>
              <div>
                <label
                  className={styles.fieldLabel}
                  htmlFor="collection-start-date"
                >
                  Inicio (Obligatorio)
                </label>
                <input
                  id="collection-start-date"
                  type="date"
                  className={styles.input}
                  value={form.startDate}
                  onChange={(event) =>
                    setForm({ ...form, startDate: event.target.value })
                  }
                  onBlur={() => handleBlur("startDate")}
                />
                {touched.startDate && errors.startDate && (
                  <p className={styles.fieldError}>{errors.startDate}</p>
                )}
              </div>

              <div>
                <label
                  className={styles.fieldLabel}
                  htmlFor="collection-end-date"
                >
                  Fin (Obligatorio)
                </label>
                <input
                  id="collection-end-date"
                  type="date"
                  className={styles.input}
                  value={form.endDate}
                  onChange={(event) =>
                    setForm({ ...form, endDate: event.target.value })
                  }
                  onBlur={() => handleBlur("endDate")}
                />
                {touched.endDate && errors.endDate && (
                  <p className={styles.fieldError}>{errors.endDate}</p>
                )}
              </div>
            </div>
            <p className={styles.helperText}>{durationLabel}</p>
          </article>

          <article className={styles.card}>
            <div className={styles.statusHeader}>
              <h3 className={styles.sectionTitle}>Estado</h3>
              <div
                className={`${styles.statusBadge} ${
                  form.active
                    ? styles.statusBadgeActive
                    : styles.statusBadgeInactive
                }`}
                role="status"
                aria-live="polite"
              >
                <span
                  className={`${styles.statusDot} ${form.active ? styles.statusDotLive : ""}`}
                  aria-hidden="true"
                />
                <span className={styles.statusText}>
                  {form.active ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>

            <label className={styles.toggleRow} htmlFor="collection-active">
              <span>Visible para usuarios</span>
              <span className={styles.toggleControlWrap}>
                <input
                  id="collection-active"
                  type="checkbox"
                  className={styles.toggleInput}
                  checked={form.active}
                  onChange={(event) =>
                    setForm({ ...form, active: event.target.checked })
                  }
                />
                <span className={styles.toggleSlider} aria-hidden="true" />
              </span>
            </label>

            <label className={styles.fieldLabel} htmlFor="collection-priority">
              Prioridad de Visualización (Opcional)
            </label>
            <input
              id="collection-priority"
              type="number"
              min={1}
              className={styles.input}
              value={form.priority}
              onChange={(event) =>
                setForm({ ...form, priority: event.target.value })
              }
            />
            <p className={styles.helperText}>
              Controla el orden en la galería. Números menores se muestran
              primero.
            </p>
          </article>
        </aside>
      </div>
    </AdminLayout>
  );
}
