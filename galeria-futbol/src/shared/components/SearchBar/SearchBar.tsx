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
      <button
        type="submit"
        className={styles.iconButton}
        aria-label="Buscar camisetas"
      >
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <circle cx="10" cy="10" r="6" />
          <line x1="14.5" y1="14.5" x2="20" y2="20" />
        </svg>
      </button>
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
    </form>
  );
}
