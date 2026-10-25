import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

function CompanyLogo({ name, url }: { name: string; url: string | null }) {
  const [failed, setFailed] = useState(false);
  let safeUrl: string | null = null;
  try {
    const parsed = new URL(url || "");
    if (parsed.protocol === "https:" && !parsed.username && !parsed.password) safeUrl = parsed.href;
  } catch { /* Missing or invalid logos use the same neutral fallback. */ }

  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-md-surface-container">
      {safeUrl && !failed ? (
        <img src={safeUrl} alt={`شعار ${name}`} loading="lazy" referrerPolicy="no-referrer"
          className="h-16 w-16 object-contain" onError={() => setFailed(true)} />
      ) : <Building2 className="h-9 w-9 text-md-primary" aria-hidden="true" />}
    </div>
  );
}

export function JoinedCompanies() {
  const { data: companies, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ["public-joined-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_joined_companies");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  return (
    <section id="companies" dir="rtl" aria-labelledby="joined-companies-title"
      className="scroll-mt-24 border-y border-md-outline-variant/30 bg-md-surface py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-md-primary-container px-4 py-2 text-sm font-bold text-md-on-primary-container">
            <Building2 className="h-4 w-4" aria-hidden="true" /> مجتمع توظيف إكس
          </span>
          <h2 id="joined-companies-title" className="mb-4 text-3xl font-black text-md-on-surface sm:text-4xl">شركات انضمت إلينا</h2>
          <p className="text-md-on-surface-variant">تعرّف على الشركات التي بدأت رحلتها مع توظيف إكس.</p>
        </div>

        {isPending ? (
          <p role="status" className="py-10 text-center text-md-on-surface-variant">جارٍ تحميل الشركات…</p>
        ) : isError ? (
          <div role="status" className="space-y-4 py-10 text-center">
            <p className="text-md-on-surface-variant">تعذّر تحميل الشركات حاليًا.</p>
            <Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>إعادة المحاولة</Button>
          </div>
        ) : companies?.length ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((company, index) => (
              <li key={`${company.name}-${index}`} className="flex items-center gap-5 rounded-3xl border border-md-outline-variant/40 bg-md-surface-container-low p-6">
                <CompanyLogo key={company.logo_url} name={company.name} url={company.logo_url} />
                <h3 className="min-w-0 break-words text-lg font-bold text-md-on-surface">{company.name}</h3>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-3xl border border-dashed border-md-outline-variant bg-md-surface-container-low px-6 py-12 text-center">
            <Building2 className="mx-auto mb-4 h-10 w-10 text-md-primary" aria-hidden="true" />
            <p className="mb-2 text-xl font-bold text-md-on-surface">ابدأ رحلة شركتك معنا</p>
            <p className="text-md-on-surface-variant">ستظهر هنا الشركات بعد اعتماد انضمامها إلى المنصة.</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <Button asChild size="lg" className="gap-2 rounded-full">
            <Link to="/auth?mode=signup">قدّم طلب انضمام شركتك <ArrowLeft className="h-4 w-4" aria-hidden="true" /></Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
