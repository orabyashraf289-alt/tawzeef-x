import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  Link2,
  Mail,
  Webhook,
  Calendar,
  MessageSquare,
  Globe,
  Building,
  ShieldCheck,
} from "lucide-react";

interface IntegrationItem {
  id: string;
  name: string;
  nameEn: string;
  detail: string;
  detailEn: string;
  endpointOrTech: string;
  icon: React.ElementType;
}

const VERIFIED_INTEGRATIONS: IntegrationItem[] = [
  {
    id: "linkedin",
    name: "LinkedIn OAuth ونشر الوظائف",
    nameEn: "LinkedIn OAuth & Job Post",
    detail: "مصادقة OAuth ونشر مباشر للوظائف مع دعم Zapier Webhook",
    detailEn: "OAuth connect & direct job sharing with Zapier webhook fallback",
    endpointOrTech: "linkedin-oauth • linkedin-post",
    icon: Link2,
  },
  {
    id: "email-smtp",
    name: "البريد الإلكتروني و SMTP",
    nameEn: "Email & SMTP",
    detail: "إعدادات SMTP مشفرة (AES-GCM)، إرسال، جدولة، وتتبع البريد",
    detailEn: "AES-GCM SMTP config, sending, scheduled queues & open tracking",
    endpointOrTech: "manage-smtp • send-email • process-scheduled-emails",
    icon: Mail,
  },
  {
    id: "webhooks-zapier",
    name: "Webhooks و Zapier",
    nameEn: "Webhooks & Zapier",
    detail: "تنبيهات موقعة بـ HMAC-SHA256 مع سجل تسليمات وربط Zapier",
    detailEn: "HMAC-SHA256 signed outgoing webhooks, delivery logs & Zapier triggers",
    endpointOrTech: "send-webhook",
    icon: Webhook,
  },
  {
    id: "calendar-ics",
    name: "مزامنة التقويم وحماية التعارض (.ics + Google/Outlook)",
    nameEn: "Calendar Sync, Conflict Guard & .ics Feed",
    detail: "تغذية .ics الموقّعة + حفظ ربط Google/Outlook ومنع حجز المقابلات المتداخلة زمنياً",
    detailEn: "Signed RFC 5545 .ics feed, Google/Outlook/iCal sync preferences & time-overlap conflict check",
    endpointOrTech: "calendar-ics-feed • calendar_sync_connections",
    icon: Calendar,
  },
  {
    id: "whatsapp-sms-automation",
    name: "أتمتة WhatsApp Cloud API ورسائل SMS",
    nameEn: "WhatsApp Cloud API & SMS Automation",
    detail: "تنفيذ إشعارات WhatsApp (Meta Cloud API) وSMS (Twilio / Gateway) من طابور الأتمتة مع التحقق الصارم من المفاتيح",
    detailEn: "Outbound Meta WhatsApp & Twilio/Gateway SMS actions via queue worker with explicit secret gating",
    endpointOrTech: "execute-automation-actions • send_whatsapp • send_sms",
    icon: MessageSquare,
  },
];

const PLANNED_INTEGRATIONS: IntegrationItem[] = [
  {
    id: "calendar-two-way-oauth",
    name: "مزامنة OAuth الثنائية التلقائية من الخادم",
    nameEn: "Server-Side Bidirectional Calendar OAuth",
    detail: "تتوفر التغذية الموقّعة وفحص التعارض المحلي وإعدادات الربط؛ المزامنة الفورية بالاتجاهين تتطلب أسرار OAuth المؤسسية",
    detailEn: "Signed .ics feed, connection store & overlap checks are live; real-time OAuth push awaits client secrets",
    endpointOrTech: "Needs OAuth Secrets",
    icon: Calendar,
  },
  {
    id: "slack-teams",
    name: "Slack و Microsoft Teams",
    nameEn: "Slack & Microsoft Teams",
    detail: "مكتمل بالكامل عبر بطاقات Slack Block Kit وبطاقات Teams التفاعلية مع تنبيهات فورية للمرشحين والمقابلات والعروض",
    detailEn: "Fully implemented with Slack Block Kit & Teams Adaptive Cards for candidates, interviews and offers",
    endpointOrTech: "Live & Connected",
    icon: Link2,
  },
  {
    id: "indeed-bayt",
    name: "Indeed و Bayt.com",
    nameEn: "Indeed & Bayt.com",
    detail: "لا يوجد ربط API للنشر المباشر أو مزامنة المتقدمين بعد",
    detailEn: "No direct job-board API posting or applicant sync implemented yet",
    endpointOrTech: "Planned",
    icon: Globe,
  },
  {
    id: "sap-oracle",
    name: "أنظمة HR (SAP / Oracle)",
    nameEn: "Enterprise HRIS (SAP / Oracle)",
    detail: "لا يوجد موصّل فعلي لأنظمة ERP/HRIS المؤسسية حتى الآن",
    detailEn: "No live SAP or Oracle HRIS connector implemented yet",
    endpointOrTech: "Planned",
    icon: Building,
  },
];

export interface IntegrationRealitySummaryProps {
  isAr: boolean;
}

export default function IntegrationRealitySummary({ isAr }: IntegrationRealitySummaryProps) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">
              {isAr ? "الوضع الفعلي للتكاملات الخارجية" : "Verified Integration Reality"}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              {isAr
                ? `${VERIFIED_INTEGRATIONS.length} مفعّلة فعلياً`
                : `${VERIFIED_INTEGRATIONS.length} Verified Active`}
            </Badge>
            <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10">
              {isAr
                ? `${PLANNED_INTEGRATIONS.length} مخططة / غير مبنية`
                : `${PLANNED_INTEGRATIONS.length} Planned / Unbuilt`}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {isAr
            ? "ملخص مطابق للوظائف السحابية وواجهات البرمجة الموجودة فعلياً في الكود دون مبالغة"
            : "Live capability audit grounded strictly in implemented Edge Functions and services"}
        </p>
      </CardHeader>

      <CardContent className="grid gap-4 md:grid-cols-2">
        {/* Verified Implemented */}
        <div className="space-y-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{isAr ? "تكاملات منفّذة ومُتحقّق منها" : "Verified Implemented Integrations"}</span>
          </div>
          <ul className="space-y-2">
            {VERIFIED_INTEGRATIONS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id} className="flex items-start gap-2.5 text-xs">
                  <Icon className="w-3.5 h-3.5 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-foreground">
                        {isAr ? item.name : item.nameEn}
                      </span>
                      <code className="text-[10px] px-1.5 py-0.5 rounded bg-background/80 border border-border/50 text-muted-foreground">
                        {item.endpointOrTech}
                      </code>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {isAr ? item.detail : item.detailEn}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Planned / Unbuilt */}
        <div className="space-y-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
            <Clock className="w-4 h-4 shrink-0" />
            <span>{isAr ? "تكاملات مخططة / غير مبنية بعد" : "Planned / Unbuilt Integrations"}</span>
          </div>
          <ul className="space-y-2">
            {PLANNED_INTEGRATIONS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id} className="flex items-start gap-2.5 text-xs">
                  <Icon className="w-3.5 h-3.5 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-foreground">
                        {isAr ? item.name : item.nameEn}
                      </span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-amber-600 border-amber-500/30">
                        {isAr ? "غير مبني" : "Unbuilt"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {isAr ? item.detail : item.detailEn}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
