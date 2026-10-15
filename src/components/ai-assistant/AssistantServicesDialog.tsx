import { useState } from "react";
import { BarChart3, BriefcaseBusiness, FileText, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { assistantServices, type AssistantService } from "@/lib/assistantServices";

const groups = [
  { id: "insights", title: "التحليلات والبحث", icon: BarChart3 },
  { id: "drafts", title: "الكتابة والمراجعة", icon: FileText },
  { id: "operations", title: "إجراءات التوظيف", icon: BriefcaseBusiness },
] as const;

export default function AssistantServicesDialog({ open, onOpenChange, onSelect, canManage, canScheduleInterviews }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (service: AssistantService) => void;
  canManage: boolean;
  canScheduleInterviews: boolean;
}) {
  const [query, setQuery] = useState("");
  const visible = assistantServices.filter(service =>
    (!service.staffOnly || canManage) &&
    (service.id !== "interview" || canScheduleInterviews) &&
    `${service.title} ${service.description}`.includes(query.trim())
  );

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent dir="rtl" className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader className="text-right">
        <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> خدمات مساعد AI</DialogTitle>
        <DialogDescription className="text-right">اختر خدمة لبدء طلبك. المسودات للمراجعة البشرية قبل استخدامها.</DialogDescription>
      </DialogHeader>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input aria-label="ابحث في خدمات الذكاء الاصطناعي" placeholder="ابحث عن خدمة..." value={query} onChange={e => setQuery(e.target.value)} className="pr-9" />
      </div>
      {groups.map(group => {
        const entries = visible.filter(service => service.group === group.id);
        if (!entries.length) return null;
        const Icon = group.icon;
        return <section key={group.id} aria-label={group.title}>
          <h3 className="flex items-center gap-2 text-sm font-bold mb-2"><Icon className="h-4 w-4 text-primary" />{group.title}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {entries.map(service => <Button key={service.id} type="button" variant="outline" className="h-auto min-h-16 justify-start text-right whitespace-normal p-3" onClick={() => { onSelect(service); onOpenChange(false); }}>
              <span className="block"><span className="block font-bold">{service.title}</span><span className="block text-xs text-muted-foreground mt-1">{service.description}</span></span>
            </Button>)}
          </div>
        </section>;
      })}
      {!visible.length && <p className="text-sm text-muted-foreground text-center py-5">لا توجد خدمة بهذا الاسم.</p>}
    </DialogContent>
  </Dialog>;
}
