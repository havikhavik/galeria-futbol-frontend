import styles from "./Footer.module.css";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <p className={styles.copyright}>© {currentYear} Galería Fútbol</p>
        <a
          href="https://www.instagram.com/galeria_futboll?igsh=cXV6MjgxdjJydHgz"
          target="_blank"
          rel="noreferrer"
          className={styles.instagram}
        >
          <svg
            className={styles.instagramIcon}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect
              x="3.5"
              y="3.5"
              width="17"
              height="17"
              rx="5"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle
              cx="12"
              cy="12"
              r="4"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" />
          </svg>
          Seguinos en Instagram
        </a>
      </div>
    </footer>
  );
}
