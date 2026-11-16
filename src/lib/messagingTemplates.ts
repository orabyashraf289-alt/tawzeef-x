/**
 * Smart Messaging & Recruitment Communication Sequences
 * Multi-channel templates for WhatsApp, Email, and SMS tailored for Saudi/GCC hiring
 */

export interface TemplateVariable {
  key: string;
  label: string;
  sample: string;
}

export type TemplateCategory = 'pipeline' | 'interview' | 'offer' | 'assessment' | 'pool';

export interface RecruitmentMessageTemplate {
  id: string;
  title: string;
  category: TemplateCategory;
  description: string;
  recommendedEvent: string;
  whatsapp: {
    templateName: string;
    text: string;
  };
  email: {
    subject: string;
    bodyHtml: string;
  };
  sms: {
    text: string;
  };
  variables: TemplateVariable[];
}

export const COMMON_VARIABLES: TemplateVariable[] = [
  { key: 'candidate_name', label: 'اسم المرشح', sample: 'سارة الأحمد' },
  { key: 'job_title', label: 'المسمى الوظيفي', sample: 'مهندس برمجيات أول' },
  { key: 'company_name', label: 'اسم الشركة', sample: 'شركة توظيف إكس للتقنية' },
  { key: 'stage_name', label: 'المرحلة الحالية', sample: 'المقابلة الفنية' },
  { key: 'interview_date', label: 'تاريخ المقابلة', sample: 'الأربعاء 18 نوفمبر 2026' },
  { key: 'interview_time', label: 'وقت المقابلة', sample: '02:30 م (بتوقيت الرياض)' },
  { key: 'interview_link', label: 'رابط غرفة المقابلة', sample: 'https://www.tawzeefx.com/meeting/tx-882' },
  { key: 'portal_link', label: 'رابط بوابة المرشح', sample: 'https://www.tawzeefx.com/candidate/portal' },
  { key: 'offer_expiry', label: 'مهلة العرض', sample: '3 أيام عمل' },
  { key: 'assessment_title', label: 'اسم التقييم', sample: 'تقييم كفاءة الأنظمة وتصميم البرمجيات' },
];

export const RECRUITMENT_TEMPLATES: RecruitmentMessageTemplate[] = [
  {
    id: 'welcome_application',
    title: 'تأكيد استلام طلب التقديم والترحيب',
    category: 'pipeline',
    description: 'يُرسل تلقائياً للمرشح فور وصول طلبه عبر البوابة لتأكيد الاستلام وبدء الفرز الأولي.',
    recommendedEvent: 'application.created',
    whatsapp: {
      templateName: 'tx_application_received_v1',
      text: `أهلاً بك {{candidate_name}} 🌟

نشكرك على اهتمامك بالانضمام إلى {{company_name}} لوظيفة *{{job_title}}*.
تم استلام ملفك وسيرتك الذاتية بنجاح وطلبك قيد المراجعة والفرز من قبل فريق الاستقطاب.

يمكنك متابعة حالة طلبك مباشرة عبر بوابتك:
{{portal_link}}

نتمنى لك كل التوفيق!
فريق التوظيف - {{company_name}}`,
    },
    email: {
      subject: 'تم استلام طلبك لوظيفة {{job_title}} في {{company_name}} بنجاح',
      bodyHtml: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 32px 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">✅ تم استلام طلبك بنجاح</h1>
    <p style="color: #d1fae5; margin: 8px 0 0; font-size: 14px;">{{company_name}}</p>
  </div>
  <div style="padding: 32px 24px;">
    <p style="font-size: 16px; color: #1e293b; margin: 0 0 16px;">مرحباً <strong>{{candidate_name}}</strong>،</p>
    <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 20px;">
      نشكرك على اهتمامك بالانضمام لفريقنا في <strong>{{company_name}}</strong> لشغل وظيفة <strong>{{job_title}}</strong>. تم تسجيل طلبك وسيرتك الذاتية في نظام التوظيف لدينا، ويقوم فريق الموارد البشرية الآن بدراسة مؤهلاتك وخبراتك.
    </p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
      <p style="font-size: 13px; color: #64748b; margin: 0 0 8px;">متابعة حالة طلب التوظيف لحظياً</p>
      <a href="{{portal_link}}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 15px; font-weight: 600;">
        دخول بوابة المرشح 🚀
      </a>
    </div>
    <p style="font-size: 14px; color: #64748b; margin: 0;">مع أطيب التحيات،<br />فريق التوظيف - {{company_name}}</p>
  </div>
</div>`,
    },
    sms: {
      text: 'مرحباً {{candidate_name}}، تم استلام طلبك لوظيفة {{job_title}} في {{company_name}} بنجاح. تابع طلبك عبر: {{portal_link}}',
    },
    variables: [
      { key: 'candidate_name', label: 'اسم المرشح', sample: 'سارة الأحمد' },
      { key: 'job_title', label: 'المسمى الوظيفي', sample: 'مهندس برمجيات أول' },
      { key: 'company_name', label: 'اسم الشركة', sample: 'شركة توظيف إكس للتقنية' },
      { key: 'portal_link', label: 'رابط بوابة المرشح', sample: 'https://www.tawzeefx.com/candidate/portal' },
    ],
  },
  {
    id: 'interview_invite',
    title: 'دعوة لمقابلة ذكية ورابط الدخول',
    category: 'interview',
    description: 'يُرسل للمرشح عند نقله لمرحلة المقابلة مع توفير رابط غرفة المقابلة وتجهيز الكاميرا والصوت.',
    recommendedEvent: 'candidate.stage_changed',
    whatsapp: {
      templateName: 'tx_interview_invitation_v1',
      text: `مرحباً {{candidate_name}} 🎯

يسعدنا إبلاغك بترشيحك للمقابلة لوظيفة *{{job_title}}* في {{company_name}}.

🗓 موعد المقابلة: {{interview_date}}
⏰ التوقيت: {{interview_time}}
📍 رابط غرفة المقابلة وتجهيز الأجهزة:
{{interview_link}}

💡 نصيحة: يُرجى استخدام متصفح حديث والتأكد من هدوء المكان واتصال الإنترنت قبل الموعد بـ 5 دقائق.

نتطلع للحديث معك قريباً!
فريق استقطاب الكفاءات - {{company_name}}`,
    },
    email: {
      subject: 'دعوة لحضور مقابلة شخصية: {{job_title}} - {{company_name}}',
      bodyHtml: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">🎯 دعوة لمقابلة شخصية</h1>
    <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px;">{{job_title}} | {{company_name}}</p>
  </div>
  <div style="padding: 32px 24px;">
    <p style="font-size: 16px; color: #1e293b; margin: 0 0 16px;">مرحباً <strong>{{candidate_name}}</strong>،</p>
    <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 20px;">
      يسعدنا إبلاغك باجتياز مرحلة الفرز المبدئي بنجاح، ويسرنا دعوتك لإجراء المقابلة الشخصية المقررة لمناقشة خبراتك والتعرف على تفاصيل الدور الوظيفي.
    </p>
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <div style="margin-bottom: 12px; font-size: 14px; color: #1e40af;">
        📅 <strong>التاريخ:</strong> {{interview_date}}
      </div>
      <div style="margin-bottom: 16px; font-size: 14px; color: #1e40af;">
        ⏰ <strong>الوقت:</strong> {{interview_time}}
      </div>
      <div style="text-align: center; margin-top: 16px;">
        <a href="{{interview_link}}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 10px; font-size: 15px; font-weight: 600;">
          دخول غرفة المقابلة الذكية 📹
        </a>
      </div>
    </div>
    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      * يمكنك من خلال الرابط أعلاه تجربة الكاميرا والمايكروفون والتأكد من جاهزية أجهزتك مسبقاً.
    </p>
    <p style="font-size: 14px; color: #64748b; margin-top: 24px;">بالتوفيق الدائم،<br />فريق التوظيف - {{company_name}}</p>
  </div>
</div>`,
    },
    sms: {
      text: 'مرحباً {{candidate_name}}، يسعدنا دعوتك لمقابلة وظيفة {{job_title}} في {{company_name}} بتاريخ {{interview_date}} {{interview_time}}. رابط الغرفة: {{interview_link}}',
    },
    variables: [
      { key: 'candidate_name', label: 'اسم المرشح', sample: 'سارة الأحمد' },
      { key: 'job_title', label: 'المسمى الوظيفي', sample: 'مهندس برمجيات أول' },
      { key: 'company_name', label: 'اسم الشركة', sample: 'شركة توظيف إكس للتقنية' },
      { key: 'interview_date', label: 'تاريخ المقابلة', sample: 'الأربعاء 18 نوفمبر 2026' },
      { key: 'interview_time', label: 'وقت المقابلة', sample: '02:30 م' },
      { key: 'interview_link', label: 'رابط المقابلة', sample: 'https://www.tawzeefx.com/meeting/tx-882' },
    ],
  },
  {
    id: 'interview_reminder_24h',
    title: 'تذكير بموعد المقابلة (قبل 24 ساعة)',
    category: 'interview',
    description: 'تذكير ودّي يُرسل آلياً للمرشح لتقليل نسبة الغياب وضمان فحص الكاميرا والصوت مسبقاً.',
    recommendedEvent: 'sla.expired',
    whatsapp: {
      templateName: 'tx_interview_reminder_24h_v1',
      text: `تذكير بموعد المقابلة ⏰

مرحباً {{candidate_name}}،
نود تذكيرك بموعد مقابلتك غداً لوظيفة *{{job_title}}* مع {{company_name}}.

🗓 التاريخ: {{interview_date}}
⏰ الوقت: {{interview_time}}
📍 رابط الانضمام:
{{interview_link}}

نتمنى لك كامل التوفيق ونحن بانتظارك! ✨`,
    },
    email: {
      subject: 'تذكير: موعد مقابلتك غداً لوظيفة {{job_title}} - {{company_name}}',
      bodyHtml: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 28px 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">⏰ تذكير بموعد مقابلتك غداً</h1>
  </div>
  <div style="padding: 28px 24px;">
    <p style="font-size: 15px; color: #1e293b; margin: 0 0 16px;">مرحباً <strong>{{candidate_name}}</strong>،</p>
    <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px;">
      نود تذكيرك بموعد مقابلتك الشخصية لوظيفة <strong>{{job_title}}</strong> لدى <strong>{{company_name}}</strong> المقررة غداً.
    </p>
    <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 18px; margin: 20px 0; text-align: center;">
      <p style="font-size: 16px; font-weight: 600; color: #b45309; margin: 0 0 8px;">{{interview_date}} - {{interview_time}}</p>
      <a href="{{interview_link}}" style="display: inline-block; background: #d97706; color: #ffffff; text-decoration: none; padding: 10px 26px; border-radius: 8px; font-size: 14px; font-weight: 600;">
        رابط المقابلة والتجهيز
      </a>
    </div>
  </div>
</div>`,
    },
    sms: {
      text: 'تذكير: موعد مقابلتك لوظيفة {{job_title}} في {{company_name}} غداً {{interview_time}}. رابط الحضور: {{interview_link}}',
    },
    variables: [
      { key: 'candidate_name', label: 'اسم المرشح', sample: 'سارة الأحمد' },
      { key: 'job_title', label: 'المسمى الوظيفي', sample: 'مهندس برمجيات أول' },
      { key: 'company_name', label: 'اسم الشركة', sample: 'شركة توظيف إكس للتقنية' },
      { key: 'interview_date', label: 'تاريخ المقابلة', sample: 'غداً الأربعاء' },
      { key: 'interview_time', label: 'وقت المقابلة', sample: '02:30 م' },
      { key: 'interview_link', label: 'رابط المقابلة', sample: 'https://www.tawzeefx.com/meeting/tx-882' },
    ],
  },
  {
    id: 'job_offer',
    title: 'إشعار صدور عرض وظيفي رسمي',
    category: 'offer',
    description: 'يُرسل للمرشح المختار عند إصدار عرض العمل وإتاحته للتوقيع والقبول الرقمي.',
    recommendedEvent: 'offer.sent',
    whatsapp: {
      templateName: 'tx_job_offer_issued_v1',
      text: `مبارك لك {{candidate_name}}! 🎉🎉

يسعدنا جداً تقديم عرض عمل رسمي لك للانضمام إلى فريق {{company_name}} كـ *{{job_title}}*.
لقد تميزت في جميع مراحل التقييم والمقابلة ويسرنا بدء رحلتنا معك.

📄 للاطلاع على بنود العرض الوظيفي وقبوله إلكترونياً:
{{portal_link}}

⏳ صلاحية العرض: {{offer_expiry}}.

فريق الموارد البشرية - {{company_name}}`,
    },
    email: {
      subject: 'تهانينا! عرض وظيفي رسمي من {{company_name}} - {{job_title}}',
      bodyHtml: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: linear-gradient(135deg, #10b981, #047857); padding: 36px 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">🎉 تهانينا! صدور عرض وظيفي</h1>
    <p style="color: #a7f3d0; margin: 8px 0 0; font-size: 15px;">{{job_title}} | {{company_name}}</p>
  </div>
  <div style="padding: 32px 24px;">
    <p style="font-size: 16px; color: #1e293b; margin: 0 0 16px;">عزيزنا/عزيزتنا <strong>{{candidate_name}}</strong>،</p>
    <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 20px;">
      يسعدنا في <strong>{{company_name}}</strong> أن نتقدم إليك بهذا العرض الوظيفي الرسمي لشغل منصب <strong>{{job_title}}</strong>، بعد الأداء الاستثنائي والمتميز الذي أظهرته خلال مسار التقييم والمقابلات.
    </p>
    <div style="background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
      <p style="font-size: 14px; color: #065f46; margin: 0 0 12px;">العرض جاهز للاطلاع والتوقيع الرقمي عبر المنصة</p>
      <a href="{{portal_link}}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 10px; font-size: 16px; font-weight: 700;">
        مراجعة وقبول العرض الوظيفي ✍️
      </a>
      <p style="font-size: 12px; color: #047857; margin: 12px 0 0;">صلاحية العرض: {{offer_expiry}}</p>
    </div>
    <p style="font-size: 14px; color: #64748b;">نتطلع بشغف للعمل سوياً وبدء مرحلة جديدة من الإنجازات.<br />فريق الموارد البشرية - {{company_name}}</p>
  </div>
</div>`,
    },
    sms: {
      text: 'تهانينا {{candidate_name}}! صدر لك عرض وظيفي رسمي من {{company_name}} لوظيفة {{job_title}}. يرجى الاطلاع والقبول عبر: {{portal_link}}',
    },
    variables: [
      { key: 'candidate_name', label: 'اسم المرشح', sample: 'سارة الأحمد' },
      { key: 'job_title', label: 'المسمى الوظيفي', sample: 'مهندس برمجيات أول' },
      { key: 'company_name', label: 'اسم الشركة', sample: 'شركة توظيف إكس للتقنية' },
      { key: 'portal_link', label: 'رابط البوابة', sample: 'https://www.tawzeefx.com/candidate/portal' },
      { key: 'offer_expiry', label: 'صلاحية العرض', sample: '3 أيام عمل' },
    ],
  },
  {
    id: 'stage_advancement',
    title: 'تهنئة بالانتقال للمرحلة التالية',
    category: 'pipeline',
    description: 'يُرسل للمرشح عند ترقيته إلى مرحلة متقدمة في مسار التوظيف لإبقائه على اطلاع فوري.',
    recommendedEvent: 'candidate.stage_changed',
    whatsapp: {
      templateName: 'tx_stage_progress_v1',
      text: `مرحباً {{candidate_name}} 🚀

يسرنا إبلاغك بأن ملفك انتقل إلى مرحلة: *{{stage_name}}* لوظيفة *{{job_title}}* في {{company_name}}.

فريق العمل يقوم حالياً بتجهيز الخطوة القادمة، وسنتواصل معك بكافة التفاصيل قريباً جداً.
يمكنك تفقد تقدمك عبر البوابة:
{{portal_link}}

مع التحية،
{{company_name}}`,
    },
    email: {
      subject: 'تحديث مسار توظيفك: انتقالك إلى {{stage_name}} - {{company_name}}',
      bodyHtml: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 30px 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">🚀 ترقية مرحلة التوظيف</h1>
    <p style="color: #e0e7ff; margin: 6px 0 0; font-size: 14px;">{{company_name}}</p>
  </div>
  <div style="padding: 28px 24px;">
    <p style="font-size: 15px; color: #1e293b;">مرحباً <strong>{{candidate_name}}</strong>،</p>
    <p style="font-size: 14px; color: #475569; line-height: 1.6;">
      يسعدنا إعلامك بتقدمك الناجح في مسار التوظيف لوظيفة <strong>{{job_title}}</strong> وانتقالك إلى مرحلة:
    </p>
    <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 10px; padding: 16px; text-align: center; margin: 20px 0;">
      <span style="font-size: 18px; font-weight: bold; color: #4338ca;">{{stage_name}}</span>
    </div>
    <p style="font-size: 14px; color: #64748b;">سيقوم فريق التوظيف بالتواصل معك لاستكمال الخطوات التالية.</p>
  </div>
</div>`,
    },
    sms: {
      text: 'مرحباً {{candidate_name}}، تم نقلك بنجاح إلى مرحلة {{stage_name}} لوظيفة {{job_title}} في {{company_name}}. تابع التفاصيل: {{portal_link}}',
    },
    variables: [
      { key: 'candidate_name', label: 'اسم المرشح', sample: 'سارة الأحمد' },
      { key: 'job_title', label: 'المسمى الوظيفي', sample: 'مهندس برمجيات أول' },
      { key: 'company_name', label: 'اسم الشركة', sample: 'شركة توظيف إكس للتقنية' },
      { key: 'stage_name', label: 'اسم المرحلة', sample: 'المقابلة الفنية المتقدمة' },
      { key: 'portal_link', label: 'رابط البوابة', sample: 'https://www.tawzeefx.com/candidate/portal' },
    ],
  },
  {
    id: 'assessment_request',
    title: 'رابط تقييم المهارات والاختبار المهني',
    category: 'assessment',
    description: 'يُرسل للمرشح لإجراء تقييم مهارات أو اختبار تقني مع توجيهات واضحة للمدة والتعليمات.',
    recommendedEvent: 'candidate.stage_changed',
    whatsapp: {
      templateName: 'tx_assessment_invite_v1',
      text: `مرحباً {{candidate_name}} 📝

كجزء من عملية الفرز لوظيفة *{{job_title}}* في {{company_name}}، نرجو منك إكمال التقييم المهني التالي:
*{{assessment_title}}*

🔗 رابط بدء التقييم المباشر:
{{portal_link}}

💡 نصيحة: يرجى تخصيص وقت هادئ واستكمال الاختبار في جلسة واحدة قبل انقضاء المهلة.

بالتوفيق،
فريق التوظيف - {{company_name}}`,
    },
    email: {
      subject: 'مطلوب إكمال تقييم مهني: {{assessment_title}} - {{company_name}}',
      bodyHtml: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 30px 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">📝 تقييم مهني مطلوب</h1>
  </div>
  <div style="padding: 28px 24px;">
    <p style="font-size: 15px; color: #1e293b;">مرحباً <strong>{{candidate_name}}</strong>،</p>
    <p style="font-size: 14px; color: #475569; line-height: 1.6;">
      يسرنا انتقالك للمرحلة التقييمية لوظيفة <strong>{{job_title}}</strong> لدى <strong>{{company_name}}</strong>. يرجى أداء التقييم الموضح أدناه:
    </p>
    <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
      <p style="font-size: 16px; font-weight: bold; color: #5b21b6; margin: 0 0 12px;">{{assessment_title}}</p>
      <a href="{{portal_link}}" style="display: inline-block; background: #7c3aed; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">
        بدء التقييم الآن ⏱
      </a>
    </div>
  </div>
</div>`,
    },
    sms: {
      text: 'مرحباً {{candidate_name}}، يرجى إكمال التقييم المهني المطلوب لوظيفة {{job_title}} في {{company_name}} عبر: {{portal_link}}',
    },
    variables: [
      { key: 'candidate_name', label: 'اسم المرشح', sample: 'سارة الأحمد' },
      { key: 'job_title', label: 'المسمى الوظيفي', sample: 'مهندس برمجيات أول' },
      { key: 'company_name', label: 'اسم الشركة', sample: 'شركة توظيف إكس للتقنية' },
      { key: 'assessment_title', label: 'اسم التقييم', sample: 'اختبار الكفاءة التحليلية والبرمجية' },
      { key: 'portal_link', label: 'رابط التقييم', sample: 'https://www.tawzeefx.com/candidate/portal' },
    ],
  },
  {
    id: 'rejection_polite',
    title: 'اعتذار مهني راقٍ وحفظ بالبنك الوظيفي',
    category: 'pool',
    description: 'صيغة احترافية لبقة تحافظ على تجربة المرشح الإيجابية وتضيفه لبنك المواهب للفرص المستقبلية.',
    recommendedEvent: 'candidate.stage_changed',
    whatsapp: {
      templateName: 'tx_candidate_rejection_pool_v1',
      text: `مرحباً {{candidate_name}} 🌸

نشكرك جزيل الشكر على الوقت والاهتمام الذي قدمته للتقديم على وظيفة *{{job_title}}* في {{company_name}}.

نود إبلاغك أنه نظراً للتنافسية العالية لمتطلبات الدور الحالية، قررنا المضي مع مرشح آخر تنطبق خبراته المباشرة مع الاحتياج اللحظي.

لقد احتفظنا بملفك وسيرتك الذاتية في *بنك المواهب* وسنكون سعداء بالتواصل معك فور توفر فرص تناسب مهاراتك المميزة.

نتمنى لك التوفيق والنجاح الدائم في مسيرتك المهنية!
فريق التوظيف - {{company_name}}`,
    },
    email: {
      subject: 'تحديث بشأن طلب التقديم لوظيفة {{job_title}} - {{company_name}}',
      bodyHtml: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: linear-gradient(135deg, #475569, #334155); padding: 30px 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">تحديث طلب التقديم</h1>
    <p style="color: #cbd5e1; margin: 6px 0 0; font-size: 14px;">{{company_name}}</p>
  </div>
  <div style="padding: 28px 24px;">
    <p style="font-size: 15px; color: #1e293b;">عزيزنا/عزيزتنا <strong>{{candidate_name}}</strong>،</p>
    <p style="font-size: 14px; color: #475569; line-height: 1.7;">
      نشكرك بصدق على اهتمامك ووقتك أثناء التقديم لوظيفة <strong>{{job_title}}</strong> لدى <strong>{{company_name}}</strong>.
    </p>
    <p style="font-size: 14px; color: #475569; line-height: 1.7;">
      نظراً لوجود عدد كبير من المتقدمين المتميزين واقتراب متطلبات المرحلة الحالية من خبرات محددة، نأسف لإبلاغك بأنه لن نتمكن من المضي قدماً في طلبك لهذه الوظيفة المحددة.
    </p>
    <div style="background: #f8fafc; border-radius: 10px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0;">
      <p style="font-size: 13px; color: #334155; margin: 0;">
        💡 <strong>شبكة المواهب:</strong> تم حفظ سيرتك الذاتية ضمن قاعدة كفاءاتنا المميزة وسنكون أول من يتواصل معك عند توفر شواغر مستقبلية تلائم خبراتك.
      </p>
    </div>
    <p style="font-size: 14px; color: #64748b; margin-top: 20px;">خالص تمنياتنا لك بالتوفيق والريادة،<br />فريق استقطاب الكفاءات - {{company_name}}</p>
  </div>
</div>`,
    },
    sms: {
      text: 'عزيزنا {{candidate_name}}، نشكرك على تقديمك لوظيفة {{job_title}} في {{company_name}}. تم حفظ ملفك ببنك المواهب وسنتواصل معك في الفرص القادمة. كل التوفيق لك.',
    },
    variables: [
      { key: 'candidate_name', label: 'اسم المرشح', sample: 'سارة الأحمد' },
      { key: 'job_title', label: 'المسمى الوظيفي', sample: 'مهندس برمجيات أول' },
      { key: 'company_name', label: 'اسم الشركة', sample: 'شركة توظيف إكس للتقنية' },
    ],
  },
];

/**
 * Replaces both {key} and {{key}} tokens in the text with variable values
 */
export function interpolateText(text: string, variables: Record<string, string>): string {
  if (!text) return '';
  return text.replace(/\{\{?([a-zA-Z0-9_]+)\}?\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}

/**
 * Validates and formats a phone number for international WhatsApp routing (Saudi/GCC default)
 */
export function normalizePhoneNumber(phone: string): { normalized: string; valid: boolean } {
  if (!phone) return { normalized: '', valid: false };
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }
  
  // Saudi local 05XXXXXXXX -> +9665XXXXXXXX
  if (cleaned.startsWith('05') && cleaned.length === 10) {
    cleaned = '+966' + cleaned.substring(1);
  } else if (cleaned.startsWith('5') && cleaned.length === 9) {
    cleaned = '+966' + cleaned;
  } else if (!cleaned.startsWith('+') && cleaned.startsWith('966')) {
    cleaned = '+' + cleaned;
  }

  const valid = /^\+[1-9]\d{7,14}$/.test(cleaned);
  return { normalized: cleaned, valid };
}

/**
 * Generates an instant WhatsApp Web / App direct chat link with pre-filled message
 */
export function generateWhatsAppLink(phoneNumber: string, message: string): string {
  const { normalized } = normalizePhoneNumber(phoneNumber);
  const cleanPhone = normalized.replace(/\+/g, '');
  const encodedText = encodeURIComponent(message || '');
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
