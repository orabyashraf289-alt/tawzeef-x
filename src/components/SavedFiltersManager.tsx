import { useState } from "react";
import { Bookmark, Pin, PinOff, Trash2, Edit2, Check, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  useSavedFilters,
  useDeleteSavedFilter,
  useToggleFilterPin,
} from "@/hooks/useSavedFilters";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { SearchScope } from "@/hooks/useSearchHistory";
import { cn } from "@/lib/utils";

const SCOPE_LABELS: Record<string, string> = {
  candidates: "المرشحون",
  jobs: "الوظائف",
  interviews: "المقابلات",
  offers: "العروض",
  global: "بحث عام",
};

const SCOPE_COLORS: Record<string, string> = {
  candidates: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  jobs: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  interviews: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  offers: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  global: "bg-muted text-muted-foreground",
};

export default function SavedFiltersManager() {
  const [scopeFilter, setScopeFilter] = useState<SearchScope | "all">("all");
  const { data: filters = [], isLoading } = useSavedFilters(scopeFilter === "all" ? undefined : scopeFilter);
  const deleteFilter = useDeleteSavedFilter();
  const togglePin = useToggleFilterPin();
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await supabase.from("saved_filters" as any).update({ name: editName.trim() }).eq("id", id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["saved-filters"] });
    toast({ title: "تم التحديث ✅" });
    setEditingId(null);
  };

  const pinned = filters.filter(f => f.is_pinned);
  const unpinned = filters.filter(f => !f.is_pinned);

  const scopes: Array<{ value: SearchScope | "all"; label: string }> = [
    { value: "all", label: "الكل" },
    { value: "candidates", label: "المرشحون" },
    { value: "jobs", label: "الوظائف" },
    { value: "interviews", label: "المقابلات" },
    { value: "offers", label: "العروض" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">الفلاتر المحفوظة</h2>
        <p className="text-sm text-muted-foreground mt-1">
          إدارة فلاتر البحث المحفوظة، تثبيت المهم منها للوصول السريع، وحذف القديم
        </p>
      </div>

      {/* Scope tabs */}
      <div className="flex bg-muted/50 rounded-lg p-0.5 border border-border/50 w-fit">
        {scopes.map(s => (
          <button
            key={s.value}
            onClick={() => setScopeFilter(s.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              scopeFilter === s.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">جاري التحميل...</div>
      ) : filters.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/50 rounded-2xl">
          <div className="inline-flex w-12 h-12 rounded-full bg-muted/50 items-center justify-center mb-3">
            <Bookmark className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">لا توجد فلاتر محفوظة</p>
          <p className="text-xs text-muted-foreground mt-1">يمكنك حفظ الفلاتر من صفحة المرشحين أو الوظائف</p>
        </div>
      ) : (
        <div className="space-y-5">
          {pinned.length > 0 && (
            <section>
              <p className="text-[11px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                <Pin className="w-3 h-3" />الفلاتر المثبتة ({pinned.length})
              </p>
              <div className="space-y-1.5">
                <AnimatePresence>
                  {pinned.map(f => (
                    <FilterCard
                      key={f.id}
                      f={f}
                      editing={editingId === f.id}
                      editName={editName}
                      setEditName={setEditName}
                      onStartEdit={() => { setEditingId(f.id); setEditName(f.name); }}
                      onCancelEdit={() => setEditingId(null)}
                      onSaveEdit={() => handleRename(f.id)}
                      onTogglePin={() => togglePin.mutate({ id: f.id, is_pinned: f.is_pinned })}
                      onDelete={() => deleteFilter.mutate(f.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {unpinned.length > 0 && (
            <section>
              <p className="text-[11px] font-bold text-muted-foreground uppercase mb-2">
                باقي الفلاتر ({unpinned.length})
              </p>
              <div className="space-y-1.5">
                <AnimatePresence>
                  {unpinned.map(f => (
                    <FilterCard
                      key={f.id}
                      f={f}
                      editing={editingId === f.id}
                      editName={editName}
                      setEditName={setEditName}
                      onStartEdit={() => { setEditingId(f.id); setEditName(f.name); }}
                      onCancelEdit={() => setEditingId(null)}
                      onSaveEdit={() => handleRename(f.id)}
                      onTogglePin={() => togglePin.mutate({ id: f.id, is_pinned: f.is_pinned })}
                      onDelete={() => deleteFilter.mutate(f.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

interface FilterCardProps {
  f: any;
  editing: boolean;
  editName: string;
  setEditName: (s: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}

function FilterCard({ f, editing, editName, setEditName, onStartEdit, onCancelEdit, onSaveEdit, onTogglePin, onDelete }: FilterCardProps) {
  const filterCount = Object.values(f.filters || {}).filter(v => v && v !== "all" && v !== "").length;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 8 }}
      layout
      className="flex items-center gap-3 p-3 bg-card border border-border/50 rounded-xl hover:border-primary/30 transition-colors group"
    >
      <div className="w-9 h-9 rounded-lg bg-primary/8 text-primary flex items-center justify-center shrink-0">
        <Filter className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex gap-1.5">
            <Input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="h-7 text-xs"
              autoFocus
              onKeyDown={e => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
            />
            <Button size="sm" className="h-7 px-2" onClick={onSaveEdit}><Check className="w-3 h-3" /></Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onCancelEdit}><X className="w-3 h-3" /></Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground truncate">{f.name}</span>
              {f.is_pinned && <Pin className="w-3 h-3 text-primary shrink-0" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5", SCOPE_COLORS[f.scope])}>
                {SCOPE_LABELS[f.scope] || f.scope}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{filterCount} فلتر</span>
            </div>
          </>
        )}
      </div>

      {!editing && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onStartEdit} title="تعديل">
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onTogglePin} title={f.is_pinned ? "إلغاء التثبيت" : "تثبيت"}>
            {f.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 hover:text-destructive" onClick={onDelete} title="حذف">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}
