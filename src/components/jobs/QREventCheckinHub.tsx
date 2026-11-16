import { useState, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrCode, Copy, Check, Download, Printer, Users, ExternalLink, Calendar, MapPin, Sparkles, Building2, MonitorSmartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "@/hooks/use-toast";
import type { FeedJobItem } from "@/lib/jobFeedGenerator";
import { useCandidates } from "@/hooks/useJobs";

interface QREventCheckinHubProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: FeedJobItem[];
  companyName?: string;
}

export default function QREventCheckinHub({
  open,
  onOpenChange,
  jobs,
  companyName = "توظيف إكس",
}: QREventCheckinHubProps) {
  const [activeTab, setActiveTab] = useState<string>("poster");
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || "general");
  const [eventName, setEventName] = useState<string>("معرض التوظيف السنوي - الرياض");
  const [eventLocation, setEventLocation] = useState<string>("مركز المعارض والمؤتمرات");
  const [copiedLink, setCopiedLink] = useState(false);

  const posterRef = useRef<HTMLDivElement>(null);

  const selectedJob = useMemo(() => {
    if (selectedJobId === "general") {
      return {
        id: "general",
        title: "التقديم العام المباشر لجميع التخصصات",
        department: "كافة الأقسام",
        location: "المملكة العربية السعودية",
        description: "استقبال السير الذاتية لكافة الشواغر الحالية والمستقبلية.",
      };
    }
    return jobs.find((j) => j.id === selectedJobId) || jobs[0];
  }, [jobs, selectedJobId]);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://tawzeefx.com";
  const checkinUrl = `${origin}/checkin/${selectedJob?.id || "general"}?event=${encodeURIComponent(
    eventName
  )}`;

  // Candidates list who checked in via Event QR
  const { data: allCandidates = [] } = useCandidates();
  const eventCandidates = useMemo(() => {
    return allCandidates.filter((c) => {
      const src = (c.source || "").toLowerCase();
      const sum = (c.summary || "").toLowerCase();
      const trk = (c.tracking_code || "").toLowerCase();
      return (
        src.includes("qr") ||
        src.includes("معرض") ||
        src.includes("checkin") ||
        sum.includes("معرض") ||
        sum.includes("فعالية")
      );
    });
  }, [allCandidates]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(checkinUrl);
    setCopiedLink(true);
    toast({ title: "تم نسخ رابط التقديم المباشر للفعالية ✅", description: checkinUrl });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrintPoster = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "يرجى السماح بالنوافذ المنبثقة للطباعة", variant: "destructive" });
      return;
    }

    const posterHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>ملصق الفعالية - ${companyName}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 90vh;
            text-align: center;
            color: #0f172a;
          }
          .card {
            border: 4px solid #0284c7;
            border-radius: 28px;
            padding: 40px 30px;
            max-width: 650px;
            width: 100%;
            box-sizing: border-box;
            background: #ffffff;
            box-shadow: 0 10px 25px rgba(0,0,0,0.08);
          }
          .badge {
            display: inline-block;
            background: #e0f2fe;
            color: #0369a1;
            padding: 8px 18px;
            border-radius: 50px;
            font-size: 15px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .company {
            font-size: 30px;
            font-weight: 900;
            color: #0f172a;
            margin: 0 0 10px 0;
          }
          .job-title {
            font-size: 24px;
            font-weight: bold;
            color: #0284c7;
            margin: 10px 0 25px 0;
            border-bottom: 2px dashed #cbd5e1;
            padding-bottom: 15px;
          }
          .qr-box {
            padding: 20px;
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 20px;
            display: inline-block;
            margin: 15px 0;
          }
          .scan-prompt {
            font-size: 20px;
            font-weight: bold;
            color: #1e293b;
            margin: 15px 0 5px 0;
          }
          .sub {
            font-size: 15px;
            color: #64748b;
            margin-bottom: 25px;
          }
          .footer {
            font-size: 12px;
            color: #94a3b8;
            margin-top: 20px;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">🎯 ${eventName}</div>
          <div class="company">${companyName}</div>
          <div class="job-title">${selectedJob?.title || "تقديم مباشر"}</div>
          <div class="qr-box">
            <svg id="qr-svg" width="280" height="280"></svg>
          </div>
          <div class="scan-prompt">امسح الرمز بكاميرا جوالك وقدم في 15 ثانية! ⚡</div>
          <div class="sub">${eventLocation} • استقبال فوري للسير الذاتية</div>
          <div class="footer">مدعوم بنظام التوظيف الذكي — TawzeefX</div>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
        <script>
          QRCode.toString("${checkinUrl}", { type: 'svg', width: 280, margin: 1 }, function (err, string) {
            if (!err) {
              document.querySelector('.qr-box').innerHTML = string;
              setTimeout(function() { window.print(); }, 400);
            }
          });
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(posterHtml);
    printWindow.document.close();
  };

  const handleExportCsv = () => {
    if (eventCandidates.length === 0) {
      toast({ title: "لا يوجد مسجلين بعد للتصدير" });
      return;
    }
    const headers = ["الاسم", "البريد الإلكتروني", "الجوال", "الوظيفة / التخصص", "الحالة", "تاريخ التسجيل"];
    const rows = eventCandidates.map((c) => [
      c.name,
      c.email,
      c.phone,
      c.role || c.jobs?.title || "",
      c.status,
      new Date(c.created_at).toLocaleString("ar-SA"),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.map((f) => `"${f || ""}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `event-candidates-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast({ title: "تم تصدير سجل المتقدمين عبر الفعالية ✅" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black">
                مركز التقديم السريع بالفعاليات والـ QR (Job Fairs Check-in)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                توليد ملصقات المعارض والتوظيف الفوري بالـ QR ومتابعة المرشحين القادمين من ملتقيات التوظيف
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Top Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-xl border border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-black text-lg">
              {eventCandidates.length}
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">مسجلو الفعاليات</div>
              <div className="text-[11px] text-muted-foreground">مرشحون مسجلون عبر الـ QR</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black text-lg">
              15 ثانية
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">زمن التقديم السريع</div>
              <div className="text-[11px] text-muted-foreground">بدون إنشاء حساب مسبق</div>
            </div>
          </div>
          <div className="flex items-center justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(checkinUrl, "_blank")}
              className="gap-1.5 text-xs h-9 font-bold bg-background text-indigo-600 hover:text-indigo-700"
            >
              <MonitorSmartphone className="w-4 h-4" />
              <span>تجربة شاشة المرشح (Live Demo)</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2 space-y-4">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="poster" className="text-xs font-bold gap-1.5">
              <QrCode className="w-4 h-4" />
              <span>منشئ ملصق الفعالية والـ QR</span>
            </TabsTrigger>
            <TabsTrigger value="attendees" className="text-xs font-bold gap-1.5">
              <Users className="w-4 h-4" />
              <span>سجل المتقدمين بالمعرض ({eventCandidates.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Poster Builder */}
          <TabsContent value="poster" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Controls */}
              <div className="space-y-3.5">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold">إعدادات ملصق الفعالية</CardTitle>
                    <CardDescription className="text-xs">
                      خصص معلومات الجناح والوظيفة ليتم تضمينها في رمز الاستجابة السريع
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        الوظيفة المستهدفة
                      </label>
                      <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                        <SelectTrigger className="text-xs h-9">
                          <SelectValue placeholder="اختر الوظيفة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general" className="text-xs font-bold">
                            🌟 تقديم عام مفتوح (General Application)
                          </SelectItem>
                          {jobs.map((j) => (
                            <SelectItem key={j.id} value={j.id} className="text-xs">
                              {j.title} ({j.department || "عام"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        اسم الفعالية أو المعرض
                      </label>
                      <Input
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                        placeholder="مثال: ملتقى بيبان 2026 أو يوم المهنة"
                        className="text-xs h-9"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        موقع الفعالية / رقم الجناح (Booth)
                      </label>
                      <Input
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        placeholder="مثال: جناح رقم B-14، مركز الرياض للمعارض"
                        className="text-xs h-9"
                      />
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <Button onClick={handlePrintPoster} className="w-full gap-2 text-xs font-bold h-9">
                        <Printer className="w-4 h-4" />
                        <span>طباعة ملصق المعرض (A4 / Roll-up)</span>
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handleCopyLink}
                        className="w-full gap-2 text-xs font-bold h-9"
                      >
                        {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedLink ? "تم نسخ الرابط" : "نسخ رابط التقديم المباشر"}</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Live Poster Preview */}
              <div className="flex flex-col items-center justify-center">
                <div
                  ref={posterRef}
                  className="w-full max-w-sm bg-card border-2 border-primary/40 rounded-2xl p-5 shadow-lg flex flex-col items-center text-center relative overflow-hidden"
                >
                  <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-primary via-indigo-500 to-purple-500" />
                  
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] mb-2 font-bold">
                    🎯 {eventName}
                  </Badge>

                  <h3 className="text-lg font-black text-foreground">{companyName}</h3>
                  <p className="text-xs font-bold text-primary mt-0.5 mb-3">
                    {selectedJob?.title || "تقديم مباشر"}
                  </p>

                  {/* QR Box */}
                  <div className="p-3 bg-white rounded-xl shadow-inner border border-border/60 my-1">
                    <QRCodeSVG
                      value={checkinUrl}
                      size={180}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  <p className="text-xs font-black text-foreground mt-3">
                    امسح الرمز وقدم سيرتك في 15 ثانية! ⚡
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {eventLocation}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-border/40 w-full flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>TawzeefX Event Engine</span>
                    <span>استقبال فوري</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: Attendees List */}
          <TabsContent value="attendees" className="space-y-4">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">سجل المرشحين المسجلين عبر QR الفعاليات</CardTitle>
                  <CardDescription className="text-xs">
                    قائمة فورية بجميع الزوار الذين قاموا بمسح الرمز وتقديم سيرهم الذاتية أثناء الفعالية
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={handleExportCsv} className="gap-1.5 text-xs h-8">
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير Excel / CSV</span>
                </Button>
              </CardHeader>
              <CardContent>
                {eventCandidates.length === 0 ? (
                  <div className="p-8 text-center bg-muted/30 rounded-xl border border-dashed border-border/80 space-y-2">
                    <QrCode className="w-8 h-8 text-muted-foreground mx-auto" />
                    <div className="text-xs font-bold text-foreground">لا يوجد متقدمون مسجلون عبر الـ QR حتى الآن</div>
                    <p className="text-[11px] text-muted-foreground">
                      اطبع ملصق الفعالية وضعه على طاولة جناحك في المعرض ليبدأ المرشحون بمسحه والتسجيل الفوري.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {eventCandidates.map((c) => (
                      <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-foreground flex items-center gap-2">
                            <span>{c.name}</span>
                            <Badge variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40">
                              QR Event
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-3 mt-0.5">
                            <span>📞 {c.phone}</span>
                            <span>✉️ {c.email}</span>
                            <span>💼 {c.role || c.jobs?.title || "تقديم عام"}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-[10px]">
                            {c.status || "جديد"}
                          </Badge>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(c.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}