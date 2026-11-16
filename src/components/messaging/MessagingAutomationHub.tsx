import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useAutomationRules } from '@/hooks/useAutomation';
import {
  RECRUITMENT_TEMPLATES,
  COMMON_VARIABLES,
  interpolateText,
  generateWhatsAppLink,
  type RecruitmentMessageTemplate,
} from '@/lib/messagingTemplates';
import InteractiveMessageSimulator from './InteractiveMessageSimulator';
import {
  MessageSquare,
  Mail,
  Smartphone,
  Send,
  Copy,
  ExternalLink,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function MessagingAutomationHub() {
  const {
    rules,
    outboundQueue = [],
    outboundQueueLoading = false,
    dispatchOutboundQueue,
    dispatchingQueue = false,
    providerStatus,
  } = useAutomationRules();

  const [activeChannel, setActiveChannel] = useState<'whatsapp' | 'email' | 'sms'>('whatsapp');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('interview_invite');
  const [testCandidateName, setTestCandidateName] = useState<string>('أحمد السالم');
  const [testJobTitle, setTestJobTitle] = useState<string>('مدير منتجات تقنية');
  const [testPhone, setTestPhone] = useState<string>('+966501234567');
  const [testEmail, setTestEmail] = useState<string>('ahmed.salem@example.com');

  const selectedTemplate =
    RECRUITMENT_TEMPLATES.find((t) => t.id === selectedTemplateId) || RECRUITMENT_TEMPLATES[0];

  const testVars: Record<string, string> = {
    candidate_name: testCandidateName,
    job_title: testJobTitle,
    company_name: 'توظيف إكس (Tawzeef X)',
    stage_name: 'المقابلة التقنية',
    interview_date: 'الخميس 19 نوفمبر 2026',
    interview_time: '11:00 ص بتوقيت الرياض',
    interview_link: 'https://www.tawzeefx.com/meeting/tx-sample-room',
    portal_link: 'https://www.tawzeefx.com/candidate/portal',
    offer_expiry: '48 ساعة',
    assessment_title: 'اختبار القيادة وإدارة المنتجات',
  };

  const previewWhatsApp = interpolateText(selectedTemplate.whatsapp.text, testVars);
  const previewEmailSubject = interpolateText(selectedTemplate.email.subject, testVars);
  const previewEmailBody = interpolateText(selectedTemplate.email.bodyHtml, testVars);
  const previewSms = interpolateText(selectedTemplate.sms.text, testVars);

  const handleCopyTemplate = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'تم نسخ نص القالب بنجاح ✅' });
  };

  const handleTestWhatsAppLink = () => {
    const link = generateWhatsAppLink(testPhone, previewWhatsApp);
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  // Filter rules that contain messaging actions
  const messagingRules = rules.filter((r) =>
    r.actions.some((a) => ['send_whatsapp', 'send_email', 'send_sms'].includes(a.type)),
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-l from-emerald-500/10 via-primary/5 to-transparent p-6 rounded-3xl border border-emerald-500/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                مركز أتمتة الرسائل وواتساب الذكي
              </h2>
              <p className="text-xs text-muted-foreground">
                إرسال إشعارات فورية وموثقة للمرشحين عبر واتساب الرسمي (Meta API) والبريد الإلكتروني والـ SMS
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatchOutboundQueue()}
            disabled={dispatchingQueue}
            className="rounded-xl gap-2 text-xs h-10 border-emerald-500/30 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
          >
            <RefreshCw className={`w-4 h-4 ${dispatchingQueue ? 'animate-spin' : ''}`} />
            معالجة طابور الإرسال الآلي ({outboundQueue.length})
          </Button>
        </div>
      </div>

      {/* Provider Connectivity Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 rounded-2xl border-border/60 bg-card/60 backdrop-blur-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold">واتساب للأعمال (Meta)</p>
              <p className="text-[11px] text-muted-foreground">Meta Cloud API</p>
            </div>
          </div>
          <Badge variant={providerStatus?.send_whatsapp?.configured ? 'default' : 'secondary'} className="text-[10px]">
            {providerStatus?.send_whatsapp?.configured ? 'متصل وجاهز' : 'وضع المحاكاة المباشر'}
          </Badge>
        </Card>

        <Card className="p-4 rounded-2xl border-border/60 bg-card/60 backdrop-blur-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold">البريد الإلكتروني (SMTP/Resend)</p>
              <p className="text-[11px] text-muted-foreground">قوالب تفاعلية HTML</p>
            </div>
          </div>
          <Badge variant={providerStatus?.send_email?.configured ? 'default' : 'secondary'} className="text-[10px]">
            {providerStatus?.send_email?.configured ? 'نشط' : 'جاهز'}
          </Badge>
        </Card>

        <Card className="p-4 rounded-2xl border-border/60 bg-card/60 backdrop-blur-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold">بوابة الرسائل القصيرة (SMS)</p>
              <p className="text-[11px] text-muted-foreground">رسائل التنبيه العاجلة</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {providerStatus?.send_sms?.configured ? 'نشط' : 'جاهز'}
          </Badge>
        </Card>
      </div>

      {/* Main Interactive Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Template Catalog & Customizer */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-5 rounded-3xl border-border/60 bg-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                مكتبة قوالب التوظيف المعتمدة
              </h3>
              <Badge variant="outline" className="text-xs">
                {RECRUITMENT_TEMPLATES.length} قوالب ذكية
              </Badge>
            </div>

            {/* Template Buttons Carousel / List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {RECRUITMENT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`text-right p-3 rounded-2xl border transition-all ${
                    selectedTemplateId === tpl.id
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                      : 'border-border/60 hover:border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground">{tpl.title}</span>
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                      {tpl.category}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{tpl.description}</p>
                </button>
              ))}
            </div>

            {/* Template Variables Legend */}
            <div className="p-3 bg-muted/40 rounded-2xl border border-border/40 space-y-2">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                المتغيرات الديناميكية المدعومة تلقائياً:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedTemplate.variables.map((v) => (
                  <Badge
                    key={v.key}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 text-[11px] font-mono py-0.5"
                    onClick={() => handleCopyTemplate(`{{${v.key}}}`)}
                    title={`انقر لنسخ {{${v.key}}}`}
                  >
                    {`{{${v.key}}}`} : {v.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Test Simulation Controls */}
            <div className="pt-4 border-t mt-4 space-y-3">
              <p className="text-xs font-bold text-foreground">بيانات تجربة الإرسال التفاعلية:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">اسم المرشح التجريبي</label>
                  <Input
                    value={testCandidateName}
                    onChange={(e) => setTestCandidateName(e.target.value)}
                    className="h-8 text-xs rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">المسمى الوظيفي</label>
                  <Input
                    value={testJobTitle}
                    onChange={(e) => setTestJobTitle(e.target.value)}
                    className="h-8 text-xs rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">رقم الهاتف (واتساب)</label>
                  <Input
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="h-8 text-xs font-mono rounded-xl"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">البريد الإلكتروني</label>
                  <Input
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="h-8 text-xs font-mono rounded-xl"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Live Interactive Device Simulator */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-4 rounded-3xl border-border/60 bg-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">معاينة الشاشة الحية للمرشح</h3>
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
                <Button
                  size="sm"
                  variant={activeChannel === 'whatsapp' ? 'default' : 'ghost'}
                  className={`h-7 px-2.5 text-[11px] rounded-lg ${
                    activeChannel === 'whatsapp' ? 'bg-emerald-600 text-white' : ''
                  }`}
                  onClick={() => setActiveChannel('whatsapp')}
                >
                  واتساب 📱
                </Button>
                <Button
                  size="sm"
                  variant={activeChannel === 'email' ? 'default' : 'ghost'}
                  className={`h-7 px-2.5 text-[11px] rounded-lg ${
                    activeChannel === 'email' ? 'bg-blue-600 text-white' : ''
                  }`}
                  onClick={() => setActiveChannel('email')}
                >
                  البريد ✉️
                </Button>
                <Button
                  size="sm"
                  variant={activeChannel === 'sms' ? 'default' : 'ghost'}
                  className={`h-7 px-2.5 text-[11px] rounded-lg ${
                    activeChannel === 'sms' ? 'bg-slate-700 text-white' : ''
                  }`}
                  onClick={() => setActiveChannel('sms')}
                >
                  SMS
                </Button>
              </div>
            </div>

            <InteractiveMessageSimulator
              channel={activeChannel}
              content={{
                whatsappText: previewWhatsApp,
                emailSubject: previewEmailSubject,
                emailBodyHtml: previewEmailBody,
                smsText: previewSms,
                recipientName: testCandidateName,
                recipientPhone: testPhone,
                recipientEmail: testEmail,
                companyName: 'توظيف إكس (Tawzeef X)',
              }}
            />

            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleCopyTemplate(
                    activeChannel === 'email' ? previewEmailBody : previewWhatsApp,
                  )
                }
                className="flex-1 rounded-xl text-xs h-9 gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                نسخ النص المخصص
              </Button>
              {activeChannel === 'whatsapp' && (
                <Button
                  size="sm"
                  onClick={handleTestWhatsAppLink}
                  className="flex-1 rounded-xl text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  تجربة إرسال عبر واتساب
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Connected Outbound Automation Rules Section */}
      <Card className="p-5 rounded-3xl border-border/60 bg-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold">قواعد الأتمتة المربوطة بالمراسلة الفورية</h3>
            <p className="text-xs text-muted-foreground">
              السيناريوهات التي تفعل إرسال واتساب أو بريد إلكتروني تلقائياً بناءً على أحداث التوظيف
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {messagingRules.length} قواعد نشطة
          </Badge>
        </div>

        {messagingRules.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-2xl">
            لا توجد قواعد أتمتة حالية ترسل رسائل خارجية. يمكنك إنشاء قاعدة جديدة من تبويب &quot;محرك الأتمتة&quot;.
          </div>
        ) : (
          <div className="space-y-2">
            {messagingRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-3 rounded-2xl border border-border/50 bg-muted/20 text-xs"
              >
                <div className="flex items-center gap-3">
                  <Badge variant={rule.is_active ? 'default' : 'secondary'} className="text-[10px]">
                    {rule.is_active ? 'مفعلة' : 'متوقفة'}
                  </Badge>
                  <span className="font-bold text-foreground">{rule.name}</span>
                  <span className="text-muted-foreground font-mono text-[11px]">{rule.trigger_event}</span>
                </div>
                <div className="flex items-center gap-2">
                  {rule.actions.map((act, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] gap-1 bg-background">
                      {act.type === 'send_whatsapp' && <MessageSquare className="w-3 h-3 text-emerald-600" />}
                      {act.type === 'send_email' && <Mail className="w-3 h-3 text-blue-600" />}
                      {act.type === 'send_sms' && <Smartphone className="w-3 h-3 text-purple-600" />}
                      {act.type === 'send_whatsapp'
                        ? 'واتساب'
                        : act.type === 'send_email'
                        ? 'بريد'
                        : act.type === 'send_sms'
                        ? 'SMS'
                        : act.type}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
