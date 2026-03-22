import { type FormEvent, useState } from "react";

import { routes } from "../app/router/routes";
import { httpClient } from "../shared/api/httpClient";
import { setAdminSession } from "../shared/auth/adminSession";
import type { LoginResponse } from "../shared/types/auth";
import { navigateTo } from "../shared/utils/navigation";
import { isValidEmail } from "../shared/utils/validators";

import styles from "./AdminLoginPage.module.css";

export function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPath = (() => {
    const next = new URLSearchParams(window.location.search).get("next");
    return next?.startsWith("/") ? next : routes.admin;
  })();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setError("Ingresa un email válido.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await httpClient.postJson<
        LoginResponse,
        { email: string; password: string }
      >("auth/login", {
        email: normalizedEmail,
        password,
      });

      const ok = setAdminSession(response.token);
      if (!ok) {
        setError("No se pudo iniciar sesión. Intenta nuevamente.");
        return;
      }

      navigateTo(nextPath, { replace: true });
    } catch {
      setError("Credenciales inválidas o sesión no autorizada.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-label="Acceso administrativo">
        <header className={styles.header}>
          <h1 className={styles.brand}>GALERIA FUTBOL</h1>
          <p className={styles.subtitle}>Acceso restringido al panel</p>
        </header>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="admin-email">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              inputMode="email"
              maxLength={120}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="admin-password">
              Contraseña
            </label>
            <div className={styles.passwordField}>
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                className={`${styles.input} ${styles.passwordInput}`}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                maxLength={128}
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((value) => !value)}
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                aria-pressed={showPassword}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={styles.passwordToggleIcon}
                  aria-hidden="true"
                >
                  <path
                    d="M2.2 12s3.6-6 9.8-6 9.8 6 9.8 6-3.6 6-9.8 6-9.8-6-9.8-6Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="3.1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  {showPassword ? null : (
                    <path
                      d="M4 20 20 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            className={styles.button}
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Validando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className={styles.hint}>
          La sesión se guarda en memoria + sessionStorage para minimizar
          exposición a XSS persistente.
        </p>
      </section>
    </main>
  );
}
