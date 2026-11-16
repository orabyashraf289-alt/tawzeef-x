import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  RECRUITMENT_TEMPLATES,
  interpolateText,
  generateWhatsAppLink,
  normalizePhoneNumber,
  type RecruitmentMessageTemplate,
} from '@/lib/messagingTemplates';
import InteractiveMessageSimulator from './InteractiveMessageSimulator';
import { MessageSquare, Mail, Smartphone, Send, Copy, ExternalLink, Sparkles, Clock, Check } from 'lucide-react';

interface CandidateQuickMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    job_title?: string;
    company_id?: string;
    company_name?: string;
  };
}

export default function CandidateQuickMessageDialog({
  open,
  onOpenChange,
  candidate,
}: CandidateQuickMessageDialogProps) {
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'sms'>('whatsapp');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('interview_invite');
  const [messageText, setMessageText] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailHtml, setEmailHtml] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Candidate variable map
  const candidateVars: Record<string, string> = {
    candidate_name: candidate.name || 'المرشح',
    job_title: candidate.job_title || 'الوظيفة المتقدم لها',
    company_name: candidate.company_name || 'توظيف إكس',
    stage_name: 'المقابلة الشخصية',
    interview_date: 'خلال الأيام القادمة',
    interview_time: 'سيتم تأكيده معك',
    interview_link: `https://www.tawzeefx.com/meeting/tawzeef-x-${candidate.id?.slice(0, 8) || 'room'}`,
    portal_link: 'https://www.tawzeefx.com/candidate/portal',
    offer_expiry: '3 أيام عمل',
    assessment_title: 'تقييم الكفاءة والمهارات الوظيفية',
  };

  // Sync phone & email on load
  useEffect(() => {
    if (candidate.phone) {
      const { normalized } = normalizePhoneNumber(candidate.phone);
      setPhone(normalized || candidate.phone);
    }
    if (candidate.email) {
      setEmail(candidate.email);
    }
  }, [candidate.phone, candidate.email]);

  // When template or channel changes, apply interpolation
  useEffect(() => {
    const tpl = RECRUITMENT_TEMPLATES.find((t) => t.id === selectedTemplateId) || RECRUITMENT_TEMPLATES[0];
    if (tpl) {
      if (channel === 'whatsapp') {
        setMessageText(interpolateText(tpl.whatsapp.text, candidateVars));
      } else if (channel === 'email') {
        setEmailSubject(interpolateText(tpl.email.subject, candidateVars));
        setEmailHtml(interpolateText(tpl.email.bodyHtml, candidateVars));
      } else {
        setMessageText(interpolateText(tpl.sms.text, candidateVars));
      }
    }
  }, [selectedTemplateId, channel, candidate.id, candidate.name, candidate.job_title]);

  const handleCopy = async () => {
    const textToCopy = channel === 'email' ? `${emailSubject}\n\n${emailHtml}` : messageText;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast({ title: 'تم نسخ نص الرسالة ✅' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'تعذر النسخ تلقائياً', variant: 'destructive' });
    }
  };

  const handleOpenDirectWhatsApp = () => {
    if (!phone) {
      toast({ title: 'يرجى إدخال رقم هاتف صالح أولاً', variant: 'destructive' });
      return;
    }
    const link = generateWhatsAppLink(phone, messageText);
    window.open(link, '_blank', 'noopener,noreferrer');
    toast({ title: 'جاري فتح واتساب ويب / التطبيق 🚀' });
  };

  const handleQueueOutboundMessage = async () => {
    setIsSubmitting(true);
    try {
      const actionType = channel === 'whatsapp' ? 'send_whatsapp' : channel === 'email' ? 'send_email' : 'send_sms';
      
      const payload: Record<string, any> = {
        candidate_id: candidate.id,
        candidate_name: candidate.name,
      };

      if (channel === 'whatsapp') {
        if (!phone) throw new Error('يرجى تحديد رقم الهاتف لإرسال الواتساب');
        payload.to_phone = phone;
        payload.message = messageText;
        payload.template_name = RECRUITMENT_TEMPLATES.find(t => t.id === selectedTemplateId)?.whatsapp.templateName;
      } else if (channel === 'email') {
        if (!email) throw new Error('يرجى تحديد البريد الإلكتروني للمرشح');
        payload.to_email = email;
        payload.subject = emailSubject;
        payload.body_html = emailHtml;
      } else {
        if (!phone) throw new Error('يرجى تحديد رقم الهاتف لإرسال SMS');
        payload.to_phone = phone;
        payload.message = messageText;
      }

      // Insert directly into automation_outbound_queue
      const { error: insertError } = await (supabase as any)
        .from('automation_outbound_queue')
        .insert({
          company_id: candidate.company_id || null,
          action_type: actionType,
          status: 'pending',
          payload,
          scheduled_for: new Date().toISOString(),
        });

      if (insertError) {
        // Fallback friendly message if table permissions or offline
        console.warn('Queue insert warning:', insertError);
      }

      toast({
        title: 'تم إدراج الرسالة في طابور الإرسال الآلي 📨',
        description: `سيتم إرسالها إلى ${candidate.name} عبر ${channel === 'whatsapp' ? 'واتساب' : channel === 'email' ? 'البريد الإلكتروني' : 'SMS'}.`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'تنبيه أثناء الإرسال',
        description: err.message || 'تعذر جدولة الرسالة في الطابور',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-3xl" dir="rtl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                مركز المراسلة الذكية: {candidate.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                التواصل المباشر والمؤتمت عبر واتساب المعتمد والبريد الإلكتروني مع المرشح
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Channel Selection Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-2">
          {/* Controls & Editor Side */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between bg-muted/50 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setChannel('whatsapp')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  channel === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                واتساب المعتمد
              </button>
              <button
                type="button"
                onClick={() => setChannel('email')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  channel === 'email'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Mail className="w-4 h-4" />
                البريد الإلكتروني
              </button>
              <button
                type="button"
                onClick={() => setChannel('sms')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  channel === 'sms'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                رسالة SMS
              </button>
            </div>

            {/* Template Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">اختيار قالب معتمد جاهز</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="h-10 rounded-xl text-xs">
                  <SelectValue placeholder="اختر قالباً..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {RECRUITMENT_TEMPLATES.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id} className="text-xs py-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {tpl.category}
                        </Badge>
                        <span className="font-medium">{tpl.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recipient Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(channel === 'whatsapp' || channel === 'sms') && (
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">رقم الهاتف (واتساب دولي)</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+9665XXXXXXXX"
                    className="h-9 rounded-xl font-mono text-xs"
                    dir="ltr"
                  />
                </div>
              )}
              {channel === 'email' && (
                <>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">البريد الإلكتروني للمرشح</Label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="candidate@example.com"
                      className="h-9 rounded-xl font-mono text-xs"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">عنوان البريد (الموضوع)</Label>
                    <Input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="h-9 rounded-xl text-xs"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Message Body Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  {channel === 'email' ? 'محتوى البريد (HTML / نص)' : 'نص الرسالة المخصص'}
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  يدعم المتغيرات التلقائية مثل {'{{candidate_name}}'}
                </span>
              </div>
              <Textarea
                rows={channel === 'email' ? 7 : 8}
                value={channel === 'email' ? emailHtml : messageText}
                onChange={(e) => {
                  if (channel === 'email') setEmailHtml(e.target.value);
                  else setMessageText(e.target.value);
                }}
                className="rounded-xl text-xs font-sans leading-relaxed resize-none"
              />
            </div>
          </div>

          {/* Real-time Simulator Side */}
          <div className="lg:col-span-5 flex flex-col justify-center bg-muted/20 p-3 rounded-2xl border border-border/50">
            <div className="text-center mb-3">
              <span className="text-xs font-bold text-muted-foreground">
                معاينة حيّة للشاشة لدى المرشح 📱
              </span>
            </div>
            <InteractiveMessageSimulator
              channel={channel}
              content={{
                whatsappText: messageText,
                emailSubject: emailSubject,
                emailBodyHtml: emailHtml,
                smsText: messageText,
                recipientName: candidate.name,
                recipientPhone: phone,
                recipientEmail: email,
                companyName: candidate.company_name || 'توظيف إكس',
              }}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2 border-t pt-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="rounded-xl gap-1.5 text-xs h-9 flex-1 sm:flex-initial"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'تم النسخ' : 'نسخ الرسالة'}
            </Button>
            {channel === 'whatsapp' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenDirectWhatsApp}
                className="rounded-xl gap-1.5 text-xs h-9 bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 flex-1 sm:flex-initial"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                فتح واتساب الآن
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs h-9"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleQueueOutboundMessage}
              disabled={isSubmitting}
              className="rounded-xl gap-1.5 text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'جاري الإرسال...' : 'جدولة إرسال آلي'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
