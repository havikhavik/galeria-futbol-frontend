import { type FormEvent, useState } from "react";

import styles from "./SearchBar.module.css";

type SearchBarProps = {
  placeholder?: string;
  initialValue?: string;
  onSubmit?: (value: string) => void;
};

export function SearchBar({
  placeholder = "Buscar camisetas...",
  initialValue = "",
  onSubmit,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.(query.trim());
  };

  return (
    <form className={styles.search} onSubmit={handleSubmit} role="search">
      <label htmlFor="home-search" className={styles.srOnly}>
        Buscar camisetas
      </label>
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <circle cx="10" cy="10" r="6" />
          <line x1="14.5" y1="14.5" x2="20" y2="20" />
        </svg>
      </span>
      <input
        id="home-search"
        name="search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={styles.input}
        placeholder={placeholder}
        autoComplete="off"
      />
      <button
        type="submit"
        className={styles.filterButton}
        aria-label="Aplicar filtros"
      >
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M4 6h16" />
          <path d="M7 12h10" />
          <path d="M10 18h4" />
        </svg>
      </button>
    </form>
  );
}
