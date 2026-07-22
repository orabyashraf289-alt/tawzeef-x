# تقرير فحص جودة الكود (Code Quality Audit)

**اسم المشروع**: Tawzeef X / HireBuddy  
**عدد مشاكل ESLint**: 1,037 ملاحظة (947 errors تحذيرية في القواعد الصارمة + 90 warnings)  

---

## 1. جدول المشكلات الرئيسية مرتبة حسب الأولوية

| ID | Severity | Category | File | Line | Problem | Impact | Recommendation | Effort |
|---|---|---|---|---|---|---|---|---|
| **CODE-001** | High | Component Size | `src/pages/Pipeline.tsx` | 1 - 1718 | مكون ضخم ممتد لأكثر من 1700 سطر يجمع بين الكانبان والتايم لاين والأناليتكس والدرورز | صعوبة الصيانة، تكرار الـ Re-renders، وصعوبة كتابة اختبارات وحدة | تقسيم الصفحة إلى مكونات فرعية: `KanbanView`, `TimelineView`, `BulkActionsBar`, `TransitionDialog` | M |
| **CODE-002** | High | Component Size | `src/pages/AIAssistant.tsx` | 1 - 1650 | مكون ضخم ممتد لأكثر من 1600 سطر يجمع بين واجهة الشات وتوليد الوظائف وتدوين الملاحظات | صعوبة الصيانة وإمكانية حدوث Memory Leak في مصفوفات المحادثة | تفتيت الشات إلى `ChatInput`, `ChatMessageList`, `JobGeneratorTab`, `CandidateScorerTab` | M |
| **CODE-003** | Medium | Type Safety | مشروع كامل (900+ موضع) | عدة ملفات | الاعتماد المفرط على `any` في Interfaces و Hooks ومكونات React | إخفاء خطأ النوع في runtime وعدم الاستفادة من قوة TypeScript | استبدال `any` بتعريفات دقيقة في `src/types/` | L |
| **CODE-004** | Medium | Missing Hook Deps | `src/components/DashboardLayout.tsx` | 264, 343 | عدم تضمين `fetchNotifications` في مصفوفة الاعتماديات للـ useEffect | تكرار جلب الإشعارات غير المرغوب فيه أو عدم التحديث اللحظي | إحاطة `fetchNotifications` بـ `useCallback` وتضمينه في الاعتماديات | XS |
| **CODE-005** | Medium | Missing Hook Deps | `src/contexts/AuthContext.tsx` | 138 | عدم تضمين `navigate` و `queryClient` في مصفوفة الاعتماديات | احتمالية حدوث stale closure عند تغيير الحالة | إضافة الاعتماديات الناقصة لمصفوفة useEffect | XS |
| **CODE-006** | Medium | Empty Try/Catch | `supabase/functions/chat/index.ts` | 1157 | وجود كتل `try { } catch {}` فارغة تماماً بلع الاستثناءات | صعوبة اكتشاف أخطاء التابع في الإنتاج وتجربة مستخدم مبهمة | إضافة تسجيل الأحداث وإرجاع استجابة منسقة للمستخدم | S |
| **CODE-007** | Low | Unused Variables | `src/pages/JobDetail.tsx` | 5 | استيراد مكونات غير مستخدمة مثل `Dialog`, `DialogContent`, `Button` | زيادة حجم الملف وإبطاء عملية التحزيم (Bundle) | حذف الاستيرادات غير المستعملة تلقائياً عبر ESLint autofix | XS |
| **CODE-008** | Low | Unused Variables | `src/components/CandidatePortalDrawer.tsx` | 1045 - 1060 | متغيرات معرّفة ومسند لها قيم بدون استخدام (`isRtl`, `locale`, `candidatesList`) | فوضى برمجية وزيادة استهلاك الذاكرة | إزالة المتغيرات غير المستعملة | XS |

---

## 2. تفاصيل المشكلات البرمجية والأمثلة

### مثال المشكلة CODE-001: المكون الضخم `Pipeline.tsx`
```tsx
// Pipeline.tsx - السطر 1 إلى 1718
export default function Pipeline() {
  // أكثر من 40 حالة useState و useQuery داخل نفس المكون
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "deferred" | "rejected">("active");
  // ... إلخ
}
```
**الحل المقترح**: فصل المنطق والـ State في Custom Hook اسمه `usePipelineBoard()` ونقل واجهات العرض لمكونات مستقلة.

---

### مثال المشكلة CODE-003: الاستخدام المفرط لـ `any`
```tsx
// Example in StageDetailPanel.tsx
const [slaHours, setSlaHours] = useState((stage as any).sla_hours || 0);
```
**الحل المقترح**: تحديث نوع `PipelineStage` ليشمل `sla_hours?: number` بشكل مباشر دون الحاجة للتحويل بـ `as any`.
