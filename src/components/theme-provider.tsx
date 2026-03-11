"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeName = "driftwood" | "seasalt" | "linen" | "golden";

const DEFAULT_THEME: ThemeName = "driftwood";

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);

  useEffect(() => {
    // Read from localStorage on mount (cookie already applied FOUC script)
    const stored = localStorage.getItem("betterreads-theme") as ThemeName | null;
    if (stored && ["driftwood", "seasalt", "linen", "golden"].includes(stored)) {
      setThemeState(stored);
    }
  }, []);

  function setTheme(name: ThemeName) {
    setThemeState(name);
    document.documentElement.setAttribute("data-theme", name);
    localStorage.setItem("betterreads-theme", name);
    document.cookie = `betterreads-theme=${name}; path=/; max-age=31536000; SameSite=Lax`;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
