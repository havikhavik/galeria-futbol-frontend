import { useState } from "react";

import { toAppPath } from "../../../app/router/routes";
import type { AlbumResponse } from "../../../shared/types/albums";
import { normalizeSeasonLabel } from "../../../shared/utils/formatters";
import { categoryDisplayName } from "../catalogTaxonomy";

import styles from "./AlbumTile.module.css";

type AlbumTileProps = {
  album: AlbumResponse;
  /** Query appended to the detail link (where the user came from). */
  linkQuery?: string;
};

export function AlbumTile({ album, linkQuery }: AlbumTileProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const details = [
    album.categoryCode || album.categoryName
      ? categoryDisplayName(album.categoryCode, album.categoryName)
      : "",
    normalizeSeasonLabel(album.seasonLabel, album.seasonStart || null),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <a
      href={`${toAppPath(`/albums/${album.id}`)}${linkQuery ? `?${linkQuery}` : ""}`}
      className={styles.tile}
    >
      <div className={styles.photo}>
        {album.thumbnail && !imageFailed ? (
          <img
            src={album.thumbnail}
            alt=""
            className={styles.image}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className={styles.fallback} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              className={styles.fallbackIcon}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="9" cy="10" r="1.6" />
              <path d="M21 16l-5-5-8 9" />
            </svg>
          </div>
        )}
      </div>
      <div className={styles.caption}>
        <b className={styles.title}>{album.title}</b>
        {details && <span className={styles.details}>{details}</span>}
      </div>
    </a>
  );
}
