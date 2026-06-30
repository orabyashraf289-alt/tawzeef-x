import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  setTheme: () => {},
  resolvedTheme: "light",
  primaryColor: "160 84% 25%",
  setPrimaryColor: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("tawzeef-x-theme") as Theme | null;
    return stored || "light";
  });

  const [primaryColor, setPrimaryColorState] = useState<string>(() => {
    return localStorage.getItem("tawzeef-x-primary") || "160 84% 25%";
  });

  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
    localStorage.setItem("tawzeef-x-theme", theme);
    
    // Apply primary color HSL value to document root
    root.style.setProperty("--primary", primaryColor);
  }, [theme, resolvedTheme, primaryColor]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setThemeState("system"); // triggers re-render
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  
  const setPrimaryColor = (color: string) => {
    localStorage.setItem("tawzeef-x-primary", color);
    setPrimaryColorState(color);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, primaryColor, setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
}
