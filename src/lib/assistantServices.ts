export type AssistantService = {
  id: string;
  group: "insights" | "drafts" | "operations";
  title: string;
  description: string;
  prompt?: string;
  route?: string;
  mode?: "job_review" | "interview_scorecard" | "screening_checklist" | "hiring_workflow" | "candidate_outreach";
  staffOnly?: boolean;
};

// Only list capabilities backed by an existing chat tool or recruitment draft module.
export const assistantServices: AssistantService[] = [
  { id: "overview", group: "insights", title: "ملخص التوظيف", description: "إحصاءات الوظائف والمرشحين والمقابلات والعروض من النظام", prompt: "اعرض إحصائيات التوظيف الحالية" },
  { id: "insights", group: "insights", title: "ما يحتاج انتباهي", description: "الوظائف بلا متقدمين والمقابلات المقبلة والعروض المعلقة", prompt: "اعرض الرؤى الاستباقية لهذا الأسبوع" },
  { id: "jobs", group: "insights", title: "البحث في الوظائف", description: "قائمة الوظائف الحالية وحالتها", prompt: "اعرض الوظائف النشطة الحالية" },
  { id: "candidates", group: "insights", title: "البحث في المرشحين", description: "ابحث بالاسم أو الدور أو مرحلة التوظيف", prompt: "ابحث عن المرشح: " },
  { id: "briefing", group: "insights", title: "ملخص صوتي", description: "نص ملخص يومي قابل للتشغيل بالصوت", prompt: "أنشئ ملخصًا صوتيًا يوميًا لحالة التوظيف" },
  { id: "job_review", group: "drafts", title: "مراجعة إعلان وظيفة", description: "وضوح المتطلبات وصياغة مقترحة", mode: "job_review", staffOnly: true },
  { id: "interview_scorecard", group: "drafts", title: "بطاقة المقابلة", description: "معايير مرتبطة بالوظيفة وأدلة قابلة للملاحظة", mode: "interview_scorecard", staffOnly: true },
  { id: "screening_checklist", group: "drafts", title: "قائمة الفرز الأولي", description: "متطلبات قابلة للتحقق وأسئلة متابعة", mode: "screening_checklist", staffOnly: true },
  { id: "hiring_workflow", group: "drafts", title: "خطة مراحل التوظيف", description: "مراحل ومعايير إتمام واضحة", mode: "hiring_workflow", staffOnly: true },
  { id: "candidate_outreach", group: "drafts", title: "مسودات التواصل", description: "دعوة ومتابعة قابلة للتحرير دون إرسال", mode: "candidate_outreach", staffOnly: true },
  { id: "job_description", group: "drafts", title: "صياغة وصف وظيفي", description: "مسودة لوصف دور ومسؤولياته ومتطلباته", prompt: "صغ وصفًا وظيفيًا للمسمى: " },
  { id: "questions", group: "drafts", title: "أسئلة المقابلة", description: "دليل أسئلة لوظيفة محددة", prompt: "أنشئ أسئلة مقابلة لوظيفة: " },
  { id: "resume", group: "drafts", title: "قراءة سيرة ذاتية", description: "أرفق PDF أو DOCX أو TXT واسأل عن محتواه", prompt: "حلل السيرة الذاتية المرفقة، واستخرج المهارات والخبرات دون اتخاذ قرار توظيف" },
  { id: "create_job", group: "operations", title: "إنشاء وظيفة", description: "معاينة الوظيفة قبل حفظها", prompt: "أنشئ مسودة وظيفة بعنوان: ", staffOnly: true },
  { id: "interview", group: "operations", title: "جدولة مقابلة", description: "راجع المرشح والموعد في شاشة المقابلات", route: "/interviews?action=new", staffOnly: true },
  { id: "move", group: "operations", title: "نقل مرحلة مرشح", description: "اختر المرشح والمرحلة، ثم راجع النقل قبل تأكيده", route: "/pipeline?action=move", staffOnly: true },
  { id: "offer", group: "operations", title: "مسودة عرض وظيفي", description: "راجع التفاصيل في نموذج العرض قبل حفظ المسودة", route: "/offers?action=new", staffOnly: true },
];
