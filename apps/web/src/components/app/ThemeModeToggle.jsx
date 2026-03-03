"use client";

import { useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { applyTheme, getCurrentTheme, toggleTheme } from "@/lib/themeMode";

export default function ThemeModeToggle({ className = "", showLabel = true }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const current = getCurrentTheme();
    setTheme(current);
    applyTheme(current);
    setMounted(true);
  }, []);

  const isDark = theme === "dark";
  const label = useMemo(() => (isDark ? "Light mode" : "Dark mode"), [isDark]);

  if (!mounted) return null;

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={() => setTheme(toggleTheme())}
      aria-label={label}
    >
      {isDark ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
      {showLabel ? label : null}
    </Button>
  );
}

