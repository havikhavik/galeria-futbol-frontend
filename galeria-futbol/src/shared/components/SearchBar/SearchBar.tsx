import { type FormEvent, useId, useState } from "react";

import styles from "./SearchBar.module.css";

type SearchBarProps = {
  placeholder?: string;
  /** Starting text when uncontrolled. */
  initialValue?: string;
  /** Controlled text. When set, `onChange` receives every keystroke. */
  value?: string;
  onChange?: (value: string) => void;
  /** Called with the trimmed text on Enter. */
  onSubmit?: (value: string) => void;
};

export function SearchBar({
  placeholder = "Buscar camisetas...",
  initialValue = "",
  value,
  onChange,
  onSubmit,
}: SearchBarProps) {
  const [ownValue, setOwnValue] = useState(initialValue);
  const inputId = useId();
  const isControlled = value !== undefined;
  const query = isControlled ? value : ownValue;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.(query.trim());
  };

  return (
    <form className={styles.search} onSubmit={handleSubmit} role="search">
      <label htmlFor={inputId} className={styles.srOnly}>
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
        id={inputId}
        name="search"
        type="search"
        value={query}
        onChange={(event) => {
          if (!isControlled) setOwnValue(event.target.value);
          onChange?.(event.target.value);
        }}
        className={styles.input}
        placeholder={placeholder}
        autoComplete="off"
      />
    </form>
  );
}
