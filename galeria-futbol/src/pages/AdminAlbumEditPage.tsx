import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { getAppPathname, routes } from "../app/router/routes";
import { AdminLayout } from "../features/admin/components/AdminLayout";
import { httpClient } from "../shared/api/httpClient";
import { getAdminToken } from "../shared/auth/adminSession";
import { navigateTo } from "../shared/utils/navigation";

import styles from "./AdminAlbumEditPage.module.css";

type TeamType = "CLUB" | "NATIONAL";
type AlbumStatus = "DRAFT" | "PUBLISHED";
type AttributeKey =
  | "kids"
  | "women"
  | "goalkeeper"
  | "training"
  | "classic"
  | "retro";

type CategoryApi = {
  id: number;
  code: string;
  name: string;
  teamType: TeamType;
};

type AdminAlbumApi = {
  id: number;
  title: string;
  seasonLabel?: string | null;
  seasonStart?: number | null;
  teamType?: TeamType | null;
  status?: AlbumStatus | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  thumbnail?: string | null;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  kids: boolean;
  women: boolean;
  goalkeeper: boolean;
  training: boolean;
  classic: boolean;
  retro: boolean;
};

type ImageApi = {
  id: number;
  url: string;
  position?: number | null;
  primary: boolean;
};

type UploadImageApi = {
  url?: string;
};

type AlbumForm = {
  title: string;
  description: string;
  seasonLabel: string;
  teamType: TeamType;
  categoryCode: string;
  status: AlbumStatus;
  thumbnail: string;
  kids: boolean;
  women: boolean;
  goalkeeper: boolean;
  training: boolean;
  classic: boolean;
  retro: boolean;
};

type FieldErrors = Partial<
  Record<"title" | "seasonLabel" | "categoryCode", string>
>;

const TEAM_TYPE_OPTIONS: Array<{ value: TeamType; label: string }> = [
  { value: "CLUB", label: "Club" },
  { value: "NATIONAL", label: "Selección" },
];

const ATTRIBUTES: Array<{ key: AttributeKey; label: string }> = [
  { key: "kids", label: "Niños" },
  { key: "women", label: "Mujer" },
  { key: "goalkeeper", label: "Arquero" },
  { key: "training", label: "Entrenamiento" },
  { key: "classic", label: "Clásico" },
  { key: "retro", label: "Retro" },
];

function parseAlbumIdFromPath(): number | null {
  const pathname = getAppPathname(window.location.pathname);
  const parts = pathname.split("/").filter(Boolean);
  const id = parts[parts.length - 1];
  if (!id || id === "new") return null;
  const parsed = Number(id);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSeasonLabel(
  seasonLabel?: string | null,
  seasonStart?: number | null,
): string {
  if (seasonLabel && seasonLabel.trim()) return seasonLabel.trim();
  if (typeof seasonStart === "number")
    return `${seasonStart}-${seasonStart + 1}`;
  return "";
}

function parseSeasonStart(value: string): number | null {
  const match = /^(\d{4})-(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  return endYear === startYear + 1 ? startYear : null;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function serializeForm(form: AlbumForm): string {
  return JSON.stringify({
    ...form,
    title: form.title.trim(),
    description: form.description.trim(),
    seasonLabel: form.seasonLabel.trim(),
    categoryCode: form.categoryCode.trim(),
  });
}

function getValidationErrors(form: AlbumForm): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.title.trim()) {
    errors.title = "El nombre del álbum es obligatorio.";
  }
  if (!parseSeasonStart(form.seasonLabel)) {
    errors.seasonLabel =
      "La temporada debe tener formato YYYY-YYYY (ej: 2025-2026).";
  }
  if (!form.categoryCode.trim()) {
    errors.categoryCode = "Selecciona una liga o confederación.";
  }
  return errors;
}

async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const token = getAdminToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, {
    ...init,
    credentials: "omit",
    headers,
  });
}

export function AdminAlbumEditPage() {
  const pathname = useMemo(() => getAppPathname(window.location.pathname), []);
  const isNewMode = pathname === routes.adminAlbumNew;
  const albumId = useMemo(parseAlbumIdFromPath, []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const [albumName, setAlbumName] = useState("Álbum");
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [form, setForm] = useState<AlbumForm | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [images, setImages] = useState<ImageApi[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [pendingDeleteImageId, setPendingDeleteImageId] = useState<
    number | null
  >(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isUpdatingCover, setIsUpdatingCover] = useState<number | null>(null);
  const [nextTempImageId, setNextTempImageId] = useState(-1);
  const [hasPendingImageChanges, setHasPendingImageChanges] = useState(false);

  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryApi[]>([]);

  const formDirty = Boolean(
    form && initialSnapshot && serializeForm(form) !== initialSnapshot,
  );
  const dirty = formDirty || hasPendingImageChanges;
  const errors = form ? getValidationErrors(form) : {};
  const canSave = Boolean(
    form &&
    dirty &&
    !isSaving &&
    !isPublishing &&
    Object.keys(errors).length === 0,
  );
  const canPublish = Boolean(
    form &&
    form.status !== "PUBLISHED" &&
    !isSaving &&
    !isPublishing &&
    Object.keys(errors).length === 0,
  );

  const loadImages = async (id: number) => {
    setImagesLoading(true);
    setImagesError(null);
    try {
      const data = await httpClient.getJson<ImageApi[]>(`albums/${id}/images`);
      setImages(data);
      setHasPendingImageChanges(false);
    } catch {
      setImagesError("No se pudieron cargar las imágenes del álbum.");
    } finally {
      setImagesLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setIsNotFound(false);

    void (async () => {
      try {
        let targetAlbumId = albumId;

        if (!targetAlbumId && isNewMode) {
          const draft = await httpClient.postJson<
            { id?: number },
            Record<string, never>
          >("admin/albums/draft", {});

          if (!draft.id) {
            throw new Error("Draft sin ID");
          }

          if (!cancelled) {
            navigateTo(routes.adminAlbumEdit.replace(":id", String(draft.id)), {
              replace: true,
            });
          }
          return;
        }

        if (!targetAlbumId) {
          setIsNotFound(true);
          return;
        }

        const album = await httpClient.getJson<AdminAlbumApi>(
          `admin/albums/${targetAlbumId}`,
        );
        if (cancelled) return;

        const nextForm: AlbumForm = {
          title: album.title ?? "",
          description: album.description ?? "",
          seasonLabel: normalizeSeasonLabel(
            album.seasonLabel,
            album.seasonStart,
          ),
          teamType: album.teamType ?? "CLUB",
          categoryCode: album.categoryCode ?? "",
          status: album.status ?? "DRAFT",
          thumbnail: album.thumbnail ?? "",
          kids: Boolean(album.kids),
          women: Boolean(album.women),
          goalkeeper: Boolean(album.goalkeeper),
          training: Boolean(album.training),
          classic: Boolean(album.classic),
          retro: Boolean(album.retro),
        };

        setAlbumName(album.title || "Álbum");
        setCreatedAt(album.createdAt ?? null);
        setUpdatedAt(album.updatedAt ?? null);
        setForm(nextForm);
        setInitialSnapshot(serializeForm(nextForm));
        setTouched({});

        await loadImages(targetAlbumId);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "";
        if (message.endsWith(": 404")) {
          setIsNotFound(true);
        } else {
          setLoadError("No se pudo cargar el álbum para edición.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [albumId, isNewMode, reloadKey]);

  useEffect(() => {
    if (!form) return;
    let cancelled = false;
    setCategoriesLoading(true);
    setCategoriesError(null);

    void (async () => {
      try {
        const data = await httpClient.getJson<CategoryApi[]>(
          `categories?teamType=${form.teamType}`,
        );
        if (!cancelled) {
          setCategories(data);
        }
      } catch {
        if (!cancelled) {
          setCategories([]);
          setCategoriesError("No se pudieron cargar las opciones disponibles.");
        }
      } finally {
        if (!cancelled) {
          setCategoriesLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [form?.teamType]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || isSaving) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, isSaving]);

  const handleCancel = () => {
    if (isSaving) return;
    if (
      dirty &&
      !window.confirm("Hay cambios sin guardar. ¿Descartar cambios?")
    )
      return;
    navigateTo(routes.adminAlbums);
  };

  const handleBlur = (name: "title" | "seasonLabel" | "categoryCode") => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleAttributeToggle = (key: AttributeKey) => {
    if (!form) return;
    setForm({ ...form, [key]: !form[key] });
  };

  const handleTeamTypeChange = (teamType: TeamType) => {
    if (!form) return;
    setForm({ ...form, teamType, categoryCode: "" });
    setTouched((prev) => ({ ...prev, categoryCode: true }));
  };

  const handleUploadImages = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!albumId) return;
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    setIsUploadingImages(true);
    setImagesError(null);

    try {
      let tempIdCursor = nextTempImageId;
      const uploaded: ImageApi[] = [];
      const failedUploads: string[] = [];

      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetchWithAuth(
            httpClient.buildUrl(`admin/upload/images/${albumId}`),
            {
              method: "POST",
              body: formData,
            },
          );

          if (!response.ok) {
            let detail = "";
            try {
              const payload = (await response.json()) as {
                message?: string;
                errors?: string[];
              };
              detail = payload.errors?.[0] ?? payload.message ?? "";
            } catch {
              detail = "";
            }
            failedUploads.push(
              `${file.name} (HTTP ${response.status}${detail ? `: ${detail}` : ""})`,
            );
            continue;
          }

          const body = (await response.json()) as UploadImageApi;
          if (!body.url) {
            failedUploads.push(`${file.name} (respuesta sin URL)`);
            continue;
          }

          uploaded.push({
            id: tempIdCursor,
            url: body.url,
            position: null,
            primary: false,
          });
          tempIdCursor -= 1;
        } catch {
          failedUploads.push(`${file.name} (error de red o CORS)`);
        }
      }

      if (uploaded.length > 0) {
        setImages((prev) => {
          const hasPrimary = prev.some((image) => image.primary);
          const nextUploaded = uploaded.map((image, index) => ({
            ...image,
            primary: hasPrimary ? false : index === 0,
          }));
          return [...prev, ...nextUploaded];
        });
        setForm((prev) => {
          if (!prev) return prev;
          if (prev.thumbnail && prev.thumbnail.trim()) return prev;
          return { ...prev, thumbnail: uploaded[0].url };
        });
        setNextTempImageId(tempIdCursor);
        setHasPendingImageChanges(true);
      }

      if (failedUploads.length > 0) {
        console.error("Upload image failures", failedUploads);
        setImagesError(
          uploaded.length > 0
            ? `Algunas imágenes no se pudieron subir: ${failedUploads.join(" | ")}`
            : `No se pudieron subir imágenes: ${failedUploads.join(" | ")}`,
        );
      }

      if (uploaded.length === 0 && failedUploads.length === 0) {
        setImagesError("No se subió ninguna imagen.");
      }
    } catch {
      setImagesError("No se pudieron subir una o más imágenes.");
    } finally {
      setIsUploadingImages(false);
    }
  };

  const persistImagesForAlbum = async (
    targetAlbumId: number,
  ): Promise<ImageApi[]> => {
    const payload = images.map((image, index) => ({
      id: image.id > 0 ? image.id : undefined,
      url: image.url,
      position: image.position ?? index,
      primary: image.primary,
    }));

    if (payload.length > 0 && !payload.some((image) => image.primary)) {
      payload[0].primary = true;
    }

    const response = await fetchWithAuth(
      httpClient.buildUrl(`admin/albums/${targetAlbumId}/images`),
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      throw new Error(`SYNC_IMAGES_FAILED:${response.status}`);
    }

    const syncedImages = (await response.json()) as ImageApi[];
    setImages(syncedImages);
    setForm((prev) => {
      if (!prev) return prev;
      const primary = syncedImages.find((image) => image.primary);
      const fallback = syncedImages[0];
      const nextThumbnail = primary?.url ?? fallback?.url ?? "";
      return { ...prev, thumbnail: nextThumbnail || prev.thumbnail };
    });
    setHasPendingImageChanges(false);
    return syncedImages;
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!albumId) return;
    try {
      const response = await fetchWithAuth(
        httpClient.buildUrl(`admin/albums/${albumId}/images/${imageId}`),
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        throw new Error(`DELETE_FAILED:${response.status}`);
      }
      const deletedImageUrl = images.find((img) => img.id === imageId)?.url;
      const remainingImages = images.filter((img) => img.id !== imageId);
      const normalizedRemainingImages =
        remainingImages.length > 0 &&
        !remainingImages.some((img) => img.primary)
          ? remainingImages.map((img, index) => ({
              ...img,
              primary: index === 0,
            }))
          : remainingImages;

      setImages(normalizedRemainingImages);
      setHasPendingImageChanges(true);
      setForm((prev) => {
        if (!prev) return prev;
        const shouldRecalculateThumbnail =
          Boolean(deletedImageUrl && prev.thumbnail === deletedImageUrl) ||
          !normalizedRemainingImages.some((img) => img.url === prev.thumbnail);

        if (!shouldRecalculateThumbnail) {
          return prev;
        }

        const nextThumbnail =
          normalizedRemainingImages.find((img) => img.primary)?.url ??
          normalizedRemainingImages[0]?.url ??
          "";
        return {
          ...prev,
          thumbnail: nextThumbnail,
        };
      });
    } catch {
      setImagesError("No se pudo eliminar la imagen seleccionada.");
    } finally {
      setPendingDeleteImageId(null);
    }
  };

  const setCoverImage = async (imageId: number) => {
    if (!albumId || !form) return;
    setIsUpdatingCover(imageId);
    setImagesError(null);

    try {
      const selectedImageUrl = images.find((img) => img.id === imageId)?.url;
      const payload = images.map((img, index) => ({
        id: img.id > 0 ? img.id : undefined,
        url: img.url,
        position: img.position ?? index,
        primary: img.id === imageId,
      }));

      const response = await fetchWithAuth(
        httpClient.buildUrl(`admin/albums/${albumId}/images`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(`COVER_FAILED:${response.status}`);
      }

      const nextImages = (await response.json()) as ImageApi[];
      setImages(nextImages);
      const selected =
        nextImages.find(
          (img) => selectedImageUrl && img.url === selectedImageUrl,
        ) ?? nextImages.find((img) => img.id === imageId);
      if (selected?.url) {
        setForm({ ...form, thumbnail: selected.url });
      }
    } catch {
      setImagesError("No se pudo actualizar la portada del álbum.");
    } finally {
      setIsUpdatingCover(null);
    }
  };

  const handleSave = async () => {
    if (!albumId || !form || !canSave) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    const seasonStart = parseSeasonStart(form.seasonLabel);
    if (!seasonStart) {
      setTouched((prev) => ({ ...prev, seasonLabel: true }));
      setIsSaving(false);
      return;
    }

    try {
      const syncedImages = await persistImagesForAlbum(albumId);
      const formForSave: AlbumForm = {
        ...form,
        thumbnail: getThumbnailForPayload(form.thumbnail, syncedImages) ?? "",
      };
      const saved = await saveAlbumChanges(
        albumId,
        formForSave,
        seasonStart,
        syncedImages,
      );
      const savedForm: AlbumForm = {
        ...formForSave,
        title: saved.title ?? formForSave.title,
        description: saved.description ?? "",
        seasonLabel: normalizeSeasonLabel(saved.seasonLabel, saved.seasonStart),
        status: saved.status ?? formForSave.status,
        categoryCode: saved.categoryCode ?? formForSave.categoryCode,
      };

      setForm(savedForm);
      setInitialSnapshot(serializeForm(savedForm));
      setAlbumName(saved.title ?? albumName);
      setUpdatedAt(saved.updatedAt ?? updatedAt);
      setSaveSuccess("Cambios guardados correctamente.");
      window.setTimeout(() => navigateTo(routes.adminAlbums), 700);
    } catch {
      setSaveError(
        "No se pudieron guardar los cambios. Verifica los datos e intenta nuevamente.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!albumId || !form || !canPublish) return;
    setIsPublishing(true);
    setSaveError(null);
    setSaveSuccess(null);

    const seasonStart = parseSeasonStart(form.seasonLabel);
    if (!seasonStart) {
      setTouched((prev) => ({ ...prev, seasonLabel: true }));
      setIsPublishing(false);
      return;
    }

    try {
      const syncedImages = await persistImagesForAlbum(albumId);
      const formForSave: AlbumForm = {
        ...form,
        thumbnail: getThumbnailForPayload(form.thumbnail, syncedImages) ?? "",
      };

      await saveAlbumChanges(albumId, formForSave, seasonStart, syncedImages);

      const response = await fetchWithAuth(
        httpClient.buildUrl(`admin/albums/${albumId}/publish`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            buildAlbumPayload(formForSave, seasonStart, syncedImages),
          ),
        },
      );

      if (!response.ok) {
        throw new Error(`PUBLISH_FAILED:${response.status}`);
      }

      const published = (await response.json()) as AdminAlbumApi;
      const publishedForm: AlbumForm = {
        ...formForSave,
        title: published.title ?? formForSave.title,
        description: published.description ?? "",
        seasonLabel: normalizeSeasonLabel(
          published.seasonLabel,
          published.seasonStart,
        ),
        status: published.status ?? "PUBLISHED",
        categoryCode: published.categoryCode ?? formForSave.categoryCode,
      };

      setForm(publishedForm);
      setInitialSnapshot(serializeForm(publishedForm));
      setAlbumName(published.title ?? albumName);
      setUpdatedAt(published.updatedAt ?? updatedAt);
      setSaveSuccess("Álbum publicado correctamente.");
      window.setTimeout(() => navigateTo(routes.adminAlbums), 700);
    } catch {
      setSaveError(
        "No se pudo publicar el álbum. Revisa los datos e intenta nuevamente.",
      );
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Editar álbum">
        <div className={styles.skeletonBlock} />
        <div className={styles.skeletonGrid}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      </AdminLayout>
    );
  }

  if (isNotFound || (!albumId && !isNewMode)) {
    return (
      <AdminLayout title="Editar álbum">
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
      <AdminLayout title="Editar álbum">
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
              onClick={() => setReloadKey((value) => value + 1)}
            >
              Reintentar
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Editar álbum">
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
                    disabled={isUpdatingCover !== null || image.primary}
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
                        disabled={isUpdatingCover !== null}
                      >
                        {isUpdatingCover === image.id
                          ? "Actualizando..."
                          : "Marcar portada"}
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

function getThumbnailForPayload(
  currentThumbnail: string,
  images: ImageApi[],
): string | null {
  const primary = images.find((image) => image.primary && image.url);
  if (primary?.url) {
    return primary.url;
  }

  if (currentThumbnail && currentThumbnail.trim()) {
    return currentThumbnail.trim();
  }

  return images[0]?.url ?? null;
}

function buildAlbumPayload(
  form: AlbumForm,
  seasonStart: number,
  images: ImageApi[],
) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    seasonLabel: form.seasonLabel.trim(),
    seasonStart,
    categoryCode: form.categoryCode,
    thumbnail: getThumbnailForPayload(form.thumbnail, images),
    kids: form.kids,
    women: form.women,
    goalkeeper: form.goalkeeper,
    training: form.training,
    classic: form.classic,
    retro: form.retro,
  };
}

async function saveAlbumChanges(
  albumId: number,
  form: AlbumForm,
  seasonStart: number,
  images: ImageApi[],
): Promise<AdminAlbumApi> {
  const response = await fetchWithAuth(
    httpClient.buildUrl(`admin/albums/${albumId}`),
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildAlbumPayload(form, seasonStart, images)),
    },
  );

  if (!response.ok) {
    throw new Error(`SAVE_FAILED:${response.status}`);
  }

  return (await response.json()) as AdminAlbumApi;
}
