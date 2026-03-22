import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import { getAppPathname, routes } from "../../../../app/router/routes";
import type {
  AdminAlbumDetailApi as AdminAlbumApi,
  AlbumFieldErrors as FieldErrors,
  AlbumForm,
  AttributeKey,
  CategoryApi,
  ImageApi,
  UploadImageApi,
} from "../types";
import { authFetch as fetchWithAuth } from "../../../../shared/api/authFetch";
import { httpClient } from "../../../../shared/api/httpClient";
import type { TeamType } from "../../../../shared/types/common";
import {
  formatDateTime as formatDate,
  normalizeSeasonLabel,
} from "../../../../shared/utils/formatters";
import { navigateTo } from "../../../../shared/utils/navigation";
import { parseSeasonStart } from "../../../../shared/utils/parsers";

function parseAlbumIdFromPath(): number | null {
  const pathname = getAppPathname(window.location.pathname);
  const parts = pathname.split("/").filter(Boolean);
  const id = parts[parts.length - 1];
  if (!id || id === "new") return null;
  const parsed = Number(id);
  return Number.isFinite(parsed) ? parsed : null;
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

export function useAlbumEditor() {
  const pathname = useMemo(() => getAppPathname(window.location.pathname), []);
  const isNewMode = pathname === routes.adminAlbumNew;
  const albumId = useMemo(parseAlbumIdFromPath, []);

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
        const targetAlbumId = albumId;

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
          seasonLabel: normalizeSeasonLabel(album.seasonLabel, album.seasonStart),
          teamType: (album.teamType ?? "CLUB") as TeamType,
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

  const selectedTeamType = form?.teamType;

  useEffect(() => {
    if (!selectedTeamType) return;
    let cancelled = false;
    setCategoriesLoading(true);
    setCategoriesError(null);

    void (async () => {
      try {
        const data = await httpClient.getJson<CategoryApi[]>(
          `categories?teamType=${selectedTeamType}`,
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
  }, [selectedTeamType]);

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
    if (dirty && !window.confirm("Hay cambios sin guardar. ¿Descartar cambios?")) {
      return;
    }
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

  const setCoverImage = (imageId: number) => {
    if (!form) return;
    setImagesError(null);

    const selected = images.find((img) => img.id === imageId);
    if (!selected?.url) return;

    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        primary: img.id === imageId,
      })),
    );
    setForm({ ...form, thumbnail: selected.url });
    setHasPendingImageChanges(true);
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

  const pageTitle = "Editar álbum";
  const invalidRoute = !albumId && !isNewMode;

  return {
    pageTitle,
    invalidRoute,
    reload: () => setReloadKey((value) => value + 1),
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
  };
}
