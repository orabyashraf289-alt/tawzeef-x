import { createTheme, ThemeOptions } from "@mui/material/styles";

export function getMaterialTheme(mode: "light" | "dark" = "light") {
  const isDark = mode === "dark";

  const themeOptions: ThemeOptions = {
    direction: "rtl",
    palette: {
      mode,
      primary: {
        main: isDark ? "#34d399" : "#00695c",
        light: isDark ? "#6ee7b7" : "#338a7c",
        dark: isDark ? "#059669" : "#004d40",
        contrastText: isDark ? "#002114" : "#ffffff",
      },
      secondary: {
        main: isDark ? "#38bdf8" : "#00897b",
        light: isDark ? "#7dd3fc" : "#26a69a",
        dark: isDark ? "#0284c7" : "#00695c",
        contrastText: "#ffffff",
      },
      background: {
        default: isDark ? "#0b1320" : "#f8fafc",
        paper: isDark ? "#111c2e" : "#ffffff",
      },
      text: {
        primary: isDark ? "#f1f5f9" : "#0f172a",
        secondary: isDark ? "#94a3b8" : "#475569",
      },
      divider: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
    },
    typography: {
      fontFamily: [
        "IBM Plex Sans Arabic",
        "Tajawal",
        "Inter",
        "-apple-system",
        "BlinkMacSystemFont",
        "sans-serif",
      ].join(","),
      h1: { fontWeight: 900, letterSpacing: "-0.02em" },
      h2: { fontWeight: 800, letterSpacing: "-0.01em" },
      h3: { fontWeight: 800 },
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      button: { textTransform: "none", fontWeight: 700 },
    },
    shape: {
      borderRadius: 16,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            padding: "8px 20px",
            fontSize: "0.875rem",
            boxShadow: "none",
            "&:hover": {
              boxShadow: "0 2px 8px rgba(0, 105, 92, 0.2)",
            },
          },
          containedPrimary: {
            background: isDark
              ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
              : "linear-gradient(135deg, #00695c 0%, #004d40 100%)",
            color: "#ffffff",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            border: isDark
              ? "1px solid rgba(255, 255, 255, 0.08)"
              : "1px solid rgba(0, 0, 0, 0.06)",
            boxShadow: isDark
              ? "0 4px 20px rgba(0, 0, 0, 0.4)"
              : "0 2px 12px rgba(15, 23, 42, 0.04)",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            fontWeight: 600,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 24,
          },
        },
      },
    },
  };

  return createTheme(themeOptions);
}
