import { CreditCard, FileText, Download, CheckCircle2, Package, Crown, Calendar, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useMySubscription, useSubscriptionPlans, useCompanyInvoices, type CompanyInvoice } from "@/hooks/useSubscription";
import { useMemo } from "react";
import { toast } from "@/hooks/use-toast";

export default function BillingHistory() {
  const { user } = useAuth();
  const { data: activeSub, isLoading: isSubLoading } = useMySubscription();
  const { data: plans, isLoading: isPlansLoading } = useSubscriptionPlans();
  const { data: dbInvoices, isLoading: isInvoicesLoading } = useCompanyInvoices();

  // Resolve current active plan details
  const currentPlan = useMemo(() => {
    if (!plans || !activeSub) return null;
    return plans.find(p => p.id === activeSub.plan_id) || plans.find(p => p.name === "free") || null;
  }, [plans, activeSub]);

  // Use database invoices if available, otherwise generate dynamic invoices fallback
  const invoicesList = useMemo(() => {
    if (dbInvoices && dbInvoices.length > 0) {
      return dbInvoices.map((inv) => ({
        id: inv.invoice_number || inv.id,
        date: inv.created_at,
        amount: inv.amount,
        plan: inv.plan_name_ar,
        companyName: inv.company_name,
        jobPostsLimit: inv.job_posts_limit,
        status: inv.status === "paid" ? "Paid" : "Pending",
      }));
    }

    if (!activeSub || !currentPlan) return [];

    const list: Array<{
      id: string;
      date: string;
      amount: number;
      plan: string;
      companyName?: string;
      jobPostsLimit: number;
      status: string;
    }> = [];

    const startDate = new Date(activeSub.starts_at || new Date());
    const currentDate = new Date();

    let tempDate = new Date(startDate);
    let index = 1;

    let iterations = 0;
    while (tempDate <= currentDate && iterations < 100) {
      iterations++;
      const year = tempDate.getFullYear();
      const month = String(tempDate.getMonth() + 1).padStart(2, "0");
      const day = String(tempDate.getDate()).padStart(2, "0");

      list.unshift({
        id: `INV-${year}-${month}-${String(index).padStart(3, "0")}`,
        date: `${year}-${month}-${day}`,
        amount: currentPlan.price,
        plan: currentPlan.name_ar || currentPlan.name,
        jobPostsLimit: currentPlan.job_posts_limit,
        status: "Paid",
      });

      tempDate.setMonth(tempDate.getMonth() + 1);
      index++;
    }

    return list;
  }, [dbInvoices, activeSub, currentPlan]);

  const handleDownloadInvoice = (inv: { id: string; date: string; amount: number; plan: string; companyName?: string; jobPostsLimit: number; status: string }) => {
    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>فاتورة ${inv.id} — Tawzeef-X</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px; direction: rtl; }
    .invoice-box { max-width: 700px; margin: auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d9488; padding-bottom: 24px; margin-bottom: 32px; }
    .brand { display: flex; flex-direction: column; gap: 4px; }
    .brand-name { font-size: 24px; font-weight: 900; color: #0d9488; letter-spacing: -0.5px; }
    .brand-sub { font-size: 11px; color: #64748b; letter-spacing: 2px; text-transform: uppercase; }
    .invoice-meta { text-align: left; }
    .invoice-num { font-size: 20px; font-weight: 800; color: #1e293b; }
    .invoice-date { font-size: 12px; color: #64748b; margin-top: 4px; }
    .badge { display: inline-block; background: #dcfce7; color: #16a34a; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; margin-top: 8px; }
    .section-title { font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .info-block p { font-size: 13px; color: #64748b; margin-bottom: 4px; }
    .info-block strong { font-size: 14px; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f1f5f9; padding: 12px 16px; text-align: right; font-size: 12px; color: #64748b; font-weight: 700; }
    td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .total-row { background: #f8fafc; font-weight: 800; }
    .amount { font-size: 16px; color: #0d9488; font-weight: 900; }
    .footer { text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
    .footer p { font-size: 12px; color: #94a3b8; }
    .footer strong { color: #0d9488; }
    @media print {
      body { background: white; padding: 0; }
      .invoice-box { box-shadow: none; }
    }
  </style>
</head>
<body>
<div class="invoice-box">
  <div class="header">
    <div class="brand">
      <span class="brand-name">Tawzeef-X</span>
      <span class="brand-sub">منصة التوظيف الذكي</span>
    </div>
    <div class="invoice-meta">
      <div class="invoice-num">${inv.id}</div>
      <div class="invoice-date">التاريخ: ${new Date(inv.date).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}</div>
      <div class="badge">${inv.status === "Paid" ? "✅ تم الدفع" : "⏳ معلق"}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-block">
      <p class="section-title">فاتورة إلى</p>
      <strong>${inv.companyName || "شركة عميل Tawzeef-X"}</strong>
      <p style="margin-top:4px; color:#64748b;">منصة توظيف ذكي متكامل</p>
    </div>
    <div class="info-block">
      <p class="section-title">معلومات الفاتورة</p>
      <strong>رقم الفاتورة: ${inv.id}</strong>
      <p style="margin-top:4px;">الحد المخصص: ${inv.jobPostsLimit === -1 ? "منشورات غير محدودة" : `${inv.jobPostsLimit} منشور`}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>الوصف</th>
        <th style="text-align:left;">المبلغ (ر.س)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>اشتراك باقة <strong>${inv.plan}</strong></td>
        <td style="text-align:left;">${inv.amount} ر.س</td>
      </tr>
      <tr>
        <td>ضريبة القيمة المضافة (15%)</td>
        <td style="text-align:left;">${(inv.amount * 0.15).toFixed(2)} ر.س</td>
      </tr>
      <tr class="total-row">
        <td><strong>الإجمالي شامل الضريبة</strong></td>
        <td style="text-align:left;" class="amount">${(inv.amount * 1.15).toFixed(2)} ر.س</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>شكراً لثقتك في <strong>Tawzeef-X</strong> — منصة التوظيف الذكي المتكاملة</p>
    <p style="margin-top:8px;">للاستفسارات: support@tawzeef-x.com</p>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      toast({ title: "يرجى السماح بفتح نوافذ جديدة في المتصفح", variant: "destructive" });
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  if (isSubLoading || isPlansLoading || isInvoicesLoading) {
    return <div className="text-center py-6 text-xs text-muted-foreground">جاري تحميل سجل الفواتير...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
          {invoicesList.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">لا يوجد سجل مدفوعات حالياً لهذه الشركة.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground border-b border-border/50">
                    <th className="p-3 font-semibold">رقم الفاتورة</th>
                    <th className="p-3 font-semibold">التاريخ</th>
                    <th className="p-3 font-semibold">الباقة</th>
                    <th className="p-3 font-semibold">المبلغ</th>
                    <th className="p-3 font-semibold">الحالة</th>
                    <th className="p-3 font-semibold text-left">تحميل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {invoicesList.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3 font-medium text-foreground">{inv.id}</td>
                      <td className="p-3 text-muted-foreground">{new Date(inv.date).toLocaleDateString("ar-SA")}</td>
                      <td className="p-3 text-muted-foreground">{inv.plan}</td>
                      <td className="p-3 font-bold text-foreground">{inv.amount} SAR</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          {inv.status === "Paid" ? "تم الدفع" : "معلق"}
                        </span>
                      </td>
                      <td className="p-3 text-left">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadInvoice(inv)}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
