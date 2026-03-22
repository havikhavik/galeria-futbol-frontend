import { useEffect, useMemo, useRef, useState } from "react";

import { httpClient } from "../../../../shared/api/httpClient";
import type { HttpClientError } from "../../../../shared/api/httpClient";
import {
  fetchAdminAlbumsPageWithFallback,
  mapAdminAlbumToRow,
} from "../api";
import { DEFAULT_ATTRIBUTE_FILTERS } from "../constants";
import type {
  AlbumRow,
  AttributeFilterKey,
  AttributeFilters,
  TeamTypeFilter,
} from "../types";

type UseAlbumsListOptions = {
  onDraftCreated: (id: number) => void;
};

export function useAlbumsList({ onDraftCreated }: UseAlbumsListOptions) {
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

  const markThumbnailError = (albumId: number) => {
    setThumbnailErrors((prev) => {
      const next = new Set(prev);
      next.add(albumId);
      return next;
    });
  };

  const handleDelete = async (id: number) => {
    setDeleteError(null);
    try {
      await httpClient.deleteJson<void>(`admin/albums/${id}`);
      setAlbums((prev) => prev.filter((album) => album.id !== id));
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

      onDraftCreated(draft.id);
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

  return {
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
  };
}
