export const THEME_STORAGE_KEY = "dobook_theme";
export const THEME_EXPLICIT_KEY = "dobook_theme_explicit";

export function normalizeTheme(value) {
  const s = String(value || "").trim().toLowerCase();
  if (s === "dark" || s === "light") return s;
  return null;
}

export function getPreferredTheme() {
  if (typeof window === "undefined") return "light";
  const explicit = window.localStorage.getItem(THEME_EXPLICIT_KEY) === "1";
  if (!explicit) return "light";
  return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY)) || "light";
}

export function getCurrentTheme() {
  if (typeof document === "undefined") return "light";
  if (document.documentElement.classList.contains("dark")) return "dark";
  return normalizeTheme(document.documentElement.getAttribute("data-theme")) || "light";
}

export function applyTheme(theme, { persist = false } = {}) {
  if (typeof document === "undefined") return;
  const next = normalizeTheme(theme) || "light";
  document.documentElement.setAttribute("data-theme", next);
  document.documentElement.classList.toggle("dark", next === "dark");
  if (!persist) return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    window.localStorage.setItem(THEME_EXPLICIT_KEY, "1");
  } catch {
    // ignore
  }
}

export function toggleTheme({ persist = true } = {}) {
  const current = getCurrentTheme();
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next, { persist });
  return next;
}
