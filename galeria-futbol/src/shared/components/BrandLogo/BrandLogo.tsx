import styles from "./BrandLogo.module.css";

type BrandLogoProps = {
  compact?: boolean;
};

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <div className={styles.brand} data-compact={compact}>
      <span className={styles.mark} aria-hidden="true">
        <span className={styles.markCore} />
      </span>
      <span className={styles.text}>GALERIA FUTBOL</span>
    </div>
  );
}
