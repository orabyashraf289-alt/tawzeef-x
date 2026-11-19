import { useMemo, useState } from "react";
import { Check, Copy, FileText, Globe2, Printer, Scale, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompany } from "@/contexts/CompanyContext";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "@/hooks/use-toast";
import { printWithFonts } from "@/lib/documentFonts";
import {
  buildPrintableContractHtml,
  REGIONAL_CONTRACT_TEMPLATES,
  renderRegionalContract,
  type ContractJurisdiction,
} from "@/lib/regionalContractTemplates";
import {
  loadRegionalSettings,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
} from "@/lib/regionalSettings";
import type { JobOffer } from "@/hooks/useOffers";
import { cn } from "@/lib/utils";

interface RegionalContractsHubProps {
  offers?: Array<JobOffer & { candidates?: { name?: string | null } | null }>;
}

const TEMPLATE_LIST = Object.values(REGIONAL_CONTRACT_TEMPLATES);

export default function RegionalContractsHub({ offers = [] }: RegionalContractsHubProps) {
  const { locale } = useI18n();
  const isAr = locale !== "en";
  const { activeCompany, activeCompanyId } = useCompany();
  const regional = useMemo(() => loadRegionalSettings(activeCompanyId), [activeCompanyId]);

  const [jurisdiction, setJurisdiction] = useState<ContractJurisdiction>("KSA_QIWA");
  const [companyName, setCompanyName] = useState(activeCompany?.name || "شركة توظيف إكس للتقنية");
  const [employeeName, setEmployeeName] = useState(offers[0]?.candidates?.name || "سعود بن فهد العتيبي");
  const [jobTitle, setJobTitle] = useState(offers[0]?.position || "مهندس برمجيات أول");
  const [workLocation, setWorkLocation] = useState("الرياض، المملكة العربية السعودية");
  const [monthlySalary, setMonthlySalary] = useState<number>(Number(offers[0]?.salary) || 18000);
  const [currency, setCurrency] = useState<CurrencyCode>(regional.currency || "SAR");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [contractMonths, setContractMonths] = useState<number>(12);
  const [probationDays, setProbationDays] = useState<number>(90);
  const [annualLeaveDays, setAnnualLeaveDays] = useState<number>(21);
  const [noticeDays, setNoticeDays] = useState<number>(60);
  const [copied, setCopied] = useState(false);

  const handleSelectJurisdiction = (id: ContractJurisdiction) => {
    const tpl = REGIONAL_CONTRACT_TEMPLATES[id];
    setJurisdiction(id);
    setCurrency(tpl.defaultCurrency);
    setProbationDays(tpl.defaultProbationDays);
    setAnnualLeaveDays(tpl.defaultAnnualLeaveDays);
    setNoticeDays(tpl.defaultNoticeDays);
  };

  const handleAutofillFromOffer = (offerId: string) => {
    const offer = offers.find((o) => o.id === offerId);
    if (!offer) return;
    if (offer.candidates?.name) setEmployeeName(offer.candidates.name);
    if (offer.position) setJobTitle(offer.position);
    if (offer.salary) setMonthlySalary(Number(offer.salary) || monthlySalary);
    if (offer.start_date) setStartDate(offer.start_date.slice(0, 10));
    toast({ title: isAr ? "تم تعبئة بيانات العقد من العرض الوظيفي" : "Contract auto-filled from offer" });
  };

  const contractVars = useMemo(
    () => ({
      companyName,
      employeeName,
      jobTitle,
      workLocation,
      monthlySalary,
      currency,
      startDate,
      contractMonths,
      probationDays,
      annualLeaveDays,
      noticeDays,
      calendarMode: regional.calendarMode,
    }),
    [
      companyName,
      employeeName,
      jobTitle,
      workLocation,
      monthlySalary,
      currency,
      startDate,
      contractMonths,
      probationDays,
      annualLeaveDays,
      noticeDays,
      regional.calendarMode,
    ],
  );

  const rendered = useMemo(
    () => renderRegionalContract(jurisdiction, contractVars, locale),
    [jurisdiction, contractVars, locale],
  );

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(rendered.plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: isAr ? "تم نسخ نص العقد القانوني بنجاح" : "Contract text copied" });
    } catch {
      toast({ title: isAr ? "تعذّر النسخ للحافظة" : "Copy failed", variant: "destructive" });
    }
  };

  const handlePrintPdf = () => {
    const html = buildPrintableContractHtml(rendered, contractVars, locale);
    printWithFonts(html);
  };

  return (
    <div className="space-y-5">
      {/* Jurisdiction Picker Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {TEMPLATE_LIST.map((tpl) => {
          const active = tpl.id === jurisdiction;
          return (
            <button
              key={tpl.id}
              type="button"
              aria-pressed={active}
              onClick={() => handleSelectJurisdiction(tpl.id)}
              className={cn(
                "p-3.5 rounded-xl border-2 text-start transition-all space-y-1.5 bg-card",
                active
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "border-border/60 hover:border-border hover:bg-muted/20",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant={active ? "default" : "secondary"} className="text-[10px] font-mono">
                  {tpl.countryCode} • {tpl.defaultCurrency}
                </Badge>
                <Scale className={cn("w-4 h-4", active ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div className="text-xs font-bold text-foreground line-clamp-2">
                {isAr ? tpl.titleAr : tpl.titleEn}
              </div>
            </button>
          );
        })}
      </div>

      {/* 2-Column Bento Editor + Live Contract Document Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left/Right Editor Form */}
        <Card className="xl:col-span-5 border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              {isAr ? "بيانات العقد والبنود النظامية" : "Contract Details & Statutory Terms"}
            </CardTitle>
            <CardDescription className="text-xs">
              {isAr
                ? "مرتبط تلقائياً بإعدادات التقويم الهجري والعملة من التخصيص الإقليمي."
                : "Automatically synced with your Regional Hijri & Currency settings."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 text-xs">
            {offers.length > 0 && (
              <div className="space-y-1 rounded-xl bg-primary/5 border border-primary/20 p-3">
                <Label htmlFor="autofill-offer" className="text-xs font-bold flex items-center gap-1.5 text-primary">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isAr ? "تعبئة تلقائية من عرض وظيفي قائم:" : "Auto-fill from existing offer:"}
                </Label>
                <select
                  id="autofill-offer"
                  defaultValue=""
                  onChange={(e) => handleAutofillFromOffer(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-xs"
                >
                  <option value="">{isAr ? "— اختر عرضاً لتعبئة الحقول —" : "— Select an offer —"}</option>
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.candidates?.name || "مرشح"} — {o.position}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{isAr ? "اسم المنشأة (الطرف الأول)" : "Employer Name"}</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{isAr ? "اسم الموظف (الطرف الثاني)" : "Employee Name"}</Label>
                <Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{isAr ? "المسمى الوظيفي" : "Job Title"}</Label>
                <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{isAr ? "مقر العمل" : "Work Location"}</Label>
                <Input value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{isAr ? "الراتب الشهري" : "Monthly Salary"}</Label>
                <Input
                  type="number"
                  min={0}
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(Math.max(0, Number(e.target.value) || 0))}
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{isAr ? "العملة" : "Currency"}</Label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs font-semibold"
                >
                  {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({isAr ? c.symbolAr : c.symbolEn})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{isAr ? "تاريخ المباشرة" : "Start Date"}</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 text-xs font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{isAr ? "مدة العقد (أشهر)" : "Duration (Months)"}</Label>
                <Input
                  type="number"
                  min={1}
                  value={contractMonths}
                  onChange={(e) => setContractMonths(Math.max(1, Number(e.target.value) || 12))}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">{isAr ? "التجربة (يوم)" : "Probation (d)"}</Label>
                <Input
                  type="number"
                  min={0}
                  value={probationDays}
                  onChange={(e) => setProbationDays(Math.max(0, Number(e.target.value) || 0))}
                  className="h-8 text-xs font-mono text-center"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">{isAr ? "الإجازة (يوم)" : "Leave (d)"}</Label>
                <Input
                  type="number"
                  min={0}
                  value={annualLeaveDays}
                  onChange={(e) => setAnnualLeaveDays(Math.max(0, Number(e.target.value) || 0))}
                  className="h-8 text-xs font-mono text-center"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">{isAr ? "الإشعار (يوم)" : "Notice (d)"}</Label>
                <Input
                  type="number"
                  min={0}
                  value={noticeDays}
                  onChange={(e) => setNoticeDays(Math.max(0, Number(e.target.value) || 0))}
                  className="h-8 text-xs font-mono text-center"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Contract Preview Document */}
        <Card className="xl:col-span-7 border-border/60">
          <CardHeader className="pb-3 border-b border-border/60 flex flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-black text-foreground flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-primary shrink-0" />
                <span>{rendered.title}</span>
              </CardTitle>
              <CardDescription className="text-xs mt-1">{rendered.lawReference}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => void handleCopyText()} className="h-8 text-xs gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? (isAr ? "تم النسخ" : "Copied") : isAr ? "نسخ النص" : "Copy"}
              </Button>
              <Button type="button" size="sm" onClick={handlePrintPdf} className="h-8 text-xs gap-1.5">
                <Printer className="w-3.5 h-3.5" />
                {isAr ? "تصدير / طباعة PDF" : "Export / Print PDF"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-muted/40 border border-border/50 p-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">{isAr ? "تاريخ المباشرة (هجري / ميلادي):" : "Effective Start Date:"}</span>
                <strong className="text-foreground" data-testid="contract-date-preview">{rendered.formattedStartDate}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">{isAr ? "الأجر الشهري المعتمد:" : "Monthly Compensation:"}</span>
                <strong className="text-primary" data-testid="contract-salary-preview">{rendered.formattedSalary}</strong>
              </div>
            </div>

            <div className="space-y-4">
              {rendered.renderedClauses.map((clause) => (
                <div key={clause.heading} className="space-y-1">
                  <h4 className="text-xs font-extrabold text-primary">{clause.heading}</h4>
                  <p className="text-xs text-foreground/90 leading-7">{clause.body}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
