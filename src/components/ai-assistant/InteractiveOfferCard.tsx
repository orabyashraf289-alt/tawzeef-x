import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Edit3, Loader2, Save, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface OfferData {
  id: string;
  candidate_name: string;
  position: string;
  salary: number;
  currency: string;
  token: string;
  benefits?: string;
  start_date?: string;
}

export default function InteractiveOfferCard({ offer }: { offer: OfferData }) {
  const [position, setPosition] = useState(offer.position);
  const [salary, setSalary] = useState(offer.salary);
  const [benefits, setBenefits] = useState(offer.benefits || "تأمين طبي عائلي فئة A، بدل سكن 25%، بدل مواصلات 10%، تذاكر سفر سنوية");
  const [startDate, setStartDate] = useState(offer.start_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("job_offers")
        .update({
          position,
          salary: Number(salary),
          benefits,
          start_date: startDate
        })
        .eq("id", offer.id);
        
      if (error) throw error;
      toast({ title: "تم حفظ التعديلات وتحديث العرض بنجاح ✅" });
      setIsEditing(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast({ title: "فشل حفظ التعديلات", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const html = `
      <html>
        <head>
          <title>عرض عمل - ${offer.candidate_name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; padding: 50px; color: #333; line-height: 1.8; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid #1e4a8a; padding-bottom: 20px; margin-bottom: 40px; }
            .logo { font-size: 24px; font-weight: bold; color: #1e4a8a; }
            .date { font-size: 14px; color: #666; }
            .title { text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 30px; color: #1e4a8a; text-decoration: underline; }
            .salutation { font-size: 16px; font-weight: bold; margin-bottom: 20px; }
            .content { font-size: 15px; margin-bottom: 30px; text-align: justify; }
            .details-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            .details-table td { padding: 12px; border: 1px solid #ddd; font-size: 14px; }
            .details-label { font-weight: bold; background-color: #f8f9fa; width: 30%; }
            .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
            .sig-block { text-align: center; width: 45%; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Tawzeef-X (منصة توظيف-إكس)</div>
            <div class="date">التاريخ: ${new Date().toLocaleDateString('ar-SA')}</div>
          </div>
          
          <div class="title">عرض عمل رسمي وتفاصيل الوظيفة</div>
          
          <div class="salutation">السيد / السيدة: ${offer.candidate_name} المحترم</div>
          
          <div class="content">
            يسرنا أن نقدم لك هذا العرض الرسمي للانضمام إلى فريق عملنا. لقد أثارت مؤهلاتك وسيرتك المهنية إعجابنا الشديد خلال مراحل التقييم المختلفة، ونحن على ثقة بأن انضمامك إلينا سيكون إضافة نوعية وقيمة لمسيرتنا المشتركة.
          </div>
          
          <table class="details-table">
            <tr>
              <td class="details-label">المسمى الوظيفي</td>
              <td>${position}</td>
            </tr>
            <tr>
              <td class="details-label">الراتب الأساسي</td>
              <td>${new Intl.NumberFormat("ar-SA").format(salary)} ${offer.currency || "SAR"} شهرياً</td>
            </tr>
            <tr>
              <td class="details-label">البدلات والمميزات</td>
              <td>${benefits || "غير محدد"}</td>
            </tr>
            <tr>
              <td class="details-label">تاريخ مباشرة العمل</td>
              <td>${new Date(startDate).toLocaleDateString('ar-SA')}</td>
            </tr>
            <tr>
              <td class="details-label">حالة العرض</td>
              <td>عرض عمل رسمي (مسودة مصدقة)</td>
            </tr>
          </table>
          
          <div class="content">
            يرجى مراجعة تفاصيل هذا العرض بعناية وإعلامنا بقرارك بالقبول أو الرفض في أقرب وقت مناسب.
          </div>
          
          <div class="signatures">
            <div class="sig-block">
              <strong>توقيع ممثل الشركة</strong>
              <p style="margin-top: 40px;">_________________________</p>
            </div>
            <div class="sig-block">
              <strong>توقيع وقبول المرشح</strong>
              <p style="margin-top: 40px;">_________________________</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="mt-4 p-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-background shadow-xl space-y-4 max-w-full overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary animate-pulse" />
          <div>
            <h3 className="font-bold text-sm text-foreground">
              محرر عرض العمل التفاعلي لـ {offer.candidate_name}
            </h3>
            <p className="text-[10px] text-muted-foreground">تعديل وصياغة العرض والخطاب الرسمي</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-[10px] gap-1 hover:text-primary font-bold"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit3 className="w-3.5 h-3.5" />
            {isEditing ? "إلغاء التعديل" : "تعديل التفاصيل"}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/20 p-3 rounded-xl border border-border/40">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-muted-foreground block">المسمى الوظيفي:</label>
              <input 
                type="text" 
                value={position} 
                onChange={(e) => setPosition(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border bg-background font-bold focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-muted-foreground block">الراتب الأساسي:</label>
              <input 
                type="number" 
                value={salary} 
                onChange={(e) => setSalary(Number(e.target.value))}
                className="w-full text-xs p-2 rounded-lg border bg-background font-bold focus:outline-none"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[9px] font-bold text-muted-foreground block">البدلات والمميزات:</label>
              <input 
                type="text" 
                value={benefits} 
                onChange={(e) => setBenefits(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border bg-background focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-muted-foreground block">تاريخ البدء:</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border bg-background focus:outline-none"
              />
            </div>
            <div className="flex items-end justify-end pt-3 sm:col-span-2">
              <Button 
                size="sm" 
                className="h-8 gap-1 text-xs font-bold"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                حفظ التعديلات
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 space-y-2">
            <div className="flex justify-between text-xs border-b border-border/20 pb-1.5">
              <span className="text-muted-foreground">المسمى الوظيفي:</span>
              <span className="font-bold text-foreground">{position}</span>
            </div>
            <div className="flex justify-between text-xs border-b border-border/20 pb-1.5">
              <span className="text-muted-foreground">الراتب المقترح:</span>
              <span className="font-black text-primary">{new Intl.NumberFormat("ar-SA").format(salary)} {offer.currency || "SAR"}</span>
            </div>
            <div className="flex justify-between text-xs border-b border-border/20 pb-1.5">
              <span className="text-muted-foreground">المميزات:</span>
              <span className="text-muted-foreground text-[10px] truncate max-w-[200px]">{benefits}</span>
            </div>
            <div className="flex justify-between text-xs pb-0.5">
              <span className="text-muted-foreground">تاريخ البدء:</span>
              <span className="font-bold text-foreground">{new Date(startDate).toLocaleDateString('ar-SA')}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border/30">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 text-xs h-9 gap-1.5 font-bold border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-all"
          onClick={() => {
            navigator.clipboard.writeText(`http://localhost:8080/offer/${offer.token}`);
            toast({ title: "تم نسخ رابط العرض بنجاح 🔗" });
          }}
        >
          نسخ رابط العرض
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 text-xs h-9 gap-1.5 font-bold hover:bg-muted transition-all"
          onClick={handlePrint}
        >
          <Printer className="w-3.5 h-3.5" />
          تحميل كـ PDF / طباعة العرض
        </Button>
        <Button 
          size="sm" 
          className="text-xs h-9 gap-1.5 font-bold"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? "إخفاء الخطاب" : "معاينة الخطاب الرسمي"}
        </Button>
      </div>

      {showPreview && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }} 
          animate={{ opacity: 1, height: "auto" }}
          className="p-5 border border-border/50 bg-white dark:bg-zinc-950 rounded-xl shadow-inner space-y-4 text-zinc-800 dark:text-zinc-200 text-[11px] leading-relaxed max-w-full overflow-hidden text-right"
        >
          <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <span className="font-bold text-primary">Tawzeef-X Official Offer Letter</span>
            <span className="text-[10px] text-zinc-400 font-mono">{new Date().toLocaleDateString('ar-SA')}</span>
          </div>
          
          <div className="space-y-3 font-medium">
            <p className="font-bold text-zinc-900 dark:text-white">السيد/السيدة {offer.candidate_name} المحترم،</p>
            <p>يسعدنا جداً تقديم هذا العرض لشغل منصب <span className="font-bold text-primary">{position}</span> في فريق عملنا.</p>
            <p>سيكون راتبك الأساسي <span className="font-bold text-primary">{new Intl.NumberFormat("ar-SA").format(salary)} {offer.currency || "SAR"}</span> شهرياً شامل جميع البدلات.</p>
            <p>البدلات والمميزات المرفقة بالعرض: {benefits}.</p>
            <p>نتطلع لمباشرة العمل اعتباراً من تاريخ {new Date(startDate).toLocaleDateString('ar-SA')}.</p>
            <p className="pt-2 text-[10px] text-zinc-400">توقيع ممثل منصة التوظيف: _________________________</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
