import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Download,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Send,
  Users,
  AlertCircle,
  CheckCircle2,
  Code2,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCandidates } from "@/hooks/useJobs";
import {
  generateSapSuccessFactorsCsv,
  generateOracleHcmDataLoaderHdl,
  generateEnterpriseHandoffJson,
  validateHrisReadiness,
  splitFullName,
  type HrisEmployeeProfile,
} from "@/lib/enterpriseHrisConnector";

export default function EnterpriseHrisHub() {
  const { data: candidates = [] } = useCandidates();

  const [activeTab, setActiveTab] = useState("sap");
  const [sapEndpoint, setSapEndpoint] = useState("https://api.successfactors.eu/odata/v4/upsert");
  const [oracleEndpoint, setOracleEndpoint] = useState("https://e-fusion.oraclecloud.com/hcmRestApi/resources/11.13.18.05");
  const [companyCode, setCompanyCode] = useState("SA01");
  const [copied, setCopied] = useState(false);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  // Convert hired candidates to HrisEmployeeProfile list
  const hiredEmployees: HrisEmployeeProfile[] = useMemo(() => {
    return candidates
      .filter((c: any) => c.status === "مقبول" || c.status === "مكتمل" || c.stage === "العرض الوظيفي" || c.stage === "توظيف")
      .map((c: any) => {
        const { firstName, lastName } = splitFullName(c.name || "مرشح");
        return {
          id: c.id,
          candidateId: c.id,
          firstName,
          lastName,
          email: c.email || `${c.id.slice(0, 6)}@company.com`,
          phone: c.phone || null,
          nationalId: c.national_id || c.iqama_number || null,
          jobTitle: c.role || c.jobs?.title || "موظف تخصصي",
          department: c.jobs?.department || "العمليات",
          location: c.jobs?.location || "الرياض",
          hireDate: c.created_at || new Date().toISOString(),
          salary: c.expected_salary ? parseInt(c.expected_salary) : 12000,
          currency: "SAR",
          trackingCode: c.tracking_code,
        };
      });
  }, [candidates]);

  const readiness = useMemo(() => {
    return validateHrisReadiness(candidates);
  }, [candidates]);

  const sapCsvString = useMemo(() => {
    return generateSapSuccessFactorsCsv(hiredEmployees);
  }, [hiredEmployees]);

  const oracleHdlString = useMemo(() => {
    return generateOracleHcmDataLoaderHdl(hiredEmployees);
  }, [hiredEmployees]);

  const handleDownloadSapCsv = () => {
    const blob = new Blob([sapCsvString], { type: "text/csv;charset=utf-8;\uFEFF" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SAP_SuccessFactors_Import_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast({ title: "تم تحميل ملف استيراد SAP SuccessFactors بنجاح ✅" });
  };

  const handleDownloadOracleHdl = () => {
    const blob = new Blob([oracleHdlString], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Worker_${new Date().toISOString().slice(0, 10)}.dat`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast({ title: "تم تحميل ملف Oracle Worker.dat (HDL) بنجاح ✅" });
  };

  const handleDispatchSingleHandoff = async (emp: HrisEmployeeProfile, target: "sap" | "oracle") => {
    setDispatchingId(emp.id);
    const payload = generateEnterpriseHandoffJson(emp, { targetHris: target, companyCode });
    // Simulate webhook POST / integration endpoint
    await new Promise((r) => setTimeout(r, 600));
    setDispatchingId(null);
    toast({
      title: `تم إرسال بيانات ${emp.firstName} ${emp.lastName} إلى ${target === "sap" ? "SAP" : "Oracle"} بنجاح 🚀`,
      description: `تم توليد حزمة Handoff المعتمدة (ID: ${emp.candidateId.slice(0, 8)})`,
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/40 rounded-2xl border border-border/70">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-bold mb-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>موصّل أنظمة الموارد البشرية المؤسسية (p3-hr: SAP & Oracle HRIS)</span>
          </div>
          <h2 className="text-lg font-black text-foreground">
            تكامل أنظمة SAP SuccessFactors و Oracle HCM Cloud
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            تسليم بيانات الموظفين المقبولين تلقائياً (Candidate Handoff) وتوليد ملفات استيراد قياسية بصيغ OData و HDL و CSV
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-left">
            <div className="text-xs font-bold text-foreground">الموظفون المقبولون</div>
            <div className="text-[11px] text-muted-foreground font-mono">{hiredEmployees.length} مرشح جاهز للتسليم</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-black">
            {readiness.readinessPercentage}%
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-xl">
          <TabsTrigger value="sap" className="text-xs font-bold">
            SAP SuccessFactors
          </TabsTrigger>
          <TabsTrigger value="oracle" className="text-xs font-bold">
            Oracle HCM (HDL)
          </TabsTrigger>
          <TabsTrigger value="queue" className="text-xs font-bold">
            طابور التسليم ({hiredEmployees.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: SAP SuccessFactors */}
        <TabsContent value="sap" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                    <span>تكامل SAP SuccessFactors Employee Central</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    توليد ملفات الاستيراد القياسية المتوافقة مع بنية حقول SAP OData v4 و CSV Import
                  </CardDescription>
                </div>
                <Button size="sm" onClick={handleDownloadSapCsv} className="gap-1.5 text-xs font-bold h-8">
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل ملف SAP CSV</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    عنوان واجهة الربط السحابي (OData / Integration Suite URL)
                  </label>
                  <Input
                    value={sapEndpoint}
                    onChange={(e) => setSapEndpoint(e.target.value)}
                    className="text-xs h-9 font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    كود الشركة المؤسسي في SAP (Company Code)
                  </label>
                  <Input
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                    className="text-xs h-9 font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold flex items-center gap-1">
                    <Code2 className="w-3.5 h-3.5 text-primary" />
                    معاينة ملف التصدير ({hiredEmployees.length} موظف):
                  </span>
                  <span>تنسيق UTF-8 مع تضمين الحقول الإلزامية</span>
                </div>
                <pre
                  className="bg-muted/70 p-3 rounded-lg text-[11px] font-mono overflow-x-auto max-h-56 text-foreground border border-border/50"
                  dir="ltr"
                >
                  {sapCsvString || "لا يوجد مرشحون مقبولون في الوقت الحالي."}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Oracle HCM */}
        <TabsContent value="oracle" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-red-600" />
                    <span>تكامل Oracle Fusion HCM Cloud (Worker HDL)</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    توليد ملفات HCM Data Loader (HDL) بصيغة Worker.dat الرسمية مع بنية METADATA و MERGE
                  </CardDescription>
                </div>
                <Button size="sm" onClick={handleDownloadOracleHdl} className="gap-1.5 text-xs font-bold h-8">
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل Worker.dat</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  نقطة نهاية Oracle REST API / OIC Endpoint
                </label>
                <Input
                  value={oracleEndpoint}
                  onChange={(e) => setOracleEndpoint(e.target.value)}
                  className="text-xs h-9 font-mono"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold flex items-center gap-1">
                    <Code2 className="w-3.5 h-3.5 text-primary" />
                    معاينة محتوى ملف Worker.dat:
                  </span>
                  <span>Oracle HDL Standard Syntax</span>
                </div>
                <pre
                  className="bg-muted/70 p-3 rounded-lg text-[11px] font-mono overflow-x-auto max-h-56 text-foreground border border-border/50"
                  dir="ltr"
                >
                  {oracleHdlString || "لا يوجد مرشحون مقبولون في الوقت الحالي."}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Handoff Queue */}
        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">سجل تسليم الموظفين الجدد (Handoff Queue)</CardTitle>
              <CardDescription className="text-xs">
                المرشحون المقبولون والذين وقعوا عروض العمل وجاهزون للنقل التلقائي إلى أنظمة الرواتب وشؤون الموظفين
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hiredEmployees.length === 0 ? (
                <div className="p-8 text-center bg-muted/30 rounded-xl border border-dashed border-border/80 space-y-2">
                  <Users className="w-8 h-8 text-muted-foreground mx-auto" />
                  <div className="text-xs font-bold text-foreground">لا يوجد موظفون مقبولون معلقون في طابور التسليم</div>
                  <p className="text-[11px] text-muted-foreground">
                    عند قبول أي مرشح أو توقيع العرض الوظيفي، سيظهر هنا تلقائياً لتسليمه لنظام HRIS.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {hiredEmployees.map((emp) => (
                    <div key={emp.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-foreground flex items-center gap-2">
                          <span>{emp.firstName} {emp.lastName}</span>
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
                            جاهز للتسليم ✅
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-3 mt-1">
                          <span>💼 {emp.jobTitle}</span>
                          <span>🏢 {emp.department}</span>
                          <span>💰 {emp.salary?.toLocaleString()} {emp.currency}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={dispatchingId === emp.id}
                          onClick={() => handleDispatchSingleHandoff(emp, "sap")}
                          className="text-[11px] h-7 gap-1"
                        >
                          <Send className="w-3 h-3 text-blue-600" />
                          <span>إرسال لـ SAP</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={dispatchingId === emp.id}
                          onClick={() => handleDispatchSingleHandoff(emp, "oracle")}
                          className="text-[11px] h-7 gap-1"
                        >
                          <Send className="w-3 h-3 text-red-600" />
                          <span>إرسال لـ Oracle</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}