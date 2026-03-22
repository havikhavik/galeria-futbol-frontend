import { useEffect, useState } from "react";

import { routes, toAppPath } from "../../../app/router/routes";
import { httpClient } from "../../../shared/api/httpClient";
import type { FeaturedCollectionWithAlbumsApi } from "../../../shared/types/collections";

import styles from "./FeaturedCollectionsCarousel.module.css";

type FeaturedCollectionItem = {
  slug: string;
  title: string;
  description?: string | null;
  bannerImage: string;
  priority: number;
  albumsCount: number;
};

type FeaturedCollectionApiItem = Omit<FeaturedCollectionItem, "albumsCount">;

export function FeaturedCollectionsCarousel() {
  const [items, setItems] = useState<FeaturedCollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response =
          await httpClient.getJson<FeaturedCollectionApiItem[]>("featured");
        if (!cancelled) {
          const sorted = [...(response ?? [])].sort((left, right) => {
            const leftPriority = Number(left.priority);
            const rightPriority = Number(right.priority);

            if (
              Number.isFinite(leftPriority) &&
              Number.isFinite(rightPriority) &&
              leftPriority !== rightPriority
            ) {
              return leftPriority - rightPriority;
            }

            return left.title.localeCompare(right.title, "es", {
              sensitivity: "base",
            });
          });

          const topCollections = sorted.slice(0, 3);
          const withAlbumsCount = await Promise.all(
            topCollections.map(async (item) => {
              try {
                const details =
                  await httpClient.getJson<FeaturedCollectionWithAlbumsApi>(
                    `featured/${item.slug}`,
                  );

                return {
                  ...item,
                  albumsCount: details.albums?.length ?? 0,
                };
              } catch {
                return {
                  ...item,
                  albumsCount: 0,
                };
              }
            }),
          );

          if (!cancelled) {
            setItems(withAlbumsCount);
          }
        }
      } catch {
        if (!cancelled) {
          setItems([]);
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
  }, []);

  const toCollectionResultsHref = (slug: string) =>
    toAppPath(`${routes.search}?featured=${encodeURIComponent(slug)}`);

  const formatAlbumsCount = (count: number) =>
    `${count} ${count === 1 ? "camiseta" : "camisetas"}`;

  if (isLoading || items.length === 0) {
    return null;
  }

  const gridClassByCount =
    items.length === 1
      ? styles.gridOne
      : items.length === 2
        ? styles.gridTwo
        : styles.gridThree;

  return (
    <section className={styles.section} aria-label="Colecciones destacadas">
      <div className={styles.container}>
        <header className={styles.headerRow}>
          <div className={styles.headerContent}>
            <p className={styles.kicker}>Colecciones destacadas</p>
            <h2 className={styles.heading}>Lo más buscado ahora</h2>
          </div>
        </header>

        {items.length === 1 ? (
          <div className={styles.singleLayout}>
            {items.map((item) => (
              <a
                key={item.slug}
                href={toCollectionResultsHref(item.slug)}
                className={`${styles.card} ${styles.cardLink}`}
                aria-label={`Ver colección ${item.title}`}
              >
                {item.bannerImage ? (
                  <img
                    src={item.bannerImage}
                    alt={item.title}
                    className={styles.image}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className={styles.neutralBackground}
                    aria-hidden="true"
                  />
                )}

                <div className={styles.overlay} />

                <div className={styles.content}>
                  <h2 className={styles.title}>{item.title}</h2>
                  <p className={styles.metaLine}>
                    {formatAlbumsCount(item.albumsCount)}
                  </p>
                </div>
              </a>
            ))}

            <aside
              className={styles.explorePanel}
              aria-label="Explorar galeria"
            >
              <h3 className={styles.exploreTitle}>
                Más colecciones próximamente
              </h3>
              <p className={styles.exploreDescription}>
                Seguimos sumando camisetas y temporadas.
              </p>
            </aside>
          </div>
        ) : (
          <div className={`${styles.grid} ${gridClassByCount}`}>
            {items.map((item, index) => {
              const cardClass =
                items.length === 3 && index === 0
                  ? `${styles.card} ${styles.cardPrimary}`
                  : styles.card;

              return (
                <a
                  key={item.slug}
                  href={toCollectionResultsHref(item.slug)}
                  className={`${cardClass} ${styles.cardLink}`}
                  aria-label={`Ver colección ${item.title}`}
                >
                  {item.bannerImage ? (
                    <img
                      src={item.bannerImage}
                      alt={item.title}
                      className={styles.image}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      className={styles.neutralBackground}
                      aria-hidden="true"
                    />
                  )}

                  <div className={styles.overlay} />

                  <div className={styles.content}>
                    <h2 className={styles.title}>{item.title}</h2>
                    <p className={styles.metaLine}>
                      {formatAlbumsCount(item.albumsCount)}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
