"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  // Initialize to a deterministic value for SSR to avoid hydration mismatch.
  const [theme, setTheme] = useState("light");

  // On mount, read the actual theme from DOM/localStorage and sync state.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      const dom = document.documentElement.getAttribute("data-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const actual = dom || saved || (prefersDark ? "dark" : "light");
      if (actual && actual !== theme) setTheme(actual);
    } catch {}
  // Run only once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("theme", theme); } catch {}
  }, [theme]);
  return (
    <button className="button secondary" aria-label="Toggle theme" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      {theme === "light" ? "Dark" : "Light"}
    </button>
  );
}



