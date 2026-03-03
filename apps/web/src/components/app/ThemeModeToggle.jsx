"use client";

import { useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "dobook_theme";

function getInitialTheme() {
  if (typeof window === "undefined") return "light";
  const saved = String(window.localStorage.getItem(STORAGE_KEY) || "").trim().toLowerCase();
  if (saved === "dark" || saved === "light") return saved;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  return prefersDark ? "dark" : "light";
}

function applyTheme(theme) {
  if (typeof document === "undefined") return;
  const next = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
}

export default function ThemeModeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState("light");
  const [inIframe, setInIframe] = useState(false);

  useEffect(() => {
    setInIframe(window.parent !== window);
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [mounted, theme]);

  const isDark = theme === "dark";
  const label = useMemo(() => (isDark ? "Light mode" : "Dark mode"), [isDark]);

  if (!mounted) return null;
  if (inIframe) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[1000]">
      <Button
        type="button"
        variant="outline"
        className="h-10 rounded-full bg-white/80 backdrop-blur border-zinc-200 shadow-sm"
        onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        aria-label={label}
      >
        {isDark ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
        {label}
      </Button>
    </div>
  );
}

