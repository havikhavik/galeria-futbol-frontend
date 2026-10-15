import { useEffect, useMemo, useState } from "react";

const URL_CHANGE_EVENT = "gf:urlchange";

/**
 * Updates the query string in place (no page load) and notifies every
 * `useUrlSearchParams` consumer. `push` adds a history entry.
 */
export function updateUrlSearchParams(
  mutate: (params: URLSearchParams) => void,
  { push = true }: { push?: boolean } = {},
): void {
  const url = new URL(window.location.href);
  mutate(url.searchParams);
  if (url.href === window.location.href) return;

  if (push) window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(URL_CHANGE_EVENT));
}

/** Current query string, kept in sync with in-page updates and back/forward. */
export function useUrlSearchParams(): URLSearchParams {
  const [search, setSearch] = useState(() => window.location.search);

  useEffect(() => {
    const sync = () => setSearch(window.location.search);
    window.addEventListener("popstate", sync);
    window.addEventListener(URL_CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(URL_CHANGE_EVENT, sync);
    };
  }, []);

  return useMemo(() => new URLSearchParams(search), [search]);
}
