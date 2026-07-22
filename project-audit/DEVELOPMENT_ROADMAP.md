# خطة التطوير الشاملة والمراحل (Development Roadmap)

**اسم المشروع**: Tawzeef X / HireBuddy  

---

## 1. توزيع المراحل الإستراتيجية (Roadmap Phases)

```
[المرحلة 0: الإصلاحات الحرجة P0] ---> [المرحلة 1: تثبيت وصيانة الكود P1] ---> [المرحلة 2: تحسين الـ Architecture P2] ---> [المرحلة 3: استكمال الوظائف والـ Performance P3] ---> [المرحلة 4: الاستعداد التام للإنتاج Production Ready]
```

---

## 2. جدول المهام المخصص لكل مرحلة

| ID | Phase | Task | Description | Priority | Dependencies | Estimated Effort | Risk | Acceptance Criteria |
|---|---|---|---|---|---|---|---|---|
| **TSK-001** | Phase 0 | تفعيل JWT في Edge Functions | ضبط `verify_jwt = true` في `supabase/config.toml` والدالات | **P0** | لا يوجد | **XS** (< 0.5d) | High | نجاح الـ JWT validation ومنع الطلبات غير الموثقة |
| **TSK-002** | Phase 0 | إصلاح تحذيرات ESLint الحرجة | معالجة الـ empty block statements و prefer-const في الدالات السحابية | **P0** | لا يوجد | **S** (0.5d - 1d) | Low | `npm run lint` يمر بدون أي أخطاء من نوع Error |
| **TSK-003** | Phase 1 | التخلص من استخدام `any` في TypeScript | إنشاء Interfaces دقيقة في `src/types/` واستبدال `any` | **P1** | TSK-002 | **M** (2d - 3d) | Low | انخفاض التحذيرات بنسبة 90%+ ونجاح `npx tsc` |
| **TSK-004** | Phase 1 | إصلاح الاعتماديات الناقصة في الـ Hooks | إضافة `useCallback` ومرجعيات useEffect في AuthContext و DashboardLayout | **P1** | لا يوجد | **XS** (< 0.5d) | Low | اختفاء تحذيرات `react-hooks/exhaustive-deps` |
| **TSK-005** | Phase 2 | إعادة هيكلة مكون `Pipeline.tsx` | تقسيم المكون الضخم إلى `KanbanView`, `TimelineView`, `BulkActionsBar` | **P2** | TSK-003 | **M** (2d - 3d) | Medium | انخفاض أسطر الملف من 1700 إلى أقل من 400 سطر مع بقاء الاختبارات 100% ناجحة |
| **TSK-006** | Phase 2 | إعادة هيكلة مكون `AIAssistant.tsx` | تقسيم صفحة المساعد الذكي إلى تبويبات ومكونات صغيرة | **P2** | TSK-003 | **M** (2d - 3d) | Medium | تحسين مقروئية الكود وتقليل استهلاك الذاكرة |
| **TSK-007** | Phase 3 | Dynamic Imports لـ PDF و Excel | استخدام `import('jspdf')` و `import('xlsx')` عند التصدير فقط | **P3** | لا يوجد | **S** (0.5d - 1d) | Low | انخفاض حجم حزمة البناء التأسيسية بأكثر من 800kB |
| **TSK-008** | Phase 3 | تحسين أداء الكانبان عبر React.memo | تطبيق `React.memo` على بطاقات المرشحين لوقف الـ Re-renders الزائدة | **P3** | TSK-005 | **S** (0.5d - 1d) | Low | سلاسة فائقة في السحب والإفلات برفع FPS إلى 60 |
| **TSK-009** | Phase 4 | إنشاء CI/CD Workflow تلقائي | إضافة `.github/workflows/ci.yml` لتشغيل الفحوصات والاختبارات عند كل Push | **P4** | لا يوجد | **XS** (< 0.5d) | Low | تشغيل آلي ناجح لـ GitHub Actions عند كل PR |
| **TSK-010** | Phase 4 | إعداد حماية Rate Limiting ومراقبة الإنتاج | تطبيق حماية الطلبات المكثفة وإعداد مراقبة الأخطاء (Sentry / LogRocket) | **P4** | TSK-001 | **S** (0.5d - 1d) | Low | منع هجمات DDoS ومراقبة أخطاء الإنتاج فوراً |

---

## 3. تسلسل التنفيذ الموصى به (Recommended Implementation Order)

1. **الخطوة الأولى المباشرة**: تنفيذ **TSK-001** (تأمين Edge Functions) + **TSK-002** (إصلاح أخطاء ESLint الحادة).
2. **الخطوة الثانية**: تنفيذ **TSK-003** و **TSK-004** لاستكمال تثبيت جودة الكود والـ TypeScript Type Safety.
3. **الخطوة الثالثة**: تنفيذ **TSK-005** و **TSK-006** لتفكيك المكونات الضخمة (`Pipeline.tsx` & `AIAssistant.tsx`).
4. **الخطوة الرابعة**: تنفيذ **TSK-007** و **TSK-008** لتأمين أعلى معدل سرعة وأداء في الإنتاج.
5. **الخطوة الخامسة**: تنفيذ **TSK-009** و **TSK-010** لتأهيل المشروع للجاهزية النهائية للإطلاق (Production Ready).

---

## 4. معايير القبول وشروط الاعتماد (Definition of Done)

- ✅ **جميع اختبارات P0 و P1 بنسبة نجاح 100%**.
- ✅ **عدم وجود أي أخطاء في `npx tsc --noEmit` أو `npm run build`**.
- ✅ **خلو المشروع من ثغرات أمنية خطيرة (Zero Critical / High Vulnerabilities)**.
- ✅ **انخفاض حجم الحزمة الرئيسية عن 500kB عند أول تحميل**.
- ✅ **عمل النظام بسلاسة كاملة على جميع الأجهزة باللغتين العربية والإنجليزية**.
