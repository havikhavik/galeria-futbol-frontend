import { toAppPath } from "./appPath";

function commitNavigation(url: URL, replace: boolean): void {
  const destination = url.toString();
  if (replace) {
    window.location.replace(destination);
    return;
  }
  window.location.assign(destination);
}

export function navigateTo(
  path: string,
  { replace = false, clearSearch = true }: { replace?: boolean; clearSearch?: boolean } = {},
): void {
  const url = new URL(window.location.href);
  url.pathname = toAppPath(path);

  if (clearSearch) {
    url.search = "";
  }
  commitNavigation(url, replace);
}

export function navigateWithCurrentUrl(
  mutate: (url: URL) => void,
  { replace = false }: { replace?: boolean } = {},
): void {
  const url = new URL(window.location.href);
  mutate(url);
  commitNavigation(url, replace);
}
