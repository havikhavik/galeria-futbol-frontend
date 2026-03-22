import { useRef } from "react";

import { routes } from "../app/router/routes";
import { useAlbumEditor } from "../features/admin/albums/hooks/useAlbumEditor";
import { AdminLayout } from "../features/admin/components/AdminLayout";
import { ATTRIBUTE_LABELS } from "../features/admin/albums/constants";
import type { AttributeKey } from "../features/admin/albums/types";
import type { TeamType } from "../shared/types/common";
import { navigateTo } from "../shared/utils/navigation";

import styles from "./AdminAlbumEditPage.module.css";

const TEAM_TYPE_OPTIONS: Array<{ value: TeamType; label: string }> = [
  { value: "CLUB", label: "Club" },
  { value: "NATIONAL", label: "Selección" },
];

const ATTRIBUTES: Array<{ key: AttributeKey; label: string }> = [
  { key: "kids", label: ATTRIBUTE_LABELS.kids },
  { key: "women", label: ATTRIBUTE_LABELS.women },
  { key: "goalkeeper", label: ATTRIBUTE_LABELS.goalkeeper },
  { key: "training", label: ATTRIBUTE_LABELS.training },
  { key: "classic", label: ATTRIBUTE_LABELS.classic },
  { key: "retro", label: ATTRIBUTE_LABELS.retro },
];

export function AdminAlbumEditPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    pageTitle,
    invalidRoute,
    reload,
    isLoading,
    isNotFound,
    loadError,
    saveError,
    saveSuccess,
    isSaving,
    isPublishing,
    albumName,
    createdAt,
    updatedAt,
    form,
    setForm,
    touched,
    errors,
    canSave,
    canPublish,
    images,
    imagesLoading,
    imagesError,
    pendingDeleteImageId,
    setPendingDeleteImageId,
    isUploadingImages,
    categoriesLoading,
    categoriesError,
    categories,
    handleCancel,
    handleBlur,
    handleAttributeToggle,
    handleTeamTypeChange,
    handleUploadImages,
    handleDeleteImage,
    setCoverImage,
    handleSave,
    handlePublish,
    formatDate,
  } = useAlbumEditor();

  if (isLoading) {
    return (
      <AdminLayout title={pageTitle}>
        <div className={styles.skeletonBlock} />
        <div className={styles.skeletonGrid}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      </AdminLayout>
    );
  }

  if (isNotFound || invalidRoute) {
    return (
      <AdminLayout title={pageTitle}>
        <div className={styles.notFound}>
          <h2>Álbum no encontrado</h2>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => navigateTo(routes.adminAlbums)}
          >
            Volver a álbumes
          </button>
        </div>
      </AdminLayout>
    );
  }

  if (!form) {
    return (
      <AdminLayout title={pageTitle}>
        <div className={styles.notFound}>
          <h2>No se pudo abrir el editor</h2>
          {loadError ? <p className={styles.helperText}>{loadError}</p> : null}
          <div className={styles.topActions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => navigateTo(routes.adminAlbums)}
            >
              Volver a álbumes
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={reload}
            >
              Reintentar
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={pageTitle}>
      <header className={styles.topbarArea}>
        <div>
          <p className={styles.breadcrumb}>Álbumes › {albumName} › Editar</p>
          <h2 className={styles.pageTitle}>Editar álbum</h2>
        </div>
        <div className={styles.topActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={handleCancel}
            disabled={isSaving || isPublishing}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleSave}
            disabled={!canSave || isSaving || isPublishing}
          >
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handlePublish}
            disabled={!canPublish || isSaving || isPublishing}
          >
            {isPublishing ? "Publicando..." : "Publicar álbum"}
          </button>
        </div>
      </header>

      {loadError && <p className={styles.globalError}>{loadError}</p>}
      {saveError && <p className={styles.globalError}>{saveError}</p>}
      {saveSuccess && <p className={styles.success}>{saveSuccess}</p>}

      <div className={styles.layout}>
        <section className={styles.leftColumn}>
          <article className={styles.card}>
            <h3 className={styles.sectionTitle}>Información general</h3>

            <label className={styles.fieldLabel} htmlFor="album-title">
              Nombre del álbum
            </label>
            <input
              id="album-title"
              className={styles.input}
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              onBlur={() => handleBlur("title")}
              required
            />
            {touched.title && errors.title && (
              <p className={styles.fieldError}>{errors.title}</p>
            )}

            <label className={styles.fieldLabel} htmlFor="album-description">
              Descripción
            </label>
            <textarea
              id="album-description"
              className={styles.textarea}
              rows={4}
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />

            <label className={styles.fieldLabel} htmlFor="album-season">
              Temporada
            </label>
            <input
              id="album-season"
              className={styles.input}
              value={form.seasonLabel}
              onChange={(event) =>
                setForm({ ...form, seasonLabel: event.target.value })
              }
              onBlur={() => handleBlur("seasonLabel")}
              placeholder="2025-2026"
            />
            <p className={styles.helperText}>
              Formato esperado: YYYY-YYYY (ejemplo: 2025-2026).
            </p>
            {touched.seasonLabel && errors.seasonLabel && (
              <p className={styles.fieldError}>{errors.seasonLabel}</p>
            )}
          </article>

          <article className={styles.card}>
            <div className={styles.imagesHeader}>
              <h3 className={styles.sectionTitle}>Imágenes</h3>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImages}
              >
                {isUploadingImages ? "Subiendo..." : "Agregar imágenes"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className={styles.hiddenInput}
                onChange={handleUploadImages}
              />
            </div>

            <p className={styles.helperText}>
              Total de imágenes: {images.length}
            </p>
            {images.length === 0 && (
              <p className={styles.warning}>
                Este álbum no tiene imágenes. Se recomienda al menos una.
              </p>
            )}
            {imagesError && <p className={styles.fieldError}>{imagesError}</p>}
            {imagesLoading ? (
              <p className={styles.helperText}>Cargando imágenes...</p>
            ) : null}

            <div className={styles.imageGrid}>
              {images.map((image) => (
                <div key={image.id} className={styles.imageCard}>
                  <button
                    type="button"
                    className={styles.imageButton}
                    onClick={() => setCoverImage(image.id)}
                    disabled={image.primary}
                    title={
                      image.primary ? "Portada actual" : "Usar como portada"
                    }
                  >
                    <img
                      src={image.url}
                      alt={`Imagen ${image.id}`}
                      className={styles.image}
                      referrerPolicy="no-referrer"
                    />
                  </button>
                  <div className={styles.imageActions}>
                    {image.primary ? (
                      <span className={styles.coverBadge}>Portada</span>
                    ) : (
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => setCoverImage(image.id)}
                      >
                        Marcar portada
                      </button>
                    )}

                    {pendingDeleteImageId === image.id ? (
                      <div className={styles.inlineConfirm}>
                        <span>¿Eliminar esta imagen?</span>
                        <button
                          type="button"
                          className={styles.linkDanger}
                          onClick={() => handleDeleteImage(image.id)}
                        >
                          Sí
                        </button>
                        <button
                          type="button"
                          className={styles.linkBtn}
                          onClick={() => setPendingDeleteImageId(null)}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={styles.linkDanger}
                        onClick={() => setPendingDeleteImageId(image.id)}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <aside className={styles.rightColumn}>
          <article className={styles.card}>
            <h3 className={styles.sectionTitle}>Tipo de equipo</h3>
            <div className={styles.radioGroup}>
              {TEAM_TYPE_OPTIONS.map((option) => (
                <label key={option.value} className={styles.radioItem}>
                  <input
                    type="radio"
                    name="teamType"
                    value={option.value}
                    checked={form.teamType === option.value}
                    onChange={() => handleTeamTypeChange(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </article>

          <article className={styles.card}>
            <h3 className={styles.sectionTitle}>Liga / Confederación</h3>
            <select
              className={styles.input}
              value={form.categoryCode}
              onChange={(event) =>
                setForm({ ...form, categoryCode: event.target.value })
              }
              onBlur={() => handleBlur("categoryCode")}
              disabled={categoriesLoading}
            >
              <option value="">Seleccionar opción</option>
              {categories.map((category) => (
                <option key={category.code} value={category.code}>
                  {category.name}
                </option>
              ))}
            </select>
            {categoriesLoading && (
              <p className={styles.helperText}>Cargando opciones...</p>
            )}
            {categoriesError && (
              <p className={styles.fieldError}>{categoriesError}</p>
            )}
            {touched.categoryCode && errors.categoryCode && (
              <p className={styles.fieldError}>{errors.categoryCode}</p>
            )}
          </article>

          <article className={styles.card}>
            <h3 className={styles.sectionTitle}>Categorías</h3>
            <p className={styles.helperText}>
              Puedes combinar múltiples etiquetas de clasificación.
            </p>
            <div className={styles.checkboxGroup}>
              {ATTRIBUTES.map((item) => (
                <label key={item.key} className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    checked={form[item.key]}
                    onChange={() => handleAttributeToggle(item.key)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </article>

          <article className={styles.card}>
            <h3 className={styles.sectionTitle}>Estado</h3>
            <div
              className={`${styles.statusBadge} ${
                form.status === "PUBLISHED"
                  ? styles.statusBadgePublished
                  : styles.statusBadgeDraft
              }`}
              role="status"
              aria-live="polite"
            >
              <span
                className={`${styles.statusDot} ${
                  form.status === "PUBLISHED" ? styles.statusDotLive : ""
                }`}
                aria-hidden="true"
              />
              <span className={styles.statusText}>
                {form.status === "PUBLISHED" ? "Publicado" : "Borrador"}
              </span>
            </div>
            <p className={styles.statusHint}>
              Para pasar de borrador a publicado usa el botón “Publicar álbum”.
            </p>

            <div className={styles.metaGrid}>
              <div>
                <p className={styles.metaLabel}>Creado</p>
                <p className={styles.metaValue}>{formatDate(createdAt)}</p>
              </div>
              <div>
                <p className={styles.metaLabel}>Última modificación</p>
                <p className={styles.metaValue}>{formatDate(updatedAt)}</p>
              </div>
            </div>
          </article>
        </aside>
      </div>
    </AdminLayout>
  );
}
