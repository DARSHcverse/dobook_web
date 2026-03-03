export const THEME_STORAGE_KEY = "dobook_theme";

export function normalizeTheme(value) {
  const s = String(value || "").trim().toLowerCase();
  if (s === "dark" || s === "light") return s;
  return null;
}

export function getPreferredTheme() {
  if (typeof window === "undefined") return "light";
  const saved = normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  if (saved) return saved;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  return prefersDark ? "dark" : "light";
}

export function getCurrentTheme() {
  if (typeof document === "undefined") return "light";
  if (document.documentElement.classList.contains("dark")) return "dark";
  return normalizeTheme(document.documentElement.getAttribute("data-theme")) || "light";
}

export function applyTheme(theme) {
  if (typeof document === "undefined") return;
  const next = normalizeTheme(theme) || "light";
  document.documentElement.setAttribute("data-theme", next);
  document.documentElement.classList.toggle("dark", next === "dark");
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // ignore
  }
}

export function toggleTheme() {
  const current = getCurrentTheme();
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}
