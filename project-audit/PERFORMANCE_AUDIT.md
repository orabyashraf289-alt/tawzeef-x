# تقرير مراجعة الأداء والسرعة (Performance Audit)

**اسم المشروع**: Tawzeef X / HireBuddy  
**أداة التحليل**: Rollup Bundle Visualizer & Vite Build Diagnostics  

---

## 1. تحليل حجم الحزم (Bundle Size Analysis)

عند إجراء أمر البناء (`npm run build`) تم رصد الحزم التالية وحجامها:

| اسم الحزمة (Bundle Chunk) | الحجم المستهدف | الحجم المضغوط (Gzip) | التقييم والتوصية |
|---|---|---|---|
| `AIAssistant.js` | **1,068 kB** | **299 kB** | 🔴 كبير جداً (> 500kB). يتطلب تقسيم المكون باستخدام `React.lazy` |
| `index.js` (Core Vendor) | **946 kB** | **287 kB** | 🔴 كبير جداً. يحتوي على React, Lucide Icons, Radix UI كاملة |
| `xlsx.js` | **429 kB** | **143 kB** | 🟡 يمكن تحميلها ديناميكياً عند تصدير البيانات فقط (`import('xlsx')`) |
| `jspdf.js` | **416 kB** | **136 kB** | 🟡 يمكن تحميلها ديناميكياً عند تصدير ملفات PDF فقط (`import('jspdf')`) |
| `generateCategoricalChart.js` | **374 kB** | **103 kB** | 🟡 مكتبة Recharts - يُفضل تحميل شاشات التقارير بـ Dynamic Import |
| `html2canvas.js` | **201 kB** | **48 kB** | 🟢 مقبول، ولكن يفضل التحميل عند الحاجة فقط |

---

## 2. مراجعة أداء الواجهة الأمامية (Frontend Performance)

1. **إعادة الـ Render غير الضرورية في لوحة الكانبان**:
   - عند تغيير حالة سحب بطاقة واحدة في `Pipeline.tsx` تم ملاحظة إعادة بناء شجرة مكونات العمود بالكامل.
   - **الحل المقترح**: إحاطة بطاقات المرشحين `<CandidateCard>` بـ `React.memo` و استخدام `useCallback` لمعالجات الأحداث.

2. **تحميل المكتبات الخارجية الثقيلة**:
   - مكتبات مثل `xlsx` و `jspdf` مستوردة بشكل مباشر في أعلى ملفات التصدير، مما يحمل كودها في الصفحة الرئيسية مباشرة حتى لو لم يطلب المستخدم التصدير.
   - **الحل المقترح**:
     ```typescript
     // بدلاً من الاستيراد الثابت في أعلى الملف:
     // import * as XLSX from 'xlsx';
     
     // استخدم الاستيراد الديناميكي:
     const XLSX = await import('xlsx');
     ```

3. **Core Web Vitals & Asset Optimization**:
   - الخطوط والصور المضمنة تحتاج إلى تحديد أبعاد ثابتة لمنع ظاهرة Cumulative Layout Shift (CLS).
   - استخدام `embla-carousel-react` و `framer-motion` بشكل سلس يوفر تجربة استجابة بصرية ممتازة.

---

## 3. مراجعة أداء قاعدة البيانات والطلب السحابي (Database & Backend Performance)

1. **N+1 Query Detection في شاشة المرشحين**:
   - في بعض شاشات التفاصيل، يتم جلب استجابات الاختبارات وحساب النزاهة لكل مرشح بشكل منفصل.
   - **الحل المقترح**: دمج الجلب في استعلام واحد عبر Supabase Select Syntax:
     `supabase.from('candidates').select('*, candidate_scorecards(*), assessment_responses(*)')`.

2. **فهارس قاعدة البيانات (Indexes)**:
   - تم إنشاء فهرس على `stage_entered_at` مؤخراً في التحديثات السابقة وهو ما يسرع الترتيب، ولكن يُنصح بإضافة فهرس مرکب على `(company_id, job_id, stage)` لتسريع الاستعلامات في المؤسسات الكبيرة.
