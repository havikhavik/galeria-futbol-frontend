import { BrandLogo } from "../BrandLogo/BrandLogo";
import styles from "./Footer.module.css";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.info}>
          <BrandLogo compact />
          <p className={styles.copyright}>
            © {currentYear} Galería Fútbol. Todos los derechos reservados.
          </p>
        </div>

        <div className={styles.right}>
          <a
            href="https://www.instagram.com/galeria_futboll?igsh=cXV6MjgxdjJydHgz"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram de Galería Fútbol"
            className={styles.socialButton}
          >
            <svg
              className={styles.socialIcon}
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
          </a>
        </div>
      </div>
    </footer>
  );
}
