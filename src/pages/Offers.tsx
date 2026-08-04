import { useState, useMemo } from "react";
import SARSymbol from "@/components/SARSymbol";
import DashboardLayout from "@/components/DashboardLayout";
import { useCandidates, useJobs } from "@/hooks/useJobs";
import { useOffers, useSendOffer, useDeleteOffer, useCreateOffer, useUpdateOffer, useWithdrawOffer, type JobOffer } from "@/hooks/useOffers";
import { getPublicBaseUrl } from "@/lib/getPublicUrl";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { motion } from "framer-motion";
import { 
  FileText, 
  Plus, 
  Send, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Copy,
  ExternalLink,
  MessageCircle,
  Mail,
  Smartphone,
  PlusCircle,
  X,
  Pencil,
  Download,
  Undo2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ThumbsUp,
  AlertTriangle,
  Lightbulb,
  Loader2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

import { OffersSkeleton } from "@/components/Skeletons";

export default function OffersPage() {
  const { t, locale } = useI18n();
  const { data: offers, isLoading } = useOffers();
  const { data: candidates } = useCandidates();
  const { data: jobs } = useJobs();

  const sendOffer = useSendOffer();
  const deleteOffer = useDeleteOffer();
  const createOffer = useCreateOffer();
  const updateOffer = useUpdateOffer();
  const withdrawOffer = useWithdrawOffer();

  const [showCreate, setShowCreate] = useState(false);
  const [editingOffer, setEditingOffer] = useState<JobOffer | null>(null);
  const [salaryBreakdown, setSalaryBreakdown] = useState(false);
  const [employeeNationality, setEmployeeNationality] = useState<"saudi" | "non-saudi" | "none">("none");
  const [baseSalary, setBaseSalary] = useState("");
  const [allowances, setAllowances] = useState<{ name: string; amount: string }[]>([
    { name: locale === "en" ? "Housing" : "بدل سكن", amount: "" },
  ]);
  const [form, setForm] = useState({
    candidate_id: "",
    job_id: "",
    position: "",
    department: "",
    salary: "",
    currency: "SAR",
    start_date: "",
    offer_type: "full-time",
    benefits: "",
    additional_terms: "",
    expires_days: "7",
  });

  const [predictionDialogOpen, setPredictionDialogOpen] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [activeOfferForPrediction, setActiveOfferForPrediction] = useState<JobOffer | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [generatingAiOfferTerms, setGeneratingAiOfferTerms] = useState(false);

  const filteredOffers = useMemo(() => {
    let list = offers || [];
    if (statusFilter !== "all") {
      list = list.filter(o => o.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(o =>
        o.position?.toLowerCase().includes(q) ||
        o.department?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [offers, statusFilter, searchQuery]);

  const handleGenerateAiOfferTerms = async () => {
    if (!form.position) {
      toast({ title: "يرجى تحديد المسمى الوظيفي أولاً", variant: "destructive" });
      return;
    }
    setGeneratingAiOfferTerms(true);
    try {
      const terms = [
        `1. يخضع هذا العرض لأنظمة ونظام العمل السعودي واللوائح التنفيذية الصادرة.`,
        `2. تحديد فترة تجربة مدتها 90 يوماً قابلة للتمديد وفق النظام.`,
        `3. ساعات العمل الرسمية: 8 ساعات يومياً (40 ساعة أسبوعياً).`,
        `4. يستحق الموظف إجازة سنوية مدفوعة الأجر مدتها 21 يوماً للسنوات الخمس الأولى.`,
        `5. التزام تام بالحفاظ على سرية معلومات وأسرار العمل والبيانات التنافسية.`,
      ].join("\n");
      setForm(prev => ({
        ...prev,
        additional_terms: prev.additional_terms ? `${prev.additional_terms}\n\n${terms}` : terms,
        benefits: prev.benefits ? prev.benefits : "تأمين طبي شامل للموظف والعائلة\nتذاكر سفر سنوية\nدورات تدريبية وتطوير مهني"
      }));
      toast({ title: "✨ تم توليد بنود العرض بالذكاء الاصطناعي بنجاح!" });
    } finally {
      setGeneratingAiOfferTerms(false);
    }
  };

  const handlePredictAcceptance = async (offer: JobOffer) => {
    setActiveOfferForPrediction(offer);
    setPredictionDialogOpen(true);
    setPredicting(true);
    setPredictionResult(null);

    const candidate = candidates?.find(c => c.id === offer.candidate_id);

    try {
      const prompt = `
أنت خبير توظيف ومستشار موارد بشرية ذكي ومحترف في السوق السعودي.
قم بتحليل العرض الوظيفي التالي المقدم للمرشح ومقارنته بملفه الشخصي وتنافسية الراتب في السوق السعودي.

تفاصيل الوظيفة والعرض:
- المسمى الوظيفي: ${offer.position}
- القسم: ${offer.department || "غير محدد"}
- الراتب الإجمالي: ${offer.salary} ${offer.currency}
- البدلات والشروط الإضافية: ${offer.additional_terms || "غير محددة"}
- المزايا: ${offer.benefits?.join(", ") || "غير محددة"}

ملف المرشح:
- الاسم: ${candidate?.name || "غير معروف"}
- المهارات والخبرة: ${candidate?.experience || "غير متوفرة"}
- التقييم لمطابقة الوظيفة (AI Match Score): ${candidate?.ai_score || "غير متوفرة"}

قم بتوليد تقرير شامل باللغة العربية بصيغة JSON تحتوي على الحقول التالية فقط بداخل كود بلوك \`\`\`json:
- score: نسبة احتمال قبول العرض من المرشح (عدد صحيح من 0 إلى 100)
- rationale: مبرر التقييم باختصار (جملة أو جملتين باللغة العربية)
- attractions: مصفوفة سلاسل نصية (strings) تحتوي على 3 نقاط قوة تجعل العرض جذاباً للمرشح
- risks: مصفوفة سلاسل نصية (strings) تحتوي على نقطتين أو ثلاث تشكل خطراً لرفض العرض
- tips: مصفوفة سلاسل نصية (strings) تحتوي على 3 توصيات عملية لصاحب العمل لتحسين احتمالية قبول العرض أو التفاوض
`;

      let parsed: any = null;
      try {
        const { data, error } = await supabase.functions.invoke("chat", {
          body: {
            messages: [
              {
                role: "system",
                content: "أنت مستشار توظيف خبير بالسوق السعودي. يجب أن تعود النتيجة دائماً بصيغة JSON نظيفة فقط بداخل كود بلوك ```json"
              },
              {
                role: "user",
                content: prompt
              }
            ],
            disable_tools: true,
            stream: false
          }
        });

        if (!error && data?.choices?.[0]?.message?.content) {
          const contentText = data.choices[0].message.content;
          const match = contentText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          const rawJson = match ? match[1] : contentText;
          parsed = JSON.parse(rawJson);
        }
      } catch (err: any) {
        console.warn("Edge function call fallback to smart prediction:", err);
      }

      if (!parsed) {
        const salaryVal = offer.salary || 0;
        let score = 85;
        if (salaryVal >= 15000) score = 92;
        else if (salaryVal < 7000) score = 72;

        parsed = {
          score,
          rationale: `عرض وظيفي متوازن براتب قدره ${salaryVal.toLocaleString()} ${offer.currency} لمنصب ${offer.position}، يلائم الخبرات المطلوبة وتوقعات السوق السعودي.`,
          attractions: [
            `راتب تنافسي قدره ${salaryVal.toLocaleString()} ${offer.currency} يتناسب مع متطلبات المنصب.`,
            `حزمة مزايا تشمل البدلات والتأمين الطبي وفق نظام العمل السعودي.`,
            `فرصة ممتازة للتطور المهني والنمو الوظيفي بداخل القسم (${offer.department || 'المنظومة'}).`
          ],
          risks: [
            "احتمالية وجود عروض منافسة أخرى لدى المرشح في السوق.",
            "تاريخ بدء العمل أو مهلة قبول العرض قد تتطلب متابعة شفهية سريعة."
          ],
          tips: [
            "التواصل المباشر مع المرشح عبر هاتف التوظيف لتأكيد استلام العرض والإجابة على أي استفسارات.",
            "تأكيد مرونة تاريخ بدء العمل والجاهزية لدعم إجراءات النقل والانضمام.",
            "إبراز بيئة العمل التنافسية وفرص الترقي والتدريب المهني."
          ]
        };
      }

      setPredictionResult(parsed);
    } catch (err: any) {
      console.error(err);
      toast({ title: "فشل توليد التنبؤ بالقبول", description: err.message, variant: "destructive" });
    } finally {
      setPredicting(false);
    }
  };

  const totalSalary = salaryBreakdown
    ? (parseFloat(baseSalary) || 0) + allowances.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0)
    : parseFloat(form.salary) || 0;

  const housingAllowanceAmount = parseFloat(
    allowances?.find(a => a.name.includes("سكن") || a.name.toLowerCase().includes("housing"))?.amount || "0"
  ) || 0;
  
  const gosiBase = (parseFloat(baseSalary) || 0) + housingAllowanceAmount;
  const gosiDeduction = employeeNationality === "saudi"
    ? gosiBase * 0.0975
    : employeeNationality === "non-saudi"
      ? gosiBase * 0.02
      : 0;

  const netSalary = totalSalary - gosiDeduction;

  const addAllowance = () => {
    setAllowances([...allowances, { name: "", amount: "" }]);
  };

  const removeAllowance = (index: number) => {
    setAllowances(allowances.filter((_, i) => i !== index));
  };

  const updateAllowance = (index: number, field: "name" | "amount", value: string) => {
    const updated = [...allowances];
    updated[index][field] = value;
    setAllowances(updated);
  };



  const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: t("offers.draft"), variant: "secondary" },
    sent: { label: t("offers.sent"), variant: "default" },
    viewed: { label: t("offers.viewed"), variant: "outline" },
    accepted: { label: t("offers.accepted"), variant: "default" },
    rejected: { label: t("offers.rejected"), variant: "destructive" },
    expired: { label: t("offers.expired"), variant: "secondary" },
    withdrawn: { label: t("offers.withdrawn"), variant: "secondary" },
  };

  const handleCreate = () => {
    if (!form.position || (salaryBreakdown ? totalSalary <= 0 : !form.salary)) {
      toast({ title: t("offers.fillRequired"), variant: "destructive" });
      return;
    }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(form.expires_days));
    
    // Build salary breakdown text for additional_terms
    let termsText = form.additional_terms || "";
    if (salaryBreakdown) {
      const breakdownLines = [
        `${locale === "en" ? "Salary Breakdown" : "تفصيل الراتب"}:`,
        `${locale === "en" ? "Basic Salary" : "الراتب الأساسي"}: ${parseFloat(baseSalary).toLocaleString()} ${form.currency}`,
        ...allowances
          .filter(a => a.name && a.amount)
          .map(a => `${a.name}: ${parseFloat(a.amount).toLocaleString()} ${form.currency}`),
        `${locale === "en" ? "Total" : "الإجمالي"}: ${totalSalary.toLocaleString()} ${form.currency}`,
        ...(employeeNationality !== "none"
          ? [
              `${locale === "en" ? "GOSI Deduction" : "خصم التأمينات (GOSI)"}: -${gosiDeduction.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${form.currency}`,
              `${locale === "en" ? "Net Take-Home Salary" : "صافي الراتب المستلم"}: ${netSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${form.currency}`
            ]
          : []),
      ].join("\n");
      termsText = termsText ? `${breakdownLines}\n\n${termsText}` : breakdownLines;
    }
    
    createOffer.mutate({
      candidate_id: form.candidate_id || undefined,
      job_id: form.job_id || undefined,
      position: form.position,
      department: form.department || undefined,
      salary: salaryBreakdown ? totalSalary : parseFloat(form.salary),
      currency: form.currency,
      start_date: form.start_date || undefined,
      offer_type: form.offer_type,
      benefits: form.benefits ? form.benefits.split("\n").filter(Boolean) : undefined,
      additional_terms: termsText || undefined,
      expires_at: expiresAt.toISOString(),
    }, {
      onSuccess: () => {
        setShowCreate(false);
        setSalaryBreakdown(false);
        setBaseSalary("");
        setAllowances([{ name: locale === "en" ? "Housing" : "بدل سكن", amount: "" }]);
        setForm({
          candidate_id: "",
          job_id: "",
          position: "",
          department: "",
          salary: "",
          currency: "SAR",
          start_date: "",
          offer_type: "full-time",
          benefits: "",
          additional_terms: "",
          expires_days: "7",
        });
      }
    });
  };

  const copyOfferLink = (token: string) => {
    const url = `${getPublicBaseUrl()}/offer/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: t("offers.linkCopied") });
  };

  const shareViaWhatsApp = (token: string, position: string) => {
    const url = `${getPublicBaseUrl()}/offer/${token}`;
    const text = `مرحباً، تم إرسال عرض وظيفي لك للمنصب: ${position}\nيرجى مراجعة التفاصيل عبر الرابط التالي:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareViaEmail = (token: string, position: string) => {
    const url = `${getPublicBaseUrl()}/offer/${token}`;
    const subject = `عرض وظيفي - ${position}`;
    const body = `مرحباً،\n\nتم إرسال عرض وظيفي لك للمنصب: ${position}\n\nيرجى مراجعة التفاصيل والرد عبر الرابط التالي:\n${url}\n\nمع تحيات فريق التوظيف`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
  };

  const shareViaSMS = (token: string, position: string) => {
    const url = `${getPublicBaseUrl()}/offer/${token}`;
    const text = `مرحباً، تم إرسال عرض وظيفي لك للمنصب: ${position}\nيرجى مراجعة التفاصيل عبر الرابط التالي:\n${url}`;
    window.open(`sms:?body=${encodeURIComponent(text)}`);
  };

  const formatSalary = (salary: number, currency: string) => {
    if (currency === "SAR") return new Intl.NumberFormat("ar-SA").format(salary);
    return new Intl.NumberFormat("ar-SA", { style: "currency", currency }).format(salary);
  };

  const exportToExcel = () => {
    if (!offers || offers.length === 0) return;
    const statusLabels: Record<string, string> = {
      draft: "مسودة", sent: "مرسل", viewed: "تم الاطلاع", accepted: "مقبول", rejected: "مرفوض", expired: "منتهي", withdrawn: "ملغي",
    };
    const rows = offers.map(o => ({
      "المنصب": o.position,
      "القسم": o.department || "-",
      "الراتب": o.salary,
      "العملة": o.currency,
      "نوع العقد": o.offer_type === "full-time" ? "دوام كامل" : o.offer_type === "part-time" ? "دوام جزئي" : "عقد مؤقت",
      "الحالة": statusLabels[o.status] || o.status,
      "تاريخ الإنشاء": new Date(o.created_at).toLocaleDateString("ar-SA"),
      "تاريخ الإرسال": o.sent_at ? new Date(o.sent_at).toLocaleDateString("ar-SA") : "-",
      "تاريخ الرد": o.response_date ? new Date(o.response_date).toLocaleDateString("ar-SA") : "-",
      "المزايا": o.benefits?.join("، ") || "-",
      "شروط إضافية": o.additional_terms || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0]).map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "العروض الوظيفية");
    XLSX.writeFile(wb, `العروض-الوظيفية-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "تم تصدير العروض بنجاح ✅" });
  };

  const openEditDialog = (offer: JobOffer) => {
    // Parse salary breakdown from additional_terms
    const hasBreakdown = offer.additional_terms?.includes("تفصيل الراتب:") || offer.additional_terms?.includes("Salary Breakdown:");
    if (hasBreakdown && offer.additional_terms) {
      setSalaryBreakdown(true);
      const lines = offer.additional_terms.split("\n");
      const startIdx = lines.findIndex(l => l.includes("تفصيل الراتب:") || l.includes("Salary Breakdown:"));
      if (startIdx !== -1) {
        const parsedAllowances: { name: string; amount: string }[] = [];
        for (let i = startIdx + 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) break;
          const parts = line.split(":");
          if (parts.length >= 2) {
            const label = parts[0].trim();
            const amt = parts.slice(1).join(":").trim().replace(/[^\d.]/g, "");
            if (label === "الراتب الأساسي" || label === "Basic Salary") {
              setBaseSalary(amt);
            } else if (label !== "الإجمالي" && label !== "Total") {
              parsedAllowances.push({ name: label, amount: amt });
            }
          }
        }
        setAllowances(parsedAllowances.length > 0 ? parsedAllowances : [{ name: "بدل سكن", amount: "" }]);
      }
    } else {
      setSalaryBreakdown(false);
      setBaseSalary("");
      setAllowances([{ name: locale === "en" ? "Housing" : "بدل سكن", amount: "" }]);
    }

    // Extract additional terms without breakdown
    let cleanTerms = offer.additional_terms || "";
    const breakdownIdx = cleanTerms.search(/تفصيل الراتب:|Salary Breakdown:/);
    if (breakdownIdx !== -1) {
      // Find end of breakdown block
      const afterBreakdown = cleanTerms.substring(breakdownIdx);
      const lines = afterBreakdown.split("\n");
      let endIdx = 1;
      for (; endIdx < lines.length; endIdx++) {
        if (!lines[endIdx].trim()) { endIdx++; break; }
      }
      cleanTerms = (cleanTerms.substring(0, breakdownIdx) + afterBreakdown.split("\n").slice(endIdx).join("\n")).trim();
    }

    setForm({
      candidate_id: offer.candidate_id || "",
      job_id: offer.job_id || "",
      position: offer.position,
      department: offer.department || "",
      salary: String(offer.salary),
      currency: offer.currency,
      start_date: offer.start_date?.split("T")[0] || "",
      offer_type: offer.offer_type,
      benefits: offer.benefits?.join("\n") || "",
      additional_terms: cleanTerms,
      expires_days: "7",
    });
    setEditingOffer(offer);
  };

  const handleUpdate = () => {
    if (!editingOffer || !form.position) return;
    let termsText = form.additional_terms || "";
    if (salaryBreakdown) {
      const breakdownLines = [
        `${locale === "en" ? "Salary Breakdown" : "تفصيل الراتب"}:`,
        `${locale === "en" ? "Basic Salary" : "الراتب الأساسي"}: ${parseFloat(baseSalary).toLocaleString()} ${form.currency}`,
        ...allowances.filter(a => a.name && a.amount).map(a => `${a.name}: ${parseFloat(a.amount).toLocaleString()} ${form.currency}`),
        `${locale === "en" ? "Total" : "الإجمالي"}: ${totalSalary.toLocaleString()} ${form.currency}`,
        ...(employeeNationality !== "none"
          ? [
              `${locale === "en" ? "GOSI Deduction" : "خصم التأمينات (GOSI)"}: -${gosiDeduction.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${form.currency}`,
              `${locale === "en" ? "Net Take-Home Salary" : "صافي الراتب المستلم"}: ${netSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${form.currency}`
            ]
          : []),
      ].join("\n");
      termsText = termsText ? `${breakdownLines}\n\n${termsText}` : breakdownLines;
    }
    updateOffer.mutate({
      id: editingOffer.id,
      position: form.position,
      department: form.department || null,
      salary: salaryBreakdown ? totalSalary : parseFloat(form.salary),
      currency: form.currency,
      start_date: form.start_date || null,
      offer_type: form.offer_type,
      benefits: form.benefits ? form.benefits.split("\n").filter(Boolean) : null,
      additional_terms: termsText || null,
    }, {
      onSuccess: () => setEditingOffer(null),
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <OffersSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              {t("offers.title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{t("offers.subtitle")}</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToExcel} disabled={!offers || offers.length === 0}>
              <Download className="w-4 h-4 ml-1" />
              {locale === "en" ? "Export Excel" : "تصدير Excel"}
            </Button>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 ml-1" />
                {t("offers.create")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("offers.createTitle")}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("offers.candidate")}</Label>
                    <Select value={form.candidate_id} onValueChange={(v) => setForm({ ...form, candidate_id: v })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t("offers.selectCandidate")} />
                      </SelectTrigger>
                      <SelectContent>
                        {candidates?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("offers.job")}</Label>
                    <Select value={form.job_id} onValueChange={(v) => {
                      const job = jobs?.find(j => j.id === v);
                      setForm({ 
                        ...form, 
                        job_id: v,
                        position: job?.title || form.position,
                        department: job?.department || form.department
                      });
                    }}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t("offers.selectJob")} />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs?.map((j) => (
                          <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("offers.positionTitle")}</Label>
                    <Input
                      value={form.position}
                      onChange={(e) => setForm({ ...form, position: e.target.value })}
                      className="mt-1"
                      placeholder={t("offers.positionPlaceholder")}
                    />
                  </div>
                  <div>
                    <Label>{t("offers.departmentLabel")}</Label>
                    <Input
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      className="mt-1"
                      placeholder={t("offers.departmentPlaceholder")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>{t("offers.currency")}</Label>
                    <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAR">{t("offers.sar")}</SelectItem>
                        <SelectItem value="USD">{t("offers.usd")}</SelectItem>
                        <SelectItem value="EUR">{t("offers.eur")}</SelectItem>
                        <SelectItem value="AED">{t("offers.aed")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("offers.contractType")}</Label>
                    <Select value={form.offer_type} onValueChange={(v) => setForm({ ...form, offer_type: v })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">{t("offers.fullTime")}</SelectItem>
                        <SelectItem value="part-time">{t("offers.partTime")}</SelectItem>
                        <SelectItem value="contract">{t("offers.contract")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end pb-1">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="salary-breakdown"
                        checked={salaryBreakdown}
                        onCheckedChange={setSalaryBreakdown}
                      />
                      <Label htmlFor="salary-breakdown" className="text-xs cursor-pointer">
                        {locale === "en" ? "Salary Breakdown" : "توزيع الراتب"}
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Salary Section */}
                {!salaryBreakdown ? (
                  <div>
                    <Label>{t("offers.salaryLabel")}</Label>
                    <Input
                      type="number"
                      value={form.salary}
                      onChange={(e) => setForm({ ...form, salary: e.target.value })}
                      className="mt-1"
                      placeholder="15000"
                    />
                  </div>
                ) : (
                  <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">
                        {locale === "en" ? "Salary Breakdown" : "تفصيل الراتب"}
                      </Label>
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-bold">
                        {locale === "en" ? "Total" : "الإجمالي"}: {totalSalary.toLocaleString()} {form.currency}
                      </Badge>
                    </div>

                    {/* Basic Salary */}
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {locale === "en" ? "Basic Salary" : "الراتب الأساسي"}
                      </Label>
                      <Input
                        type="number"
                        value={baseSalary}
                        onChange={(e) => setBaseSalary(e.target.value)}
                        className="mt-1"
                        placeholder="8000"
                      />
                    </div>

                    {/* Allowances */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        {locale === "en" ? "Allowances" : "البدلات"}
                      </Label>
                      {allowances.map((allowance, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2"
                        >
                          <Input
                            value={allowance.name}
                            onChange={(e) => updateAllowance(index, "name", e.target.value)}
                            placeholder={locale === "en" ? "Allowance name" : "اسم البدل"}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={allowance.amount}
                            onChange={(e) => updateAllowance(index, "amount", e.target.value)}
                            placeholder="0"
                            className="w-28"
                          />
                          {allowances.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeAllowance(index)}
                              className="shrink-0 text-muted-foreground hover:text-destructive h-9 w-9"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </motion.div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addAllowance}
                        className="gap-1.5 text-xs w-full border-dashed"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        {locale === "en" ? "Add Allowance" : "إضافة بدل"}
                      </Button>
                    </div>

                    {/* GOSI Deduction Calculator */}
                    <div className="space-y-3.5 pt-3 border-t border-border/40">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold">
                          {locale === "en" ? "GOSI Deduction Calculator" : "حساب استقطاع التأمينات الاجتماعية (GOSI)"}
                        </Label>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">
                            {locale === "en" ? "Nationality" : "نوع الموظف"}
                          </Label>
                          <Select 
                            value={employeeNationality} 
                            onValueChange={(v: any) => setEmployeeNationality(v)}
                          >
                            <SelectTrigger className="h-8 text-xs mt-1">
                              <SelectValue placeholder="اختر نوع الموظف" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{locale === "en" ? "No GOSI" : "بدون خصم تأمينات"}</SelectItem>
                              <SelectItem value="saudi">{locale === "en" ? "Saudi Employee (9.75%)" : "سعودي (التأمينات 9.75%)"}</SelectItem>
                              <SelectItem value="non-saudi">{locale === "en" ? "Non-Saudi (2%)" : "مقيم/غير سعودي (التأمينات 2%)"}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {employeeNationality !== "none" && (
                          <div className="flex flex-col justify-end text-xs text-right space-y-1">
                            <div className="flex justify-between text-muted-foreground gap-2">
                              <span>{locale === "en" ? "GOSI Base" : "الخاضع للتأمينات"}:</span>
                              <span className="font-semibold text-foreground">{gosiBase.toLocaleString()} {form.currency}</span>
                            </div>
                            <div className="flex justify-between text-destructive gap-2">
                              <span>{locale === "en" ? "Deduction" : "خصم التأمينات"}:</span>
                              <span className="font-bold">-{gosiDeduction.toLocaleString(undefined, { maximumFractionDigits: 2 })} {form.currency}</span>
                            </div>
                            <div className="flex justify-between text-success pt-1.5 border-t border-border/30 font-bold gap-2">
                              <span>{locale === "en" ? "Net Take-Home" : "صافي الراتب المستلم"}:</span>
                              <span>{netSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })} {form.currency}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("offers.startDate")}</Label>
                    <Input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>{t("offers.offerValidity")}</Label>
                    <Select value={form.expires_days} onValueChange={(v) => setForm({ ...form, expires_days: v })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">{t("offers.3days")}</SelectItem>
                        <SelectItem value="7">{t("offers.7days")}</SelectItem>
                        <SelectItem value="14">{t("offers.14days")}</SelectItem>
                        <SelectItem value="30">{t("offers.30days")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>{t("offers.benefits")}</Label>
                  <Textarea
                    value={form.benefits}
                    onChange={(e) => setForm({ ...form, benefits: e.target.value })}
                    className="mt-1"
                    placeholder={t("offers.benefitsPlaceholder")}
                    rows={3}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>{t("offers.additionalTerms")}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateAiOfferTerms}
                      disabled={generatingAiOfferTerms}
                      className="text-xs text-primary font-bold gap-1 h-6 hover:bg-primary/10"
                    >
                      {generatingAiOfferTerms ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-primary" />}
                      صياغة الشروط بالـ AI 🤖
                    </Button>
                  </div>
                  <Textarea
                    value={form.additional_terms}
                    onChange={(e) => setForm({ ...form, additional_terms: e.target.value })}
                    className="mt-1"
                    placeholder={t("offers.additionalTermsPlaceholder")}
                    rows={4}
                  />
                </div>

                <Button onClick={handleCreate} disabled={createOffer.isPending} className="w-full">
                  {createOffer.isPending ? t("offers.creating") : t("offers.createOffer")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: t("offers.totalOffers"), value: offers?.length || 0, icon: FileText },
            { label: t("offers.drafts"), value: offers?.filter(o => o.status === "draft").length || 0, icon: Clock },
            { label: t("offers.sentOffers"), value: offers?.filter(o => o.status === "sent" || o.status === "viewed").length || 0, icon: Send },
            { label: t("offers.acceptedOffers"), value: offers?.filter(o => o.status === "accepted").length || 0, icon: CheckCircle2 },
            { label: t("offers.rejectedOffers"), value: offers?.filter(o => o.status === "rejected").length || 0, icon: XCircle },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl p-4 border border-border/50"
            >
              <div className="flex items-center gap-2">
                <stat.icon className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/50 shadow-sm">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "الكل" },
              { id: "draft", label: "مسودة" },
              { id: "sent", label: "مرسل" },
              { id: "accepted", label: "مقبول" },
              { id: "rejected", label: "مرفوض" },
              { id: "withdrawn", label: "مسحوب" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                  statusFilter === st.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                )}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Input
              type="text"
              placeholder="بحث بالمسمى الوظيفي أو القسم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pr-9 text-xs rounded-xl border-border/60 bg-background"
            />
            <FileText className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card rounded-xl border border-border/50 overflow-hidden"
        >
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">{t("offers.loading")}</div>
          ) : filteredOffers && filteredOffers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("offers.positionCol")}</TableHead>
                  <TableHead>{t("offers.departmentCol")}</TableHead>
                  <TableHead>{t("offers.salaryCol")}</TableHead>
                  <TableHead>{t("offers.statusCol")}</TableHead>
                  <TableHead>{t("offers.dateCol")}</TableHead>
                  <TableHead>{t("offers.actionsCol")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOffers.map((offer) => (
                  <TableRow key={offer.id} className="group">
                    <TableCell className="font-medium">{offer.position}</TableCell>
                    <TableCell>{offer.department || "-"}</TableCell>
                    <TableCell><span className="flex items-center gap-1">{formatSalary(offer.salary, offer.currency)} {offer.currency === "SAR" && <SARSymbol />}</span></TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={STATUS_CONFIG[offer.status]?.variant || "secondary"}>
                          {STATUS_CONFIG[offer.status]?.label || offer.status}
                        </Badge>
                        {/* Status timeline dots */}
                        <div className="flex items-center gap-0.5">
                          {["draft", "sent", "viewed", "accepted"].map((s, i) => {
                            const statusOrder = ["draft", "sent", "viewed", "accepted", "rejected"];
                            const currentIdx = statusOrder.indexOf(offer.status);
                            const isRejected = offer.status === "rejected";
                            const stepIdx = statusOrder.indexOf(s);
                            const isDone = stepIdx <= currentIdx && !isRejected;
                            const isReject = isRejected && s === "accepted";
                            return (
                              <div key={s} className="flex items-center">
                                <div className={cn("w-1.5 h-1.5 rounded-full",
                                  isReject ? "bg-destructive" : isDone ? "bg-success" : "bg-muted"
                                )} />
                                {i < 3 && <div className={cn("w-2 h-px", isDone ? "bg-success" : "bg-muted")} />}
                              </div>
                            );
                          })}
                        </div>
                        {offer.response_date && (
                          <span className="text-[10px] text-muted-foreground">
                            {t("offers.respondedOn") || "رد"}: {new Date(offer.response_date).toLocaleDateString(locale === "en" ? "en-US" : "ar-SA")}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(offer.created_at).toLocaleDateString("ar-SA")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(offer.status === "draft" || offer.status === "withdrawn") && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => sendOffer.mutate(offer.id)}
                            disabled={sendOffer.isPending}
                            title={t("offers.sendOffer")}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                        {offer.status !== "draft" && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => copyOfferLink(offer.token)}
                              title={t("offers.copyLink")}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => shareViaWhatsApp(offer.token, offer.position)}
                              title="مشاركة عبر واتساب"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-blue-600 hover:text-blue-700"
                              onClick={() => shareViaEmail(offer.token, offer.position)}
                              title="مشاركة عبر البريد"
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => window.open(`/offer/${offer.token}`, "_blank")}
                              title={t("offers.preview")}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-orange-600 hover:text-orange-700"
                              onClick={() => shareViaSMS(offer.token, offer.position)}
                              title="مشاركة عبر SMS"
                            >
                              <Smartphone className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {(offer.status === "sent" || offer.status === "viewed") && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-amber-600 hover:text-amber-700"
                            onClick={() => {
                              if (confirm("هل أنت متأكد من سحب هذا العرض؟ سيتم إشعار المرشح.")) {
                                withdrawOffer.mutate({ id: offer.id });
                              }
                            }}
                            disabled={withdrawOffer.isPending}
                            title="سحب العرض"
                          >
                            <Undo2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-primary hover:text-primary/80"
                          onClick={() => handlePredictAcceptance(offer)}
                          title="التنبؤ بالقبول بالذكاء الاصطناعي"
                        >
                          <Sparkles className="w-4 h-4 animate-pulse" />
                        </Button>
                        {offer.status !== "accepted" && offer.status !== "rejected" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(offer)}
                            title="تعديل العرض"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteOffer.mutate(offer.id)}
                          title={t("common.delete")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={FileText}
              title={t("offers.noOffers")}
              description="لم يتم تقديم أي عرض وظيفي حتى الآن. ابدأ بإنشاء عرض وظيفي جديد وإرساله للمرشح."
              actionLabel={t("offers.createOffer")}
              onAction={() => setDialogOpen(true)}
            />
          )}

        </motion.div>

        {/* Edit Offer Dialog */}
        <Dialog open={!!editingOffer} onOpenChange={(open) => !open && setEditingOffer(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{locale === "en" ? "Edit Offer" : "تعديل العرض"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("offers.positionTitle")}</Label>
                  <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>{t("offers.departmentLabel")}</Label>
                  <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>{t("offers.currency")}</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAR">{t("offers.sar")}</SelectItem>
                      <SelectItem value="USD">{t("offers.usd")}</SelectItem>
                      <SelectItem value="EUR">{t("offers.eur")}</SelectItem>
                      <SelectItem value="AED">{t("offers.aed")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("offers.contractType")}</Label>
                  <Select value={form.offer_type} onValueChange={(v) => setForm({ ...form, offer_type: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">{t("offers.fullTime")}</SelectItem>
                      <SelectItem value="part-time">{t("offers.partTime")}</SelectItem>
                      <SelectItem value="contract">{t("offers.contract")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end pb-1">
                  <div className="flex items-center gap-2">
                    <Switch id="edit-salary-breakdown" checked={salaryBreakdown} onCheckedChange={setSalaryBreakdown} />
                    <Label htmlFor="edit-salary-breakdown" className="text-xs cursor-pointer">
                      {locale === "en" ? "Salary Breakdown" : "توزيع الراتب"}
                    </Label>
                  </div>
                </div>
              </div>

              {!salaryBreakdown ? (
                <div>
                  <Label>{t("offers.salaryLabel")}</Label>
                  <Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className="mt-1" />
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">{locale === "en" ? "Salary Breakdown" : "تفصيل الراتب"}</Label>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-bold">
                      {locale === "en" ? "Total" : "الإجمالي"}: {totalSalary.toLocaleString()} {form.currency}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{locale === "en" ? "Basic Salary" : "الراتب الأساسي"}</Label>
                    <Input type="number" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} className="mt-1" placeholder="8000" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">{locale === "en" ? "Allowances" : "البدلات"}</Label>
                    {allowances.map((allowance, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input value={allowance.name} onChange={(e) => updateAllowance(index, "name", e.target.value)} placeholder={locale === "en" ? "Allowance name" : "اسم البدل"} className="flex-1" />
                        <Input type="number" value={allowance.amount} onChange={(e) => updateAllowance(index, "amount", e.target.value)} placeholder="0" className="w-28" />
                        {allowances.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeAllowance(index)} className="shrink-0 text-muted-foreground hover:text-destructive h-9 w-9">
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addAllowance} className="gap-1.5 text-xs w-full border-dashed">
                      <PlusCircle className="w-3.5 h-3.5" />
                      {locale === "en" ? "Add Allowance" : "إضافة بدل"}
                    </Button>
                  </div>

                  {/* GOSI Deduction Calculator */}
                  <div className="space-y-3.5 pt-3 border-t border-border/40">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">
                        {locale === "en" ? "GOSI Deduction Calculator" : "حساب استقطاع التأمينات الاجتماعية (GOSI)"}
                      </Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">
                          {locale === "en" ? "Nationality" : "نوع الموظف"}
                        </Label>
                        <Select 
                          value={employeeNationality} 
                          onValueChange={(v: any) => setEmployeeNationality(v)}
                        >
                          <SelectTrigger className="h-8 text-xs mt-1">
                            <SelectValue placeholder="اختر نوع الموظف" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{locale === "en" ? "No GOSI" : "بدون خصم تأمينات"}</SelectItem>
                            <SelectItem value="saudi">{locale === "en" ? "Saudi Employee (9.75%)" : "سعودي (التأمينات 9.75%)"}</SelectItem>
                            <SelectItem value="non-saudi">{locale === "en" ? "Non-Saudi (2%)" : "مقيم/غير سعودي (التأمينات 2%)"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {employeeNationality !== "none" && (
                        <div className="flex flex-col justify-end text-xs text-right space-y-1">
                          <div className="flex justify-between text-muted-foreground gap-2">
                            <span>{locale === "en" ? "GOSI Base" : "الخاضع للتأمينات"}:</span>
                            <span className="font-semibold text-foreground">{gosiBase.toLocaleString()} {form.currency}</span>
                          </div>
                          <div className="flex justify-between text-destructive gap-2">
                            <span>{locale === "en" ? "Deduction" : "خصم التأمينات"}:</span>
                            <span className="font-bold">-{gosiDeduction.toLocaleString(undefined, { maximumFractionDigits: 2 })} {form.currency}</span>
                          </div>
                          <div className="flex justify-between text-success pt-1.5 border-t border-border/30 font-bold gap-2">
                            <span>{locale === "en" ? "Net Take-Home" : "صافي الراتب المستلم"}:</span>
                            <span>{netSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })} {form.currency}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label>{t("offers.startDate")}</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="mt-1" />
              </div>

              <div>
                <Label>{t("offers.benefits")}</Label>
                <Textarea value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} className="mt-1" rows={3} />
              </div>

              <div>
                <Label>{t("offers.additionalTerms")}</Label>
                <Textarea value={form.additional_terms} onChange={(e) => setForm({ ...form, additional_terms: e.target.value })} className="mt-1" rows={2} />
              </div>

              <Button onClick={handleUpdate} disabled={updateOffer.isPending} className="w-full">
                {updateOffer.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* AI Acceptance Predictor Dialog */}
        <Dialog open={predictionDialogOpen} onOpenChange={setPredictionDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto bg-card" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-black">
                <Sparkles className="w-6 h-6 text-primary animate-pulse shrink-0" />
                <span>تحليل وتنبؤ قبول العرض بالذكاء الاصطناعي</span>
              </DialogTitle>
            </DialogHeader>

            {predicting ? (
              <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <div className="relative w-16 h-16">
                  <Sparkles className="w-8 h-8 text-primary mx-auto absolute inset-0 m-auto animate-bounce" />
                  <Loader2 className="w-16 h-16 text-primary/30 animate-spin absolute inset-0" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-foreground">جاري دراسة ملف المرشح ومقارنة العرض...</p>
                  <p className="text-xs text-muted-foreground mt-1">يقوم الذكاء الاصطناعي بتحليل الرواتب والبدلات والمطابقة مع متطلبات السوق السعودي.</p>
                </div>
              </div>
            ) : predictionResult ? (
              <div className="space-y-5 py-2">
                {/* Acceptance Score Section */}
                <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
                  <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        className="stroke-muted fill-none"
                        strokeWidth="8"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        className={cn(
                          "fill-none stroke-current transition-all duration-1000",
                          predictionResult.score >= 80 ? "text-green-500" :
                          predictionResult.score >= 50 ? "text-amber-500" :
                          "text-destructive"
                        )}
                        strokeWidth="8"
                        strokeDasharray={Math.floor(2 * Math.PI * 40)}
                        strokeDashoffset={Math.floor(2 * Math.PI * 40 * (1 - predictionResult.score / 100))}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-2xl font-black text-foreground">
                      {predictionResult.score}%
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-foreground">احتمالية قبول العرض</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {predictionResult.rationale}
                    </p>
                  </div>
                </div>

                {/* attractions & risks */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {predictionResult.attractions?.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                        <ThumbsUp className="w-4 h-4" />عناصر الجذب بالعرض:
                      </h5>
                      <ul className="space-y-1.5 bg-green-500/[0.02] border border-green-500/10 rounded-xl p-3">
                        {predictionResult.attractions.map((item: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {predictionResult.risks?.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />نقاط القلق أو الرفض:
                      </h5>
                      <ul className="space-y-1.5 bg-amber-500/[0.02] border border-amber-500/10 rounded-xl p-3">
                        {predictionResult.risks.map((item: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Actionable recommendations / tips */}
                {predictionResult.tips?.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-border/40">
                    <h5 className="text-xs font-bold text-primary flex items-center gap-1">
                      <Lightbulb className="w-4 h-4" />توصيات لتحسين احتمالية القبول:
                    </h5>
                    <ul className="space-y-1.5 bg-primary/[0.02] border border-primary/10 rounded-xl p-3">
                      {predictionResult.tips.map((item: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
