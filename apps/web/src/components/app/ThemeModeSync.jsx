"use client";

import { useEffect } from "react";
import { applyTheme, getPreferredTheme } from "@/lib/themeMode";

export default function ThemeModeSync() {
  useEffect(() => {
    applyTheme(getPreferredTheme());

    const onStorage = (e) => {
      if (!e) return;
      if (e.key !== "dobook_theme") return;
      applyTheme(e.newValue);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
}

