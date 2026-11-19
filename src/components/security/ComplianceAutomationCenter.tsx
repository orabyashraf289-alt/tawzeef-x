import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Download,
  FileJson,
  FileSpreadsheet,
  KeyRound,
  Lock,
  Printer,
  RefreshCw,
  Scale,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompany } from "@/contexts/CompanyContext";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "@/hooks/use-toast";
import {
  buildComplianceCsvReport,
  buildCompliancePrintableHtml,
  evaluateComplianceReadiness,
  loadComplianceSchedule,
  saveComplianceSchedule,
  type ComplianceFramework,
  type ComplianceReportSchedule,
  type ReportCadence,
} from "@/lib/complianceEngine";
import {
  decryptSensitiveValue,
  encryptSensitiveValue,
  loadTenantEncryptionPolicy,
  maskSensitiveValue,
  saveTenantEncryptionPolicy,
  type SensitiveFieldKey,
  type TenantEncryptionPolicy,
} from "@/lib/e2eEncryption";
import { openPrintableHtml } from "@/lib/documentFonts";
import { cn } from "@/lib/utils";

interface ComplianceAutomationCenterProps {
  auditEventsCount?: number;
  failedLoginsCount?: number;
  suspiciousEventsCount?: number;
}

const SENSITIVE_FIELD_LABELS: Array<{ key: SensitiveFieldKey; labelAr: string; labelEn: string }> = [
  { key: "national_id", labelAr: "رقم الهوية الوطنية / الإقامة", labelEn: "National ID / Iqama" },
  { key: "phone", labelAr: "رقم الجوال الشخصي", labelEn: "Personal Phone Number" },
  { key: "email", labelAr: "البريد الإلكتروني الشخصي", labelEn: "Personal Email" },
  { key: "expected_salary", labelAr: "الراتب المتوقع والتفاصيل المالية", labelEn: "Expected Compensation" },
  { key: "notes", labelAr: "ملاحظات التقييم السرية", labelEn: "Confidential Evaluation Notes" },
  { key: "license_number", labelAr: "رقم الرخصة المهنية (ETEC)", labelEn: "Professional License Number" },
];

export default function ComplianceAutomationCenter({
  auditEventsCount = 0,
  failedLoginsCount = 0,
  suspiciousEventsCount = 0,
}: ComplianceAutomationCenterProps) {
  const { locale } = useI18n();
  const isAr = locale !== "en";
  const { activeCompany, activeCompanyId } = useCompany();
  const companyName = activeCompany?.name || "توظيف إكس";

  const [frameworkFilter, setFrameworkFilter] = useState<"ALL" | ComplianceFramework>("ALL");
  const [encryptionPolicy, setEncryptionPolicy] = useState<TenantEncryptionPolicy>(() =>
    loadTenantEncryptionPolicy(activeCompanyId),
  );
  const [schedule, setSchedule] = useState<ComplianceReportSchedule>(() =>
    loadComplianceSchedule(activeCompanyId),
  );

  // Interactive AES-256-GCM verification sandbox state
  const [sandboxInput, setSandboxInput] = useState("1098456321 — مرشح سري");
  const [sandboxKey, setSandboxKey] = useState("TawzeefX-Vault-2026!");
  const [sandboxCipher, setSandboxCipher] = useState("");
  const [sandboxDecrypted, setSandboxDecrypted] = useState("");
  const [cryptoBusy, setCryptoBusy] = useState(false);

  const compliance = useMemo(
    () =>
      evaluateComplianceReadiness(
        {
          auditEventsCount,
          failedLoginsCount,
          suspiciousEventsCount,
          hasRetentionPolicy: true,
          hasRbacMatrix: true,
          encryptionPolicy,
        },
        activeCompanyId,
      ),
    [auditEventsCount, failedLoginsCount, suspiciousEventsCount, encryptionPolicy, activeCompanyId],
  );

  const visibleControls = useMemo(
    () =>
      frameworkFilter === "ALL"
        ? compliance.controls
        : compliance.controls.filter((c) => c.framework === frameworkFilter),
    [compliance.controls, frameworkFilter],
  );

  const downloadBlob = (content: string, mime: string, filename: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportReport = (format: "json" | "csv" | "pdf") => {
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === "json") {
      downloadBlob(
        JSON.stringify({ company: companyName, ...compliance }, null, 2),
        "application/json;charset=utf-8",
        `tawzeefx-compliance-${stamp}.json`,
      );
    } else if (format === "csv") {
      const csv = "\uFEFF" + buildComplianceCsvReport(compliance, companyName);
      downloadBlob(csv, "text/csv;charset=utf-8", `tawzeefx-compliance-${stamp}.csv`);
    } else {
      const html = buildCompliancePrintableHtml(compliance, companyName);
      openPrintableHtml(html);
    }

    const updated = saveComplianceSchedule(
      { ...schedule, lastGeneratedAt: new Date().toISOString() },
      activeCompanyId,
    );
    setSchedule(updated);
    toast({
      title: isAr ? "تم توليد تقرير الامتثال بنجاح ✅" : "Compliance report generated",
    });
  };

  const handleSaveSchedule = (patch: Partial<ComplianceReportSchedule>) => {
    const next = saveComplianceSchedule({ ...schedule, ...patch }, activeCompanyId);
    setSchedule(next);
    toast({
      title: isAr ? "تم تحديث جدولة تقارير الامتثال التلقائية" : "Automated compliance schedule saved",
    });
  };

  const handleToggleEncryptedField = (field: SensitiveFieldKey) => {
    const exists = encryptionPolicy.encryptedFields.includes(field);
    const nextFields = exists
      ? encryptionPolicy.encryptedFields.filter((f) => f !== field)
      : [...encryptionPolicy.encryptedFields, field];
    const next = saveTenantEncryptionPolicy(
      { ...encryptionPolicy, encryptedFields: nextFields },
      activeCompanyId,
    );
    setEncryptionPolicy(next);
    toast({
      title: isAr ? "تم تحديث نطاق التشفير الشامل (E2E)" : "E2E encryption scope updated",
    });
  };

  const handleRotateKey = () => {
    const next = saveTenantEncryptionPolicy(
      {
        ...encryptionPolicy,
        keyVersion: encryptionPolicy.keyVersion + 1,
        lastRotatedAt: new Date().toISOString(),
      },
      activeCompanyId,
    );
    setEncryptionPolicy(next);
    toast({
      title: isAr
        ? `تم تدوير مفتاح التشفير إلى الإصدار v${next.keyVersion}`
        : `Encryption key rotated to v${next.keyVersion}`,
    });
  };

  const handleSandboxEncrypt = async () => {
    setCryptoBusy(true);
    try {
      const cipher = await encryptSensitiveValue(sandboxInput, sandboxKey);
      setSandboxCipher(cipher);
      setSandboxDecrypted("");
    } catch (err: unknown) {
      toast({
        title: isAr ? "تعذّر التشفير" : "Encryption error",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setCryptoBusy(false);
    }
  };

  const handleSandboxDecrypt = async () => {
    if (!sandboxCipher) return;
    setCryptoBusy(true);
    try {
      const plain = await decryptSensitiveValue(sandboxCipher, sandboxKey);
      setSandboxDecrypted(plain);
    } catch {
      toast({
        title: isAr ? "فشل فك التشفير — المفتاح غير مطابق أو البيانات معدّلة" : "Decryption failed — wrong key or tampered data",
        variant: "destructive",
      });
    } finally {
      setCryptoBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top 4-Column Compliance KPI Bento Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">
                {isAr ? "نسبة الامتثال الإجمالية" : "Overall Compliance"}
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-emerald-700 dark:text-emerald-400">
              {compliance.overallScore}%
            </div>
            <Progress value={compliance.overallScore} className="h-1.5" />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">SOC 2 Type II</span>
              <Badge variant="outline" className="text-[10px]">TSC</Badge>
            </div>
            <div className="text-3xl font-black text-foreground">{compliance.soc2Score}%</div>
            <p className="text-[11px] text-muted-foreground">
              {isAr ? "الأمان، التوافر، المراقبة، التشفير" : "Security, Availability, Monitoring"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">
                {isAr ? "نظام حماية البيانات (PDPL)" : "Saudi PDPL / GDPR"}
              </span>
              <Scale className="w-4 h-4 text-primary" />
            </div>
            <div className="text-3xl font-black text-foreground">{compliance.pdplScore}%</div>
            <p className="text-[11px] text-muted-foreground">
              {isAr ? "الاحتفاظ، التجهيل، موافقات المرشحين" : "Retention, Anonymization, Consent"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">
                {isAr ? "تشفير AES-256-GCM" : "E2E AES-256-GCM"}
              </span>
              <Lock className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-foreground">
              {encryptionPolicy.enabled
                ? isAr
                  ? `${encryptionPolicy.encryptedFields.length} حقول محمية`
                  : `${encryptionPolicy.encryptedFields.length} fields`
                : isAr
                ? "متوقف"
                : "Paused"}
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              PBKDF2-SHA256 • Key v{encryptionPolicy.keyVersion}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="controls" className="space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-xl h-auto flex flex-wrap gap-1">
          <TabsTrigger value="controls" className="text-xs font-bold gap-1.5 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5" />
            {isAr ? "ضوابط SOC 2 و PDPL" : "SOC 2 & PDPL Controls"}
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs font-bold gap-1.5 rounded-lg">
            <CalendarClock className="w-3.5 h-3.5" />
            {isAr ? "تقارير الامتثال التلقائية" : "Automated Reports"}
          </TabsTrigger>
          <TabsTrigger value="encryption" className="text-xs font-bold gap-1.5 rounded-lg">
            <Lock className="w-3.5 h-3.5" />
            {isAr ? "خزنة التشفير الشامل (E2E)" : "E2E Encryption Vault"}
          </TabsTrigger>
        </TabsList>

        {/* SUB-TAB 1: SOC 2 Type II & PDPL Controls Matrix */}
        <TabsContent value="controls" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1.5">
              {(["ALL", "SOC2", "PDPL"] as const).map((fw) => (
                <Button
                  key={fw}
                  type="button"
                  size="sm"
                  variant={frameworkFilter === fw ? "default" : "outline"}
                  onClick={() => setFrameworkFilter(fw)}
                  className="h-8 text-xs font-bold rounded-full"
                >
                  {fw === "ALL" ? (isAr ? "جميع الضوابط" : "All Controls") : fw}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => handleExportReport("pdf")} className="h-8 text-xs gap-1.5">
                <Printer className="w-3.5 h-3.5" />
                {isAr ? "طباعة شهادة امتثال PDF" : "Print Audit PDF"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleExportReport("csv")} className="h-8 text-xs gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleExportReport("json")} className="h-8 text-xs gap-1.5">
                <FileJson className="w-3.5 h-3.5" />
                JSON Evidence
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visibleControls.map((control) => (
              <Card key={control.id} className="border-border/60">
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-[11px] font-bold">
                        {control.code}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {control.framework}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {isAr ? control.pillarAr : control.pillarEn}
                      </span>
                    </div>
                    <Badge
                      className={cn(
                        "text-[10px] gap-1 shrink-0",
                        control.status === "compliant"
                          ? "bg-emerald-600 text-white hover:bg-emerald-600"
                          : control.status === "monitoring"
                          ? "bg-amber-500 text-white hover:bg-amber-500"
                          : "bg-rose-600 text-white hover:bg-rose-600",
                      )}
                    >
                      {control.status === "compliant" ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      {control.status === "compliant"
                        ? isAr
                          ? "متوافق"
                          : "Compliant"
                        : control.status === "monitoring"
                        ? isAr
                          ? "قيد المراقبة"
                          : "Monitoring"
                        : isAr
                        ? "يتطلب إجراء"
                        : "Action Needed"}
                    </Badge>
                  </div>

                  <h3 className="text-sm font-bold text-foreground">
                    {isAr ? control.titleAr : control.titleEn}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed bg-muted/35 p-2.5 rounded-lg">
                    {isAr ? control.evidenceAr : control.evidenceEn}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SUB-TAB 2: Automated Compliance Reporting */}
        <TabsContent value="reports">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <Card className="xl:col-span-7 border-border/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-primary" />
                  {isAr ? "جدولة تقارير الامتثال التلقائية" : "Automated Compliance Report Schedule"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isAr
                    ? "تجهيز وإرسال حزمة أدلة SOC 2 Type II و PDPL بشكل دوري لفريق الحوكمة والتدقيق."
                    : "Automatically assemble periodic SOC 2 Type II and PDPL evidence packs."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3.5">
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      {isAr ? "تفعيل التوليد الدوري للتقارير" : "Enable Periodic Generation"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {isAr ? "توليد حزمة تدقيق جاهزة بختم زمني موثق" : "Generate timestamped audit packs"}
                    </p>
                  </div>
                  <Switch
                    checked={schedule.enabled}
                    onCheckedChange={(checked) => handleSaveSchedule({ enabled: checked })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="compliance-cadence" className="text-xs font-bold">
                      {isAr ? "دورية الإصدار" : "Reporting Cadence"}
                    </Label>
                    <select
                      id="compliance-cadence"
                      value={schedule.cadence}
                      onChange={(e) => handleSaveSchedule({ cadence: e.target.value as ReportCadence })}
                      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs font-semibold"
                    >
                      <option value="weekly">{isAr ? "أسبوعي (كل أحد)" : "Weekly"}</option>
                      <option value="monthly">{isAr ? "شهري (أول كل شهر)" : "Monthly"}</option>
                      <option value="quarterly">{isAr ? "ربع سنوي (Q1-Q4)" : "Quarterly"}</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="compliance-recipients" className="text-xs font-bold">
                      {isAr ? "بريد مسؤولي الامتثال والتدقيق" : "Audit Recipients Email"}
                    </Label>
                    <Input
                      id="compliance-recipients"
                      type="text"
                      dir="ltr"
                      placeholder="dpo@company.com, audit@company.com"
                      value={schedule.recipients}
                      onChange={(e) => setSchedule({ ...schedule, recipients: e.target.value })}
                      onBlur={() => handleSaveSchedule({ recipients: schedule.recipients })}
                      className="h-10 text-xs"
                    />
                  </div>
                </div>

                {schedule.lastGeneratedAt && (
                  <p className="text-xs text-muted-foreground">
                    {isAr ? "آخر تقرير تم توليده:" : "Last generated:"}{" "}
                    <strong className="text-foreground">
                      {new Date(schedule.lastGeneratedAt).toLocaleString(isAr ? "ar-SA" : "en-US")}
                    </strong>
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="xl:col-span-5 border-border/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="w-4 h-4 text-primary" />
                  {isAr ? "تصدير حزمة الأدلة الفورية" : "Export Evidence Pack Now"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isAr
                    ? "اختر الصيغة المناسبة للتسليم للمدقق الخارجي أو هيئة سدايا / PDPL."
                    : "Choose your preferred format for external auditors or DPO review."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <Button onClick={() => handleExportReport("pdf")} className="w-full justify-start gap-2 text-xs font-bold">
                  <Printer className="w-4 h-4" />
                  {isAr ? "تقرير امتثال رسمي قابل للطباعة (PDF)" : "Official Printable Compliance Report (PDF)"}
                </Button>
                <Button variant="outline" onClick={() => handleExportReport("csv")} className="w-full justify-start gap-2 text-xs font-bold">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  {isAr ? "مصفوفة الضوابط والأدلة (CSV / Excel)" : "Controls & Evidence Matrix (CSV)"}
                </Button>
                <Button variant="outline" onClick={() => handleExportReport("json")} className="w-full justify-start gap-2 text-xs font-bold">
                  <FileJson className="w-4 h-4 text-indigo-500" />
                  {isAr ? "حزمة تدقيق مهيكلة (JSON Evidence)" : "Machine-Readable Audit Bundle (JSON)"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SUB-TAB 3: E2E AES-256-GCM Encryption Vault */}
        <TabsContent value="encryption">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <Card className="xl:col-span-6 border-border/60">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
                      {isAr ? "سياسة التشفير الشامل للحقول الحساسة (E2E)" : "End-to-End Sensitive Field Policy"}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {isAr
                        ? "تشفير حقول المرشحين والشركات باستخدام AES-256-GCM واشتقاق مفاتيح PBKDF2-SHA256."
                        : "AES-256-GCM authenticated encryption with PBKDF2-SHA256 key derivation."}
                    </CardDescription>
                  </div>
                  <Switch
                    checked={encryptionPolicy.enabled}
                    onCheckedChange={(checked) =>
                      setEncryptionPolicy(
                        saveTenantEncryptionPolicy({ ...encryptionPolicy, enabled: checked }, activeCompanyId),
                      )
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SENSITIVE_FIELD_LABELS.map((field) => {
                    const active = encryptionPolicy.encryptedFields.includes(field.key);
                    return (
                      <div
                        key={field.key}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 p-3"
                      >
                        <span className="text-xs font-semibold text-foreground">
                          {isAr ? field.labelAr : field.labelEn}
                        </span>
                        <Switch
                          checked={active}
                          onCheckedChange={() => handleToggleEncryptedField(field.key)}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
                  <span className="text-muted-foreground font-mono">
                    Key Version: v{encryptionPolicy.keyVersion}
                  </span>
                  <Button type="button" size="sm" variant="outline" onClick={handleRotateKey} className="gap-1.5 text-xs">
                    <RefreshCw className="w-3.5 h-3.5" />
                    {isAr ? "تدوير مفتاح المنشأة" : "Rotate Tenant Key"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="xl:col-span-6 border-border/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-500" />
                  {isAr ? "مختبر التحقق الحي من تشفير AES-256-GCM" : "Live AES-256-GCM Verification Sandbox"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isAr
                    ? "اختبر تشفير وفك تشفير أي بيان حساس فعلياً داخل المتصفح عبر Web Crypto API."
                    : "Test real Web Crypto API encryption and authenticated decryption right in the browser."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="sandbox-plain" className="text-xs font-bold">
                      {isAr ? "القيمة الحساسة (مثال: هوية وطنية)" : "Sensitive Plaintext"}
                    </Label>
                    <Input
                      id="sandbox-plain"
                      value={sandboxInput}
                      onChange={(e) => setSandboxInput(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sandbox-pass" className="text-xs font-bold">
                      {isAr ? "عبارة مفتاح المنشأة" : "Tenant Vault Passphrase"}
                    </Label>
                    <Input
                      id="sandbox-pass"
                      type="password"
                      value={sandboxKey}
                      onChange={(e) => setSandboxKey(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={() => void handleSandboxEncrypt()} disabled={cryptoBusy} className="gap-1.5 text-xs">
                    <Lock className="w-3.5 h-3.5" />
                    {isAr ? "تشفير AES-256-GCM" : "Encrypt AES-256-GCM"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleSandboxDecrypt()}
                    disabled={cryptoBusy || !sandboxCipher}
                    className="gap-1.5 text-xs"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    {isAr ? "فك التشفير والتحقق" : "Decrypt & Verify"}
                  </Button>
                </div>

                {sandboxCipher && (
                  <div className="space-y-2 rounded-xl bg-muted/40 border border-border/60 p-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground block">
                        {isAr ? "الغلاف المشفّر (يُخزّن في قاعدة البيانات):" : "Encrypted Envelope:"}
                      </span>
                      <code className="block break-all font-mono text-[11px] text-primary mt-0.5" data-testid="e2e-cipher-output">
                        {sandboxCipher}
                      </code>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground block">
                        {isAr ? "الظهور المقنّع في السجلات:" : "Audit Log Redacted View:"}
                      </span>
                      <span className="font-mono text-[11px]">{maskSensitiveValue(sandboxCipher)}</span>
                    </div>
                  </div>
                )}

                {sandboxDecrypted && (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-700 dark:text-emerald-300 font-semibold" data-testid="e2e-decrypted-output">
                    ✓ {isAr ? "تم فك التشفير والتحقق من سلامة البيانات:" : "Verified decrypted value:"} {sandboxDecrypted}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
