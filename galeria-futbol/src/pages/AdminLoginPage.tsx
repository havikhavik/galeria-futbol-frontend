import { type FormEvent, useState } from "react";

import { routes } from "../app/router/routes";
import { httpClient } from "../shared/api/httpClient";
import { setAdminSession } from "../shared/auth/adminSession";
import { navigateTo } from "../shared/utils/navigation";

import styles from "./AdminLoginPage.module.css";

type LoginResponse = {
  token: string;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
            <input
              id="admin-password"
              type="password"
              className={styles.input}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              maxLength={128}
              required
            />
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
