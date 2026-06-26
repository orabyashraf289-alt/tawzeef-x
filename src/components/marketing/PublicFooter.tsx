import { Link } from "react-router-dom";
import { Github, Linkedin, Twitter, Mail } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import tawzeefLogo from "@/assets/tawzeef-x-logo.png";

export default function PublicFooter() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  const sections = [
    {
      title: t("marketing.footer.product"),
      links: [
        { href: "/features", label: t("marketing.nav.features") },
        { href: "/pricing", label: t("marketing.nav.pricing") },
        { href: "/careers", label: t("marketing.footer.browseJobs") },
        { href: "/portal", label: t("marketing.footer.candidatePortal") },
      ],
    },
    {
      title: t("marketing.footer.company"),
      links: [
        { href: "/about", label: t("marketing.nav.about") },
        { href: "/blog", label: t("marketing.nav.blog") },
        { href: "/contact", label: t("marketing.nav.contact") },
      ],
    },
    {
      title: t("marketing.footer.resources"),
      links: [
        { href: "/install", label: t("marketing.footer.installApp") },
        { href: "/auth?mode=signup", label: t("marketing.footer.signup") },
        { href: "/auth?mode=login", label: t("marketing.nav.login") },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-card/30">
      <div className="container mx-auto max-w-7xl px-6 py-16">
        <div className="grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img src={tawzeefLogo} alt="Tawzeef-X" className="w-9 h-9 object-contain" />
              <span className="font-bold text-xl text-foreground">Tawzeef-X</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              {t("marketing.footer.tagline")}
            </p>
            <div className="flex items-center gap-2 mt-5">
              <a href="mailto:support@tawzeef-x.com" className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors" aria-label="Email">
                <Mail className="w-4 h-4" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors" aria-label="LinkedIn">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors" aria-label="Twitter">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors" aria-label="GitHub">
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="font-bold text-sm text-foreground mb-4">{section.title}</h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            © {year} Tawzeef-X. {t("marketing.footer.rights")}
          </p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">{t("marketing.footer.privacy")}</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">{t("marketing.footer.terms")}</Link>
            <a href="mailto:support@tawzeef-x.com" className="hover:text-foreground transition-colors">{t("marketing.footer.support")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
