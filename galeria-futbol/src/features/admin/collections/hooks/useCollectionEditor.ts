import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import { getAppPathname, routes } from "../../../../app/router/routes";
import {
  addAlbumToFeaturedCollection,
  fetchFeaturedCollectionById,
  fetchFeaturedCollectionAlbumsById,
  getOrCreateFeaturedCollectionDraft,
  patchFeaturedCollection,
  removeAlbumFromFeaturedCollection,
  searchAdminAlbums,
  uploadFeaturedBanner,
} from "../api";
import type {
  CollectionAlbumItem as AlbumSearchItem,
  CollectionFieldErrors,
  CollectionForm,
  FeaturedCollectionPatchRequest,
} from "../../../../shared/types/collections";
import type { HttpClientError } from "../../../../shared/types/common";
import {
  calculateDurationLabel,
  toDateInputValue,
  toOffsetDateTime,
} from "../../../../shared/utils/dateHelpers";
import { navigateTo } from "../../../../shared/utils/navigation";
import { slugify } from "../../../../shared/utils/stringHelpers";

function parseCollectionIdFromPath(): number | null {
  const pathname = getAppPathname(window.location.pathname);
  const parts = pathname.split("/").filter(Boolean);
  const id = parts[parts.length - 1];
  if (!id || id === "new") return null;
  const parsed = Number(id);
  return Number.isFinite(parsed) ? parsed : null;
}

function serializeForm(form: CollectionForm): string {
  return JSON.stringify({
    ...form,
    title: form.title.trim(),
    description: form.description.trim(),
    priority: form.priority.trim(),
  });
}

function getValidationErrors(form: CollectionForm): CollectionFieldErrors {
  const errors: CollectionFieldErrors = {};

  if (!form.title.trim()) {
    errors.title = "El título es obligatorio.";
  }
  if (!form.startDate) {
    errors.startDate = "La fecha de inicio es obligatoria.";
  }
  if (!form.endDate) {
    errors.endDate = "La fecha de fin es obligatoria.";
  } else if (form.startDate && form.endDate < form.startDate) {
    errors.endDate = "La fecha de fin debe ser posterior a la fecha de inicio.";
  }

  return errors;
}

function resolveHttpErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const httpError = error as HttpClientError;
  if (httpError?.detail) {
    return `${fallback} (${httpError.detail})`;
  }
  if (httpError?.message) {
    return `${fallback} (${httpError.message})`;
  }
  return fallback;
}

export function useCollectionEditor() {
  const pathname = useMemo(() => getAppPathname(window.location.pathname), []);
  const isNewMode = pathname === routes.adminCollectionNew;
  const collectionId = useMemo(parseCollectionIdFromPath, []);

  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState<CollectionForm | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [effectiveCollectionId, setEffectiveCollectionId] = useState<
    number | null
  >(collectionId);
  const [effectiveCollectionSlug, setEffectiveCollectionSlug] = useState<
    string | undefined
  >(undefined);

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string>("");
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const [associatedAlbums, setAssociatedAlbums] = useState<AlbumSearchItem[]>(
    [],
  );
  const [albumsSearchQuery, setAlbumsSearchQuery] = useState("");
  const [albumsResults, setAlbumsResults] = useState<AlbumSearchItem[]>([]);
  const [isSearchingAlbums, setIsSearchingAlbums] = useState(false);
  const [albumsSearchError, setAlbumsSearchError] = useState<string | null>(
    null,
  );
  const [pendingRemoveAlbumId, setPendingRemoveAlbumId] = useState<
    number | null
  >(null);

  const formDirty = Boolean(
    form && initialSnapshot && serializeForm(form) !== initialSnapshot,
  );
  const dirty = formDirty || Boolean(bannerFile);
  const validationErrors = form ? getValidationErrors(form) : {};
  const hasValidationErrors = Object.keys(validationErrors).length > 0;
  const hasRequiredBanner = Boolean(form?.bannerImage?.trim() || bannerFile);
  const canSave = Boolean(
    form && !isSaving && !hasValidationErrors && hasRequiredBanner,
  );
  const isAssociationDisabledInCreate = isNewMode && !effectiveCollectionId;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setIsNotFound(false);
    setLoadError(null);

    void (async () => {
      if (isNewMode) {
        try {
          const draft = await getOrCreateFeaturedCollectionDraft();

          if (!draft) {
            throw new Error("DRAFT_NOT_AVAILABLE");
          }
          if (cancelled) return;

          const nextForm: CollectionForm = {
            title: "",
            description: "",
            startDate: toDateInputValue(draft.startDate),
            endDate: toDateInputValue(draft.endDate),
            active: false,
            priority: "1",
            bannerImage:
              draft.bannerImage && draft.bannerImage !== "placeholder"
                ? draft.bannerImage
                : "",
          };

          setEffectiveCollectionId(draft.id);
          setEffectiveCollectionSlug(draft.slug);
          setForm(nextForm);
          setInitialSnapshot(serializeForm(nextForm));
          setAssociatedAlbums([]);
          setBannerPreviewUrl(
            draft.bannerImage && draft.bannerImage !== "placeholder"
              ? draft.bannerImage
              : "",
          );
          setBannerFile(null);
          setTouched({});
          setIsLoading(false);
        } catch {
          if (!cancelled) {
            setLoadError("No se pudo crear el borrador de la colección.");
            setIsLoading(false);
          }
        }
        return;
      }

      if (!collectionId) {
        if (!cancelled) {
          setIsNotFound(true);
          setIsLoading(false);
        }
        return;
      }

      try {
        const target = await fetchFeaturedCollectionById(collectionId);

        if (!target) {
          if (!cancelled) {
            setIsNotFound(true);
            setIsLoading(false);
          }
          return;
        }

        const nextForm: CollectionForm = {
          title: target.title ?? "",
          description: target.description ?? "",
          startDate: toDateInputValue(target.startDate),
          endDate: toDateInputValue(target.endDate),
          active: Boolean(target.active),
          priority: String(target.priority ?? 1),
          bannerImage: target.bannerImage ?? "",
        };

        const albums = await fetchFeaturedCollectionAlbumsById(
          target.id,
          target.slug,
        );

        if (cancelled) return;

        setEffectiveCollectionId(target.id);
        setEffectiveCollectionSlug(target.slug);
        setForm(nextForm);
        setInitialSnapshot(serializeForm(nextForm));
        setBannerPreviewUrl(target.bannerImage ?? "");
        setBannerFile(null);
        setAssociatedAlbums(albums ?? []);
        setTouched({});
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            resolveHttpErrorMessage(
              error,
              "No se pudo cargar la colección para edición.",
            ),
          );
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
  }, [collectionId, isNewMode]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || isSaving) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, isSaving]);

  useEffect(() => {
    if (!effectiveCollectionId || !albumsSearchQuery.trim()) {
      setAlbumsResults([]);
      setAlbumsSearchError(null);
      return;
    }

    let cancelled = false;
    const handler = window.setTimeout(() => {
      setIsSearchingAlbums(true);
      setAlbumsSearchError(null);

      void searchAdminAlbums(albumsSearchQuery.trim(), 0, 8)
        .then((response) => {
          if (!cancelled) {
            setAlbumsResults(response.content ?? []);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setAlbumsResults([]);
            setAlbumsSearchError("No se pudo buscar álbumes.");
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsSearchingAlbums(false);
          }
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(handler);
    };
  }, [albumsSearchQuery, effectiveCollectionId]);

  const handleCancel = () => {
    if (isSaving) return;
    if (
      dirty &&
      !window.confirm("Hay cambios sin guardar. ¿Descartar cambios?")
    ) {
      return;
    }
    navigateTo(routes.adminCollections);
  };

  const handleBlur = (name: "title" | "startDate" | "endDate") => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handlePickBanner = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !form) return;

    setSaveError(null);
    setAlbumsSearchError(null);

    if (!effectiveCollectionId) {
      const objectUrl = URL.createObjectURL(file);
      setBannerPreviewUrl(objectUrl);
      setBannerFile(file);
      return;
    }

    setIsUploadingBanner(true);
    try {
      const uploadedUrl = await uploadFeaturedBanner(
        effectiveCollectionId,
        file,
      );
      setForm({ ...form, bannerImage: uploadedUrl });
      setBannerPreviewUrl(uploadedUrl);
      setBannerFile(null);
    } catch (error) {
      setSaveError(
        resolveHttpErrorMessage(
          error,
          "No se pudo subir el banner. Intenta nuevamente.",
        ),
      );
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleRemoveBanner = () => {
    if (!form) return;
    setBannerFile(null);
    setBannerPreviewUrl("");
    setForm({ ...form, bannerImage: "" });
  };

  const addAlbumToCollection = async (album: AlbumSearchItem) => {
    if (!effectiveCollectionId) return;

    const alreadyAssociated = associatedAlbums.some(
      (item) => item.id === album.id,
    );
    if (alreadyAssociated) return;

    setAlbumsSearchError(null);
    try {
      await addAlbumToFeaturedCollection(effectiveCollectionId, album.id);
      const nextAlbums = await fetchFeaturedCollectionAlbumsById(
        effectiveCollectionId,
        effectiveCollectionSlug,
      );
      setAssociatedAlbums(nextAlbums ?? []);
      setAlbumsSearchQuery("");
      setAlbumsResults([]);
    } catch (error) {
      const httpError = error as HttpClientError;
      const endpointMissing =
        httpError?.status === 404 &&
        /No static resource/i.test(httpError?.detail ?? "");
      setAlbumsSearchError(
        endpointMissing
          ? "El backend desplegado no soporta aún asociar álbumes a colecciones destacadas."
          : resolveHttpErrorMessage(
              error,
              "No se pudo asociar el álbum a la colección.",
            ),
      );
    }
  };

  const confirmRemoveAssociatedAlbum = async (albumId: number) => {
    if (!effectiveCollectionId) return;

    setAlbumsSearchError(null);
    try {
      await removeAlbumFromFeaturedCollection(effectiveCollectionId, albumId);
      const nextAlbums = await fetchFeaturedCollectionAlbumsById(
        effectiveCollectionId,
        effectiveCollectionSlug,
      );
      setAssociatedAlbums(nextAlbums ?? []);
    } catch (error) {
      const httpError = error as HttpClientError;
      const endpointMissing =
        httpError?.status === 404 &&
        /No static resource/i.test(httpError?.detail ?? "");
      setAlbumsSearchError(
        endpointMissing
          ? "El backend desplegado no soporta aún quitar álbumes de colecciones destacadas."
          : resolveHttpErrorMessage(
              error,
              "No se pudo quitar el álbum de la colección.",
            ),
      );
    } finally {
      setPendingRemoveAlbumId(null);
    }
  };

  const handleSave = async () => {
    if (!form || !canSave) {
      setTouched((prev) => ({
        ...prev,
        title: true,
        startDate: true,
        endDate: true,
      }));
      return;
    }

    if (isNewMode && !bannerFile && !form.bannerImage.trim()) {
      setSaveError("El banner es obligatorio para crear la colección.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    const priorityNumber = Number(form.priority || "1");
    const safePriority =
      Number.isFinite(priorityNumber) && priorityNumber > 0
        ? priorityNumber
        : 1;
    const computedSlug = slugify(form.title);

    if (!computedSlug) {
      setSaveError("No se pudo construir un slug válido a partir del título.");
      setIsSaving(false);
      return;
    }

    try {
      if (effectiveCollectionId) {
        let finalBanner = form.bannerImage;
        if (bannerFile) {
          finalBanner = await uploadFeaturedBanner(effectiveCollectionId, bannerFile);
        }

        const patchPayload: FeaturedCollectionPatchRequest = {
          slug: computedSlug,
          title: form.title.trim(),
          description: form.description,
          startDate: toOffsetDateTime(form.startDate, false),
          endDate: toOffsetDateTime(form.endDate, true),
          active: Boolean(form.active),
          priority: safePriority,
          bannerImage: finalBanner,
        };

        let savedCollection;
        try {
          savedCollection = await patchFeaturedCollection(
            effectiveCollectionId,
            patchPayload,
          );
        } catch (error) {
          const httpError = error as HttpClientError;
          const maybeUnknownDateField =
            httpError?.status === 400 &&
            /(startDate|endDate|Unrecognized field)/i.test(
              `${httpError?.detail ?? ""} ${httpError?.message ?? ""}`,
            );

          if (!maybeUnknownDateField) {
            throw error;
          }

          const legacyPayload: FeaturedCollectionPatchRequest = {
            slug: computedSlug,
            title: form.title.trim(),
            description: form.description,
            active: Boolean(form.active),
            priority: safePriority,
            bannerImage: finalBanner,
          };
          savedCollection = await patchFeaturedCollection(
            effectiveCollectionId,
            legacyPayload,
          );
        }

        const savedForm: CollectionForm = {
          ...form,
          priority: String(safePriority),
          bannerImage: finalBanner,
        };
        setForm(savedForm);
        setInitialSnapshot(serializeForm(savedForm));
        setBannerFile(null);
        setBannerPreviewUrl(finalBanner);
        setEffectiveCollectionSlug(savedCollection.slug);
      } else {
        setSaveError("No se pudo determinar el borrador de colección para guardar.");
        return;
      }

      setSaveSuccess("Colección guardada correctamente.");
      window.setTimeout(() => navigateTo(routes.adminCollections), 700);
    } catch (error) {
      setSaveError(
        resolveHttpErrorMessage(
          error,
          "No se pudo guardar la colección. Revisa los datos e intenta nuevamente.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const pageTitle = isNewMode ? "Nueva colección" : "Editar colección";
  const breadcrumbTitle = isNewMode
    ? "Nueva colección"
    : (form?.title?.trim() ?? "") || "Colección";
  const durationLabel = form
    ? calculateDurationLabel(form.startDate, form.endDate)
    : "Duración Calculada: —";

  return {
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
    canSave,
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
  };
}
