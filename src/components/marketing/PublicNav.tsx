import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Menu, X, Globe, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import tawzeefLogo from "@/assets/tawzeef-x-logo.png";

export default function PublicNav() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  const links = [
    { href: "/", labelKey: "marketing.nav.home" },
    { href: "/features", labelKey: "marketing.nav.features" },
    { href: "/pricing", labelKey: "marketing.nav.pricing" },
    { href: "/about", labelKey: "marketing.nav.about" },
    { href: "/blog", labelKey: "marketing.nav.blog" },
    { href: "/contact", labelKey: "marketing.nav.contact" },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 inset-x-0 z-50"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4">
        <div className="bg-background/75 backdrop-blur-2xl border border-border/50 rounded-2xl px-4 sm:px-6 h-14 flex items-center justify-between shadow-sm">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
            <span className="text-base font-bold text-foreground hidden sm:inline">Tawzeef-X</span>
          </Link>

          <div className="hidden lg:flex items-center gap-7 text-sm text-muted-foreground">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "relative py-1 transition-colors hover:text-foreground",
                    active && "text-foreground font-semibold"
                  )}
                >
                  {t(link.labelKey)}
                  {active && (
                    <motion.span
                      layoutId="public-nav-underline"
                      className="absolute -bottom-0.5 inset-x-0 h-0.5 bg-primary rounded-full"
                    />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
              aria-label="Toggle language"
              className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              {locale === "ar" ? "EN" : "عربي"}
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
              className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link to="/auth?mode=login" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-sm h-9">{t("marketing.nav.login")}</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm" className="text-sm h-9 gradient-primary border-0 text-primary-foreground rounded-xl">
                {t("marketing.nav.signup")}
              </Button>
            </Link>
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <motion.aside
            initial={{ x: locale === "ar" ? "100%" : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: locale === "ar" ? "100%" : "-100%" }}
            className={cn(
              "absolute top-0 h-full w-72 bg-card shadow-2xl flex flex-col p-5",
              locale === "ar" ? "right-0" : "left-0"
            )}
          >
            <div className="flex items-center justify-between mb-6">
              <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "block px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {t(link.labelKey)}
                </Link>
              ))}
            </nav>
            <div className="space-y-2 pt-4 border-t border-border">
              <button
                onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted"
              >
                <Globe className="w-4 h-4" /> {locale === "ar" ? "English" : "العربية"}
              </button>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {theme === "dark" ? t("theme.light") : t("theme.dark")}
              </button>
              <Link to="/auth?mode=login" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">{t("marketing.nav.login")}</Button>
              </Link>
              <Link to="/auth?mode=signup" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full gradient-primary border-0 text-primary-foreground">
                  {t("marketing.nav.signup")}
                </Button>
              </Link>
            </div>
          </motion.aside>
        </div>
      )}
    </motion.nav>
  );
}
