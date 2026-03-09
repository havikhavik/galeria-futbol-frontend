import { useEffect, useState } from "react";

import { getAppPathname, routes, toAppPath } from "../app/router/routes";
import { HomeHeader } from "../features/discovery/components/HomeHeader";
import { httpClient } from "../shared/api/httpClient";
import { Footer } from "../shared/components/Footer/Footer";

import styles from "./AlbumDetailPage.module.css";

/* ── Types ── */

type AlbumResponse = {
  id: number;
  title: string;
  seasonLabel: string | null;
  seasonStart: number;
  teamType: "CLUB" | "NATIONAL";
  categoryCode: string;
  categoryName: string;
  thumbnail: string | null;
  description: string | null;
  kids: boolean;
  women: boolean;
  goalkeeper: boolean;
  training: boolean;
  classic: boolean;
  retro: boolean;
};

type ImageResponse = {
  id: number;
  url: string;
  position: number;
  primary: boolean;
};

type FilterKey =
  | "kids"
  | "women"
  | "goalkeeper"
  | "training"
  | "classic"
  | "retro";

const TAG_LABELS: Record<FilterKey, string> = {
  kids: "Niños",
  women: "Mujeres",
  goalkeeper: "Arquero",
  training: "Entrenamiento",
  classic: "Clásica",
  retro: "Retro",
};

const FILTER_KEYS = Object.keys(TAG_LABELS) as FilterKey[];

function formatCode(code: string): string {
  return code
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/* ── Component ── */

export function AlbumDetailPage() {
  const albumId = getAppPathname(window.location.pathname).split("/")[2];

  const [album, setAlbum] = useState<AlbumResponse | null>(null);
  const [images, setImages] = useState<ImageResponse[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState(false);

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
        setAlbum(albumData);
        const sorted = imagesData.sort((a, b) => a.position - b.position);
        setImages(sorted);
        const primaryIdx = sorted.findIndex((img) => img.primary);
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

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      else if (e.key === "ArrowLeft") setActiveIdx((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight")
        setActiveIdx((i) => Math.min(images.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, images.length]);

  const handleSearch = (q: string) => {
    const url = new URL(window.location.href);
    url.pathname = toAppPath(routes.search);
    url.search = "";
    if (q) {
      url.searchParams.set("q", q);
    }
    window.location.assign(url.toString());
  };

  const tags = album
    ? FILTER_KEYS.filter((k) => album[k]).map((k) => TAG_LABELS[k])
    : [];
  const teamTypeLabel =
    album?.teamType === "CLUB"
      ? "Clubes"
      : album?.teamType === "NATIONAL"
        ? "Selecciones Nacionales"
        : "";
  const albumTitle = album?.title ?? "Álbum";
  const activeImage = images[activeIdx];

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <HomeHeader onSearchSubmit={handleSearch} />

        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <a href={toAppPath(routes.home)} className={styles.breadcrumbLink}>
            Inicio
          </a>
          <span className={styles.breadcrumbSep}>›</span>
          {album && teamTypeLabel ? (
            <>
              <a
                href={`${toAppPath(routes.categories)}?teamType=${album.teamType}`}
                className={styles.breadcrumbLink}
              >
                {teamTypeLabel}
              </a>
              {album.categoryCode && (
                <>
                  <span className={styles.breadcrumbSep}>›</span>
                  <a
                    href={`${toAppPath(routes.search)}?categoryCode=${album.categoryCode}&teamType=${album.teamType}`}
                    className={styles.breadcrumbLink}
                  >
                    {formatCode(album.categoryName)}
                  </a>
                </>
              )}
              <span className={styles.breadcrumbSep}>›</span>
              <span className={styles.breadcrumbCurrent}>{album.title}</span>
            </>
          ) : (
            <span className={styles.breadcrumbCurrent}>
              {isLoading ? "Cargando…" : "Álbum"}
            </span>
          )}
        </nav>

        {isLoading && <p className={styles.loading}>Cargando álbum…</p>}
        {error && <p className={styles.error}>{error}</p>}

        {album && !isLoading && (
          <div className={styles.detail}>
            {/* ── Gallery ── */}
            <section className={styles.gallery}>
              <div className={styles.mainImageWrap}>
                {images.length > 0 && (
                  <span className={styles.counterOverlay}>
                    {activeIdx + 1} / {images.length}
                  </span>
                )}

                <button
                  type="button"
                  className={styles.closeBtnOverlay}
                  onClick={() => window.history.back()}
                  aria-label="Volver"
                >
                  ✕
                </button>

                {activeImage ? (
                  <img
                    src={activeImage.url}
                    alt={`${albumTitle} - imagen ${activeIdx + 1}`}
                    className={styles.mainImage}
                    referrerPolicy="no-referrer"
                    onClick={() => setLightbox(true)}
                    style={{ cursor: "pointer" }}
                  />
                ) : album.thumbnail ? (
                  <img
                    src={album.thumbnail}
                    alt={albumTitle}
                    className={styles.mainImage}
                    referrerPolicy="no-referrer"
                  />
                ) : null}

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      className={`${styles.navBtn} ${styles.prevBtn}`}
                      disabled={activeIdx === 0}
                      onClick={() => setActiveIdx((i) => i - 1)}
                      aria-label="Imagen anterior"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className={`${styles.navBtn} ${styles.nextBtn}`}
                      disabled={activeIdx === images.length - 1}
                      onClick={() => setActiveIdx((i) => i + 1)}
                      aria-label="Imagen siguiente"
                    >
                      ›
                    </button>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className={styles.thumbnails}>
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      type="button"
                      className={`${styles.thumb} ${i === activeIdx ? styles.thumbActive : ""}`}
                      onClick={() => setActiveIdx(i)}
                      aria-label={`Imagen ${i + 1}`}
                    >
                      <img
                        src={img.url}
                        alt=""
                        className={styles.thumbImg}
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* ── Info ── */}
            <section className={styles.info}>
              <div className={styles.badges}>
                {album.seasonLabel && (
                  <span className={styles.seasonBadge}>
                    {album.seasonLabel}
                  </span>
                )}
                <span className={styles.typeBadge}>
                  {album.teamType === "CLUB" ? "Club" : "Selección"}
                </span>
              </div>

              <h1 className={styles.title}>{album.title}</h1>

              {album.categoryName && (
                <span className={styles.subtitle}>
                  {formatCode(album.categoryName)}
                </span>
              )}

              {tags.length > 0 && (
                <div className={styles.tags}>
                  {tags.map((t) => (
                    <span key={t} className={styles.tag}>
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className={styles.descSection}>
                <h2 className={styles.descHeading}>Descripción</h2>
                <div className={styles.descMeta}>
                  <span>
                    <span className={styles.descMetaLabel}>
                      Tipo de equipo:{" "}
                    </span>
                    {album.teamType === "CLUB" ? "Club" : "Selección Nacional"}
                  </span>
                  {album.categoryName && (
                    <span>
                      <span className={styles.descMetaLabel}>Liga: </span>
                      {formatCode(album.categoryName)}
                    </span>
                  )}
                  {album.seasonLabel && (
                    <span>
                      <span className={styles.descMetaLabel}>Temporada: </span>
                      {album.seasonLabel}
                    </span>
                  )}
                </div>
                {album.description && (
                  <p className={styles.descText}>{album.description}</p>
                )}
              </div>

              {images.length > 0 && (
                <span className={styles.imageCount}>
                  {images.length} {images.length === 1 ? "imagen" : "imágenes"}
                </span>
              )}

              <button
                type="button"
                className={styles.galleryBtn}
                onClick={() => {
                  setActiveIdx(0);
                  setLightbox(true);
                }}
              >
                <svg
                  viewBox="0 0 20 20"
                  width="16"
                  height="16"
                  aria-hidden="true"
                >
                  <rect
                    x="2"
                    y="2"
                    width="7"
                    height="7"
                    rx="1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <rect
                    x="11"
                    y="2"
                    width="7"
                    height="7"
                    rx="1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <rect
                    x="2"
                    y="11"
                    width="7"
                    height="7"
                    rx="1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <rect
                    x="11"
                    y="11"
                    width="7"
                    height="7"
                    rx="1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
                Ver galería completa
              </button>

              <a
                className={styles.backLink}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.back();
                }}
              >
                Volver al listado
              </a>
            </section>
          </div>
        )}
      </div>

      <Footer />

      {/* ── Lightbox ── */}
      {lightbox && activeImage && (
        <div
          className={styles.lightbox}
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightbox(false);
          }}
          role="dialog"
          aria-label="Galería de imágenes"
        >
          <button
            type="button"
            className={styles.lightboxClose}
            onClick={() => setLightbox(false)}
            aria-label="Cerrar galería"
          >
            ✕
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
                onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
                disabled={activeIdx === 0}
                aria-label="Anterior"
              >
                ‹
              </button>
              <button
                type="button"
                className={`${styles.lightboxNav} ${styles.lightboxNext}`}
                onClick={() =>
                  setActiveIdx((i) => Math.min(images.length - 1, i + 1))
                }
                disabled={activeIdx === images.length - 1}
                aria-label="Siguiente"
              >
                ›
              </button>
            </>
          )}

          <img
            src={activeImage.url}
            alt={`${albumTitle} - imagen ${activeIdx + 1}`}
            className={styles.lightboxImage}
            referrerPolicy="no-referrer"
          />

          <span className={styles.lightboxCounter}>
            {activeIdx + 1} / {images.length}
          </span>
        </div>
      )}
    </main>
  );
}
