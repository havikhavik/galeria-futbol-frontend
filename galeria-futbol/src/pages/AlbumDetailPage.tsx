import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";

import { getAppPathname, routes, toAppPath } from "../app/router/routes";
import { categoryDisplayName } from "../features/discovery/catalogTaxonomy";
import { NEWEST_UPLOADS_SORT } from "../features/discovery/catalogSort";
import { AlbumTile } from "../features/discovery/components/AlbumTile";
import { PublicLayout } from "../features/discovery/components/PublicLayout";
import { useCatalogTaxonomy } from "../features/discovery/useCatalogTaxonomy";
import { httpClient } from "../shared/api/httpClient";
import type { AlbumResponse, ImageResponse } from "../shared/types/albums";
import type { PageResponse } from "../shared/types/common";
import { albumTags } from "../shared/utils/albumHelpers";
import { normalizeSeasonLabel } from "../shared/utils/formatters";
import { readSearchParams } from "../shared/utils/parsers";

import styles from "./AlbumDetailPage.module.css";

type Photo = { id: number; url: string };

const RELATED_COUNT = 4;

/** Only same-site paths are accepted as the «Volver» target. */
function safeReturnPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export function AlbumDetailPage() {
  const albumId = getAppPathname(window.location.pathname).split("/")[2];
  const params = useMemo(readSearchParams, []);
  const taxonomy = useCatalogTaxonomy();

  const [album, setAlbum] = useState<AlbumResponse | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const [related, setRelated] = useState<AlbumResponse[]>([]);
  const fullButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [albumData, imagesData] = await Promise.all([
          httpClient.getJson<AlbumResponse>(`albums/${albumId}`),
          httpClient.getJson<ImageResponse[]>(`albums/${albumId}/images`),
        ]);
        if (cancelled) return;
        const sorted = [...imagesData].sort((a, b) => a.position - b.position);
        const primaryIdx = sorted.findIndex((img) => img.primary);
        setAlbum(albumData);
        setPhotos(
          sorted.length > 0
            ? sorted.map((img) => ({ id: img.id, url: img.url }))
            : albumData.thumbnail
              ? [{ id: 0, url: albumData.thumbnail }]
              : [],
        );
        setActiveIdx(primaryIdx >= 0 ? primaryIdx : 0);
      } catch {
        if (!cancelled)
          setError("No pudimos cargar el álbum. Intenta nuevamente.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [albumId]);

  // «Más de {categoría}»: latest uploads of the same league or confederation.
  useEffect(() => {
    if (!album?.categoryCode) return;
    let cancelled = false;
    const query = new URLSearchParams({
      categoryCode: album.categoryCode,
      teamType: album.teamType,
      page: "0",
      size: String(RELATED_COUNT + 1),
      sort: NEWEST_UPLOADS_SORT,
    });
    httpClient
      .getJson<PageResponse<AlbumResponse>>(`albums?${query}`)
      .then((data) => {
        if (cancelled) return;
        setRelated(
          data.content.filter((a) => a.id !== album.id).slice(0, RELATED_COUNT),
        );
      })
      .catch(() => {
        // Related shirts are optional: the section just stays hidden.
      });
    return () => {
      cancelled = true;
    };
  }, [album]);

  const lastIdx = photos.length - 1;
  const goTo = (idx: number) => setActiveIdx(Math.min(lastIdx, Math.max(0, idx)));

  const openLightbox = () => setLightbox(true);
  const closeLightbox = () => {
    setLightbox(false);
    fullButtonRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (!lightbox) return;

    const root = document.documentElement;
    root.style.overflow = "hidden";
    const focusTimer = window.setTimeout(
      () => closeButtonRef.current?.focus({ preventScroll: true }),
      30,
    );
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightbox(false);
        fullButtonRef.current?.focus({ preventScroll: true });
      } else if (event.key === "ArrowLeft") {
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (event.key === "ArrowRight") {
        setActiveIdx((i) => Math.min(lastIdx, i + 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      root.style.overflow = "";
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightbox, lastIdx]);

  /* ── Context ── */

  const isNational = album?.teamType === "NATIONAL";
  const categoryItems = isNational ? taxonomy.nations : taxonomy.clubs;
  const categoryItem = categoryItems.find((c) => c.code === album?.categoryCode);
  const categoryName = album?.categoryCode
    ? categoryDisplayName(album.categoryCode, album.categoryName)
    : "";
  const teamTypeHref = album
    ? `${toAppPath(routes.home)}?teamType=${album.teamType}`
    : toAppPath(routes.home);
  const categoryHref = album?.categoryCode
    ? `${teamTypeHref}&categoryCode=${album.categoryCode}`
    : teamTypeHref;

  const contextLabel = params.get("ctx") || categoryName || "la galería";
  const backLabel = `Volver a ${contextLabel}`;
  const returnPath = safeReturnPath(params.get("ret"));
  const backHref = returnPath ?? categoryHref;

  // Coming from the gallery: go back in history to keep its scroll position
  // and the pages already loaded. Otherwise, follow the link.
  const handleBack = (event: MouseEvent<HTMLAnchorElement>) => {
    const fromSite = document.referrer.startsWith(window.location.origin);
    if (returnPath && fromSite && window.history.length > 1) {
      event.preventDefault();
      window.history.back();
    }
  };

  const season = album ? normalizeSeasonLabel(album.seasonLabel, album.seasonStart || null) : "";
  const tags = album ? albumTags(album) : [];
  const photo = photos[activeIdx];
  const photoAlt = album
    ? `${album.title}, foto ${activeIdx + 1} de ${photos.length}`
    : "";

  const relatedQuery = new URLSearchParams({
    ctx: categoryName,
    ret: categoryHref,
  }).toString();

  const counter = (
    <>
      {activeIdx + 1}
      <span> / {photos.length}</span>
    </>
  );

  return (
    <PublicLayout dimmed>
      <div className={styles.wrap}>
        <div className={styles.top}>
          <a
            className={styles.back}
            href={backHref}
            onClick={handleBack}
            aria-label={backLabel}
          >
            <span aria-hidden="true">←</span>
            <span className={styles.backLabel}>{backLabel}</span>
          </a>
          {album && (
            <nav className={styles.crumbs} aria-label="Ruta">
              <a href={toAppPath(routes.home)}>Inicio</a>
              <span aria-hidden="true">›</span>
              <a href={teamTypeHref}>
                {isNational ? "Selecciones nacionales" : "Clubes"}
              </a>
              {categoryName && (
                <>
                  <span aria-hidden="true">›</span>
                  <a href={categoryHref}>{categoryName}</a>
                </>
              )}
              <span aria-hidden="true">›</span>
              <b>{album.title}</b>
            </nav>
          )}
        </div>

        {isLoading && <p className={styles.message}>Cargando álbum…</p>}
        {error && <p className={styles.error}>{error}</p>}

        {album && !isLoading && (
          <>
            <div className={styles.detail}>
              {photos.length > 1 && (
                <div className={styles.thumbs} role="group" aria-label="Fotos">
                  {photos.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      className={styles.thumb}
                      aria-current={i === activeIdx}
                      aria-label={`Foto ${i + 1} de ${photos.length}`}
                      onClick={() => setActiveIdx(i)}
                    >
                      <img src={p.url} alt="" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              )}

              <section className={styles.viewer} aria-label="Foto">
                <button
                  type="button"
                  className={styles.stage}
                  aria-label="Ver en pantalla completa"
                  onClick={openLightbox}
                  disabled={!photo}
                >
                  {photo && (
                    <img
                      key={photo.id}
                      src={photo.url}
                      alt={photoAlt}
                      referrerPolicy="no-referrer"
                    />
                  )}
                </button>
                {photos.length > 0 && (
                  <div className={styles.controls}>
                    <button
                      type="button"
                      className={styles.nav}
                      aria-label="Foto anterior"
                      disabled={activeIdx === 0}
                      onClick={() => goTo(activeIdx - 1)}
                    >
                      ←
                    </button>
                    <span className={styles.counter} aria-live="polite">
                      {counter}
                    </span>
                    <button
                      type="button"
                      className={styles.nav}
                      aria-label="Foto siguiente"
                      disabled={activeIdx === lastIdx}
                      onClick={() => goTo(activeIdx + 1)}
                    >
                      →
                    </button>
                    <button
                      ref={fullButtonRef}
                      type="button"
                      className={styles.full}
                      aria-label="Ver galería completa"
                      onClick={openLightbox}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
                      </svg>
                      <span className={styles.fullLabel}>Ver galería completa</span>
                    </button>
                  </div>
                )}
              </section>

              <section className={styles.info} aria-labelledby="album-title">
                <div className={styles.kicker}>
                  {categoryItem?.image && (
                    <img src={categoryItem.image} alt="" referrerPolicy="no-referrer" />
                  )}
                  {isNational ? "Selección nacional" : "Club"}
                  {categoryName ? ` · ${categoryName}` : ""}
                </div>
                <h1 id="album-title">{album.title}</h1>
                <div className={styles.badges}>
                  {season && (
                    <span className={`${styles.badge} ${styles.badgeSeason}`}>
                      {season}
                    </span>
                  )}
                  <span className={styles.badge}>
                    {isNational ? "Selección" : "Club"}
                  </span>
                  {tags.map((t) => (
                    <span key={t} className={styles.badge}>
                      {t}
                    </span>
                  ))}
                </div>
                {album.description && (
                  <p className={styles.description}>{album.description}</p>
                )}
                <dl className={styles.meta}>
                  <div>
                    <dt>Tipo de equipo</dt>
                    <dd>{isNational ? "Selección nacional" : "Club"}</dd>
                  </div>
                  {categoryName && (
                    <div>
                      <dt>{isNational ? "Confederación" : "Liga"}</dt>
                      <dd>
                        {categoryItem?.image && (
                          <img
                            src={categoryItem.image}
                            alt=""
                            referrerPolicy="no-referrer"
                          />
                        )}
                        {categoryName}
                      </dd>
                    </div>
                  )}
                  {season && (
                    <div>
                      <dt>Temporada</dt>
                      <dd>{season}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Fotos</dt>
                    <dd>
                      {photos.length} {photos.length === 1 ? "imagen" : "imágenes"}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>

            {related.length > 0 && (
              <section className={styles.related} aria-labelledby="related-title">
                <div className={styles.relatedHeader}>
                  <h2 id="related-title">Más de {categoryName}</h2>
                  <a href={categoryHref}>Ver todas →</a>
                </div>
                <div className={styles.relatedGrid}>
                  {related.map((item) => (
                    <AlbumTile key={item.id} album={item} linkQuery={relatedQuery} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {album && photo && (
        <div
          className={`${styles.lightbox} ${lightbox ? styles.lightboxOpen : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="Galería completa"
        >
          <div className={styles.lightboxHeader}>
            <b>{album.title}</b>
            <span className={styles.counter}>{counter}</span>
            <button
              ref={closeButtonRef}
              type="button"
              className={styles.lightboxClose}
              aria-label="Cerrar"
              onClick={closeLightbox}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className={styles.lightboxBody}>
            <button
              type="button"
              className={`${styles.nav} ${styles.lightboxNav}`}
              aria-label="Foto anterior"
              disabled={activeIdx === 0}
              onClick={() => goTo(activeIdx - 1)}
            >
              ←
            </button>
            <div
              className={styles.lightboxImage}
              onClick={(event) => {
                if (event.target === event.currentTarget) closeLightbox();
              }}
            >
              <img
                key={photo.id}
                src={photo.url}
                alt={photoAlt}
                referrerPolicy="no-referrer"
              />
            </div>
            <button
              type="button"
              className={`${styles.nav} ${styles.lightboxNav}`}
              aria-label="Foto siguiente"
              disabled={activeIdx === lastIdx}
              onClick={() => goTo(activeIdx + 1)}
            >
              →
            </button>
          </div>
          <div>
            <div className={styles.lightboxMobileNav}>
              <button
                type="button"
                className={`${styles.nav} ${styles.lightboxNav}`}
                aria-label="Foto anterior"
                disabled={activeIdx === 0}
                onClick={() => goTo(activeIdx - 1)}
              >
                ←
              </button>
              <button
                type="button"
                className={`${styles.nav} ${styles.lightboxNav}`}
                aria-label="Foto siguiente"
                disabled={activeIdx === lastIdx}
                onClick={() => goTo(activeIdx + 1)}
              >
                →
              </button>
            </div>
            {photos.length > 1 && (
              <div className={styles.lightboxThumbs}>
                {photos.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    className={styles.thumb}
                    aria-current={i === activeIdx}
                    aria-label={`Foto ${i + 1} de ${photos.length}`}
                    onClick={() => setActiveIdx(i)}
                  >
                    <img src={p.url} alt="" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
