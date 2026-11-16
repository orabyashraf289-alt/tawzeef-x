import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Copy, Check, Download, AlertCircle, CheckCircle2, ExternalLink, Code2, Search, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  generateIndeedXmlFeed,
  generateGoogleJobsJsonLd,
  validateFeedHealth,
  type FeedJobItem,
} from "@/lib/jobFeedGenerator";

interface JobFeedsHubProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: FeedJobItem[];
  companyName?: string;
}

export default function JobFeedsHub({ open, onOpenChange, jobs, companyName }: JobFeedsHubProps) {
  const [activeTab, setActiveTab] = useState<string>("indeed");
  const [copiedFeed, setCopiedFeed] = useState(false);
  const [copiedJsonLd, setCopiedJsonLd] = useState(false);

  const activeJobs = useMemo(() => {
    return jobs.filter((j) => j.status === "open" || j.status === "نشطة");
  }, [jobs]);

  const [selectedJobId, setSelectedJobId] = useState<string>(
    activeJobs[0]?.id || jobs[0]?.id || ""
  );

  const selectedJob = useMemo(() => {
    return jobs.find((j) => j.id === selectedJobId) || activeJobs[0] || jobs[0];
  }, [jobs, selectedJobId, activeJobs]);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://tawzeefx.com";
  const feedUrl = `${origin}/feeds/indeed.xml`;

  const xmlFeedString = useMemo(() => {
    return generateIndeedXmlFeed(jobs, {
      publisherName: companyName || "توظيف إكس - TawzeefX",
      publisherUrl: origin,
      defaultCompany: companyName || "شركة معتمدة",
      baseUrl: origin,
    });
  }, [jobs, companyName, origin]);

  const jsonLdData = useMemo(() => {
    if (!selectedJob) return null;
    return generateGoogleJobsJsonLd(selectedJob, {
      companyName: companyName || "شركة معتمدة",
      baseUrl: origin,
    });
  }, [selectedJob, companyName, origin]);

  const healthReport = useMemo(() => {
    return validateFeedHealth(jobs);
  }, [jobs]);

  const handleCopyFeedUrl = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopiedFeed(true);
    toast({ title: "تم نسخ رابط التغذية ✅", description: feedUrl });
    setTimeout(() => setCopiedFeed(false), 2000);
  };

  const handleCopyJsonLd = () => {
    if (!jsonLdData) return;
    navigator.clipboard.writeText(JSON.stringify(jsonLdData, null, 2));
    setCopiedJsonLd(true);
    toast({ title: "تم نسخ كود Schema.org ✅" });
    setTimeout(() => setCopiedJsonLd(false), 2000);
  };

  const handleDownloadXml = () => {
    const blob = new Blob([xmlFeedString], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `indeed-bayt-feed-${new Date().toISOString().slice(0, 10)}.xml`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast({ title: "تم تحميل ملف XML الخلاصات ✅" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black">
                مركز خلاصات التوظيف (Indeed & Google for Jobs & Bayt)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                توليد خلاصات XML المهيكلة وهيكلة Schema.org لنشر الشواغر تلقائياً على محركات البحث ومنصات التوظيف
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Top Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-xl border border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-lg">
              {activeJobs.length}
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">الوظائف النشطة</div>
              <div className="text-[11px] text-muted-foreground">مؤهلة للمزامنة الفورية</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg ${
                healthReport.score >= 80
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-amber-500/10 text-amber-600"
              }`}
            >
              {healthReport.score}%
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">معدل صحة الخلاصات</div>
              <div className="text-[11px] text-muted-foreground">
                {healthReport.warnings.length === 0 ? "جاهزة للنشر 100%" : `${healthReport.warnings.length} تنبيهات تحسين`}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end">
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300 py-1 px-3 text-xs gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Indeed XML v2 & Schema.org جاهز</span>
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2 space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="indeed" className="text-xs font-bold">
              خلاصة Indeed و Bayt (XML)
            </TabsTrigger>
            <TabsTrigger value="google" className="text-xs font-bold">
              Google for Jobs (JSON-LD)
            </TabsTrigger>
            <TabsTrigger value="health" className="text-xs font-bold">
              تدقيق المعايير ({healthReport.warnings.length})
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs font-bold">
              معاينة SERP المباشرة
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Indeed & Bayt XML */}
          <TabsContent value="indeed" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>رابط خلاصة الوظائف بتنسيق Indeed XML v2 المعتمد</span>
                  <Badge variant="secondary" className="text-[11px]">Auto-Sync Feed</Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  يمكنك تزويد هذا الرابط لممثلي Indeed أو Bayt.com لمزامنة الشواغر تلقائياً كل 2-4 ساعات.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 bg-background p-2.5 rounded-lg border border-border/80">
                  <input
                    type="text"
                    readOnly
                    value={feedUrl}
                    className="flex-1 bg-transparent text-xs font-mono text-foreground focus:outline-none"
                    dir="ltr"
                  />
                  <Button size="sm" variant="secondary" onClick={handleCopyFeedUrl} className="gap-1.5 text-xs h-8">
                    {copiedFeed ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedFeed ? "تم النسخ" : "نسخ الرابط"}</span>
                  </Button>
                  <Button size="sm" onClick={handleDownloadXml} className="gap-1.5 text-xs h-8">
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل .xml</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold flex items-center gap-1">
                      <Code2 className="w-3.5 h-3.5 text-primary" />
                      معاينة كود XML المتولد لحظياً ({activeJobs.length} وظيفة):
                    </span>
                    <span>تنسيق UTF-8 مع حماية CDATA</span>
                  </div>
                  <pre
                    className="bg-muted/70 p-3 rounded-lg text-[11px] font-mono overflow-x-auto max-h-60 text-foreground border border-border/50"
                    dir="ltr"
                  >
                    {xmlFeedString.slice(0, 1800) + (xmlFeedString.length > 1800 ? "\n\n<!-- المزيد من الوظائف... -->" : "")}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Google for Jobs JSON-LD */}
          <TabsContent value="google" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>Schema.org JobPosting كود المهيكلة لـ Google</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      يتم حقن هذه البيانات تلقائياً في صفحة التقديم العامة لتظهر الوظيفة في نتائج بحث Google for Jobs.
                    </CardDescription>
                  </div>
                  <div className="w-full sm:w-64">
                    <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue placeholder="اختر وظيفة للمعاينة" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs.map((j) => (
                          <SelectItem key={j.id} value={j.id} className="text-xs">
                            {j.title} ({j.department || "عام"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {jsonLdData && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-foreground">
                        كود JSON-LD المجهز للوظيفة: {selectedJob?.title}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handleCopyJsonLd} className="gap-1.5 text-xs h-8">
                          {copiedJsonLd ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedJsonLd ? "تم النسخ" : "نسخ كود JSON-LD"}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => window.open("https://search.google.com/test/rich-results", "_blank")}
                          className="gap-1.5 text-xs h-8"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>أداة اختبار نتائج Google</span>
                        </Button>
                      </div>
                    </div>
                    <pre
                      className="bg-muted/70 p-3 rounded-lg text-[11px] font-mono overflow-x-auto max-h-64 text-foreground border border-border/50"
                      dir="ltr"
                    >
                      {JSON.stringify(jsonLdData, null, 2)}
                    </pre>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Feed Health Audit */}
          <TabsContent value="health" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>تقرير فحص جودة النشر والامتثال لمحركات البحث</span>
                  <Badge
                    variant="outline"
                    className={
                      healthReport.score === 100
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-amber-50 text-amber-700 border-amber-300"
                    }
                  >
                    درجة التوافق: {healthReport.score} / 100
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  يتحقق الفحص من اكتمال عناصر الترتيب الأفضل في خوارزميات Google و Indeed (الوصف، المدينة، المسمى الواضح).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {healthReport.warnings.length === 0 ? (
                  <div className="p-6 text-center bg-emerald-500/10 rounded-xl border border-emerald-500/20 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <div className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                      ممتاز! جميع الوظائف المنشورة مستوفية 100% لمعايير Indeed و Google Jobs
                    </div>
                    <p className="text-xs text-muted-foreground">
                      المسميات الوظيفية واضحة، والمواقع محددة، والأوصاف تلبي الحد الأدنى المطلوب للفهرسة السريعة.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {healthReport.warnings.map((w, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <div>
                            <span className="font-bold text-foreground">{w.jobTitle}: </span>
                            <span className="text-muted-foreground">{w.issue}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-background">
                          تحسين مطلوب
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Live SERP Preview */}
          <TabsContent value="preview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Google for Jobs Card */}
              <Card className="border border-border/80 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <span className="text-blue-500 font-black">G</span>
                      <span className="text-red-500 font-black">o</span>
                      <span className="text-amber-500 font-black">o</span>
                      <span className="text-blue-500 font-black">g</span>
                      <span className="text-green-500 font-black">l</span>
                      <span className="text-red-500 font-black">e</span>
                      <span>for Jobs</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">SERP Card</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedJob ? (
                    <div className="p-3 bg-muted/40 rounded-lg border border-border/60 space-y-2">
                      <div className="text-sm font-bold text-blue-600 hover:underline cursor-pointer">
                        {selectedJob.title}
                      </div>
                      <div className="text-xs text-foreground font-medium">
                        {selectedJob.company_name || companyName || "شركة معتمدة"} • {selectedJob.location || "الرياض، المملكة العربية السعودية"}
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {selectedJob.type || "دوام كامل"}
                        </Badge>
                        {selectedJob.salary_min && (
                          <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30">
                            من {selectedJob.salary_min} ر.س شهرياً
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">تقديم مباشر</Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground line-clamp-2 pt-1">
                        {selectedJob.description || "انضم لفريقنا المتميز في بيئة عمل محفزة..."}
                      </div>
                      <Button size="sm" className="w-full text-xs h-7 mt-2 bg-blue-600 hover:bg-blue-700">
                        التقديم عبر توظيف إكس (Apply)
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">لا توجد وظائف محددة</p>
                  )}
                </CardContent>
              </Card>

              {/* Indeed Card */}
              <Card className="border border-border/80 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <span className="text-indigo-600 font-black text-sm">indeed</span>
                      <span>Card Preview</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">XML Syndication</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedJob ? (
                    <div className="p-3 bg-muted/40 rounded-lg border border-border/60 space-y-2">
                      <div className="text-sm font-bold text-indigo-700 hover:underline cursor-pointer">
                        {selectedJob.title}
                      </div>
                      <div className="text-xs text-foreground font-medium">
                        {selectedJob.company_name || companyName || "شركة معتمدة"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedJob.location || "الرياض"}
                      </div>
                      <div className="flex gap-1.5 pt-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {selectedJob.type || "دوام كامل"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-200">
                          التقديم السريع Easily Apply
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground line-clamp-2 pt-1">
                        {selectedJob.description}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">لا توجد وظائف محددة</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}