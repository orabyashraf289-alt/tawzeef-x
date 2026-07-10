import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { FileText, Save, Info, Sparkles, Eye, Code, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type TemplateType = "approval" | "rejection" | "assessment";

interface TemplateData {
  id?: string;
  company_id: string;
  type: TemplateType;
  subject: string;
  body_html: string;
}

const DEFAULT_SUBJECTS: Record<TemplateType, string> = {
  approval: "تحديث حالة طلبك - {stage_name}",
  rejection: "تحديث حالة طلبك - {job_title}",
  assessment: "اختبار مطلوب: {assessment_title}",
};

const DEFAULT_BODIES: Record<TemplateType, string> = {
  approval: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
  <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">✅ تحديث حالة طلبك</h1>
  </div>
  <div style="padding: 30px;">
    <p style="font-size: 16px; color: #374151;">مرحباً <strong>{candidate_name}</strong>،</p>
    <p style="font-size: 16px; color: #374151;">يسعدنا إبلاغك بأنه تم نقلك إلى مرحلة جديدة في عملية التوظيف:</p>
    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="font-size: 14px; color: #6b7280; margin: 0 0 5px;">المرحلة الحالية</p>
      <p style="font-size: 20px; font-weight: bold; color: #059669; margin: 0;">{stage_name}</p>
      <p style="font-size: 14px; color: #6b7280; margin: 10px 0 0;">الوظيفة: {job_title}</p>
    </div>
    <p style="font-size: 14px; color: #6b7280;">سيتم التواصل معك قريباً بخصوص الخطوات التالية.</p>
    <p style="font-size: 14px; color: #6b7280;">مع تحيات فريق التوظيف</p>
  </div>
</div>`,
  rejection: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
  <div style="background: linear-gradient(135deg, #6b7280, #4b5563); padding: 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">تحديث حالة طلبك</h1>
  </div>
  <div style="padding: 30px;">
    <p style="font-size: 16px; color: #374151;">مرحباً <strong>{candidate_name}</strong>،</p>
    <p style="font-size: 16px; color: #374151;">نشكرك على اهتمامك والوقت الذي استثمرته في عملية التقديم لوظيفة {job_title}.</p>
    <p style="font-size: 16px; color: #374151;">نأسف لإبلاغك بأنه لم يتم المضي قدماً في طلبك في هذه المرحلة.</p>
    <div style="background: #f9fafb; border-radius: 8px; padding: 15px; margin: 15px 0;">
      <p style="font-size: 14px; color: #6b7280; margin: 0;"><strong>ملاحظة:</strong> {rejection_reason}</p>
    </div>
    <p style="font-size: 14px; color: #6b7280;">نتمنى لك كل التوفيق في مسيرتك المهنية.</p>
    <p style="font-size: 14px; color: #6b7280;">مع تحيات فريق التوظيف</p>
  </div>
</div>`,
  assessment: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
  <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📝 اختبار مطلوب</h1>
  </div>
  <div style="padding: 30px;">
    <p style="font-size: 16px; color: #374151;">مرحباً <strong>{candidate_name}</strong>،</p>
    <p style="font-size: 16px; color: #374151;">كجزء من عملية التوظيف لوظيفة {job_title}، نرجو منك إكمال الاختبار التالي:</p>
    <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="font-size: 14px; color: #6b7280; margin: 0 0 10px;">الاختبار</p>
      <p style="font-size: 18px; font-weight: bold; color: #4f46e5; margin: 0 0 15px;">{assessment_title}</p>
      <a href="{assessment_url}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-size: 16px; font-weight: bold;">ابدأ الاختبار الآن</a>
    </div>
    <p style="font-size: 14px; color: #6b7280;">يرجى إكمال الاختبار في أقرب وقت ممكن.</p>
    <p style="font-size: 14px; color: #6b7280;">مع تحيات فريق التوظيف</p>
  </div>
</div>`,
};

const MERGE_TAGS = [
  { tag: "{candidate_name}", label: "اسم المرشح" },
  { tag: "{job_title}", label: "العنوان الوظيفي" },
  { tag: "{stage_name}", label: "اسم المرحلة" },
  { tag: "{rejection_reason}", label: "سبب الرفض" },
  { tag: "{assessment_title}", label: "اسم التقييم" },
  { tag: "{assessment_url}", label: "رابط التقييم" },
];

export default function NotificationTemplatesSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeType, setActiveType] = useState<TemplateType>("approval");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeInputRef = useRef<"subject" | "body">("body");

  // Get active company_id
  const { data: companyId } = useQuery({
    queryKey: ["my-company-id", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.company_id || null;
    },
    enabled: !!user,
  });

  // Query template list
  const { data: dbTemplates, isLoading } = useQuery({
    queryKey: ["notification-templates", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_templates" as any)
        .select("*")
        .eq("company_id", companyId!);
      if (error) throw error;
      return data as TemplateData[];
    },
    enabled: !!companyId,
  });

  // Sync templates on type change
  useEffect(() => {
    if (!isLoading) {
      const activeTpl = dbTemplates?.find((t) => t.type === activeType);
      setSubject(activeTpl?.subject || DEFAULT_SUBJECTS[activeType]);
      setBodyHtml(activeTpl?.body_html || DEFAULT_BODIES[activeType]);
    }
  }, [activeType, dbTemplates, isLoading]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("لم يتم العثور على معرف الشركة الخاص بك.");
      const { error } = await supabase
        .from("notification_templates" as any)
        .upsert(
          {
            company_id: companyId,
            type: activeType,
            subject: subject.trim(),
            body_html: bodyHtml,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "company_id,type",
          }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
      toast({ title: "تم حفظ قالب الرسالة بنجاح ✅" });
    },
    onError: (e: any) => {
      toast({ title: "فشل حفظ القالب", description: e.message, variant: "destructive" });
    },
  });

  const insertMergeTag = (tag: string) => {
    if (activeInputRef.current === "subject") {
      setSubject((prev) => prev + tag);
    } else {
      const txt = textareaRef.current;
      if (txt) {
        const start = txt.selectionStart;
        const end = txt.selectionEnd;
        const val = bodyHtml;
        const nextVal = val.substring(0, start) + tag + val.substring(end);
        setBodyHtml(nextVal);
        // Reset selection
        setTimeout(() => {
          txt.focus();
          txt.setSelectionRange(start + tag.length, start + tag.length);
        }, 10);
      } else {
        setBodyHtml((prev) => prev + tag);
      }
    }
  };

  // Compile mock variables for preview
  const compilePreview = () => {
    let result = bodyHtml;
    const mockVars = {
      candidate_name: "أحمد بن عبد الله",
      job_title: "مهندس برمجيات أول",
      stage_name: "المقابلة التقنية",
      rejection_reason: "عدم تطابق سنوات الخبرة المطلوبة مع المسار المهني الحالي.",
      assessment_title: "تقييم مهارات React & TypeScript",
      assessment_url: "#",
    };

    Object.entries(mockVars).forEach(([key, val]) => {
      const regex = new RegExp(`{${key}}`, "g");
      result = result.replace(regex, val);
    });

    return result;
  };

  if (!companyId) {
    return (
      <div className="p-8 text-center bg-card rounded-2xl border border-border/40">
        <Info className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">يجب أن تكون مسجلاً تحت شركة لتخصيص وإعداد القوالب.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          مركز أتمتة الرسائل والقوالب
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          قم بتخصيص وتنسيق رسائل البريد الإلكتروني التلقائية المرسلة للمرشحين خلال مراحل التوظيف.
        </p>
      </div>

      <div className="flex bg-muted/40 rounded-xl p-1 border border-border/30 w-fit">
        {[
          { type: "approval" as const, label: "رسالة القبول والترقية" },
          { type: "rejection" as const, label: "رسالة الاعتذار والرفض" },
          { type: "assessment" as const, label: "دعوة إكمال اختبار" },
        ].map((t) => (
          <button
            key={t.type}
            onClick={() => setActiveType(t.type)}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition-all",
              activeType === t.type ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Editor (3 Cols) */}
        <div className="md:col-span-3 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold">موضوع البريد الإلكتروني (Subject)</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => { activeInputRef.current = "subject"; }}
              className="text-sm font-medium"
              placeholder="اكتب موضوع الرسالة..."
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold">محتوى البريد (HTML Template)</Label>
              <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/30">
                <button
                  onClick={() => setPreviewMode("edit")}
                  className={cn("p-1.5 rounded-md text-[11px] font-semibold flex items-center gap-1", previewMode === "edit" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground")}
                >
                  <Code className="w-3.5 h-3.5" />
                  محرر الكود
                </button>
                <button
                  onClick={() => setPreviewMode("preview")}
                  className={cn("p-1.5 rounded-md text-[11px] font-semibold flex items-center gap-1", previewMode === "preview" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground")}
                >
                  <Eye className="w-3.5 h-3.5" />
                  معاينة حية
                </button>
              </div>
            </div>

            {previewMode === "edit" ? (
              <Textarea
                ref={textareaRef}
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                onFocus={() => { activeInputRef.current = "body"; }}
                className="h-[300px] font-mono text-xs tracking-wider leading-relaxed text-left"
                dir="ltr"
              />
            ) : (
              <div className="border border-border/50 rounded-xl overflow-hidden h-[300px] bg-white">
                <iframe
                  title="Live Preview"
                  srcDoc={compilePreview()}
                  className="w-full h-full border-none bg-white"
                  sandbox="allow-same-origin"
                />
              </div>
            )}
          </div>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full font-bold gap-2"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            حفظ قالب الرسالة النشط
          </Button>
        </div>

        {/* Helpers / Merge tags (2 Cols) */}
        <div className="md:col-span-2 space-y-4 bg-muted/20 p-5 rounded-2xl border border-border/30">
          <div>
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Info className="w-4 h-4 text-primary" />
              أوسمة الدمج الذكي (Merge Tags)
            </h4>
            <p className="text-[10px] text-muted-foreground mt-1">
              انقر على أي وسام أدناه لإدراجه في موضع مؤشر الكتابة النشط. سيقوم النظام باستبدالها تلقائياً ببيانات المرشح الحقيقية قبل إرسال الرسالة.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {MERGE_TAGS.map((mt) => (
              <button
                key={mt.tag}
                type="button"
                onClick={() => insertMergeTag(mt.tag)}
                className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/50 hover:border-primary/50 transition-colors text-right group"
              >
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-foreground">{mt.label}</span>
                  <span className="text-[10px] font-mono text-primary/80 mt-0.5">{mt.tag}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-[-2px]" />
              </button>
            ))}
          </div>

          <div className="border-t border-border/50 pt-4">
            <h4 className="text-xs font-bold text-foreground">💡 معلومات الدعم الهرمي:</h4>
            <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
              إذا لم يقم أحد فروع شركتك بتخصيص قالب معين، سيرث الفرع تلقائياً القالب المخصص للشركة الأم لتجنب تعطل الرسائل ولحماية هوية العلامة التجارية الموحدة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
