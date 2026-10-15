import { useState } from "react";

import { toAppPath } from "../../../app/router/routes";
import type { AlbumResponse } from "../../../shared/types/albums";
import { normalizeSeasonLabel } from "../../../shared/utils/formatters";
import { categoryDisplayName } from "../catalogTaxonomy";

import styles from "./AlbumTile.module.css";

type AlbumTileProps = {
  album: AlbumResponse;
};

export function AlbumTile({ album }: AlbumTileProps) {
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
    <a href={toAppPath(`/albums/${album.id}`)} className={styles.tile}>
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
            <svg viewBox="0 0 24 24" className={styles.fallbackIcon}>
              <path
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
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
