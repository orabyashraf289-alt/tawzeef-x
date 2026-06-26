import { ReactNode } from "react";
import PublicNav from "./PublicNav";
import PublicFooter from "./PublicFooter";
import { useI18n } from "@/contexts/I18nContext";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  const { dir } = useI18n();
  return (
    <div className="min-h-screen bg-background flex flex-col" dir={dir}>
      <PublicNav />
      <main className="flex-1 pt-20">{children}</main>
      <PublicFooter />
    </div>
  );
}
