import styles from './BrandLogo.module.css';

interface BrandLogoProps {
  /** Versión reducida, usada dentro del Footer. */
  compact?: boolean;
}

/** Logo Percha G: símbolo + «Galería Fútbol». */
export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <div className={styles.brand} data-compact={compact}>
      <svg className={styles.mark} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <path className={styles.hook} d="M38.6 9.2A7 7 0 1 0 39 13H33.5" />
        <path className={styles.line} d="M32 20V27" />
        <path className={styles.body} d="M32 27 7 47.5Q4 52 9.5 52H54.5Q60 52 57 47.5Z" />
      </svg>
      <span className={styles.text}>Galería Fútbol</span>
    </div>
  );
}
