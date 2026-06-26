import { useState } from "react";
import { Filter, Save, X, Bookmark, BookmarkCheck, Trash2, Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  useSavedFilters,
  useSaveFilter,
  useDeleteSavedFilter,
  useToggleFilterPin,
  type SavedFilter,
} from "@/hooks/useSavedFilters";
import type { SearchScope } from "@/hooks/useSearchHistory";
import { cn } from "@/lib/utils";

interface AdvancedFiltersProps {
  scope: SearchScope;
  filters: Record<string, any>;
  onApply: (filters: Record<string, any>) => void;
  fields: Array<{ key: string; label: string; options?: Array<{ value: string; label: string }>; type?: "text" | "select" | "number" }>;
}

export default function AdvancedFilters({ scope, filters, onApply, fields }: AdvancedFiltersProps) {
  const [open, setOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [draft, setDraft] = useState<Record<string, any>>(filters);

  const { data: saved = [] } = useSavedFilters(scope);
  const saveFilter = useSaveFilter();
  const deleteFilter = useDeleteSavedFilter();
  const togglePin = useToggleFilterPin();

  const activeCount = Object.values(filters).filter(v => v && v !== "all" && v !== "").length;
  const hasDraftChanges = JSON.stringify(draft) !== JSON.stringify(filters);

  const handleApply = () => {
    onApply(draft);
    setOpen(false);
  };

  const handleClear = () => {
    const cleared: Record<string, any> = {};
    fields.forEach(f => { cleared[f.key] = f.type === "select" ? "all" : ""; });
    setDraft(cleared);
    onApply(cleared);
  };

  const handleSave = () => {
    if (!saveName.trim()) return;
    saveFilter.mutate(
      { name: saveName.trim(), scope, filters: draft },
      {
        onSuccess: () => {
          setSaveName("");
          setShowSaveInput(false);
        },
      }
    );
  };

  const handleApplySaved = (f: SavedFilter) => {
    setDraft(f.filters);
    onApply(f.filters);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setDraft(filters); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <Filter className="w-3.5 h-3.5" />
          فلاتر متقدمة
          {activeCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-primary/10 text-primary">{activeCount}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="end" dir="rtl">
        {/* Pinned saved filters */}
        {saved.filter(s => s.is_pinned).length > 0 && (
          <div className="p-3 border-b border-border bg-muted/30">
            <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase">الفلاتر المثبتة</p>
            <div className="flex flex-wrap gap-1.5">
              {saved.filter(s => s.is_pinned).map(f => (
                <button
                  key={f.id}
                  onClick={() => handleApplySaved(f)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Pin className="w-3 h-3" />{f.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filter fields */}
        <div className="p-3 space-y-2.5 max-h-[280px] overflow-y-auto">
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">{f.label}</label>
              {f.type === "select" && f.options ? (
                <Select value={draft[f.key] || "all"} onValueChange={v => setDraft(d => ({ ...d, [f.key]: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {f.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={f.type === "number" ? "number" : "text"}
                  value={draft[f.key] || ""}
                  onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                  className="h-8 text-xs"
                  placeholder={f.label}
                />
              )}
            </div>
          ))}
        </div>

        {/* Save filter section */}
        <div className="p-3 border-t border-border bg-muted/20">
          {showSaveInput ? (
            <div className="flex gap-1.5">
              <Input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                placeholder="اسم الفلتر..."
                className="h-8 text-xs flex-1"
                autoFocus
                onKeyDown={e => e.key === "Enter" && handleSave()}
              />
              <Button size="sm" className="h-8 px-2" onClick={handleSave} disabled={!saveName.trim() || saveFilter.isPending}>
                <Save className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setShowSaveInput(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={() => setShowSaveInput(true)}>
                <Bookmark className="w-3.5 h-3.5" />حفظ كفلتر
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive" onClick={handleClear}>
                <X className="w-3.5 h-3.5" />مسح
              </Button>
            </div>
          )}
        </div>

        {/* All saved list */}
        {saved.length > 0 && (
          <div className="p-3 border-t border-border max-h-[160px] overflow-y-auto">
            <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase">الفلاتر المحفوظة</p>
            <div className="space-y-1">
              {saved.map(f => (
                <div key={f.id} className="flex items-center gap-1 group hover:bg-muted/40 rounded-md px-1.5 py-1">
                  <button onClick={() => handleApplySaved(f)} className="flex-1 text-right text-xs truncate hover:text-primary">
                    {f.name}
                  </button>
                  <button
                    onClick={() => togglePin.mutate({ id: f.id, is_pinned: f.is_pinned })}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-primary"
                    title={f.is_pinned ? "إلغاء التثبيت" : "تثبيت"}
                  >
                    {f.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => deleteFilter.mutate(f.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive"
                    title="حذف"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Apply */}
        <div className="p-3 border-t border-border">
          <Button
            onClick={handleApply}
            className="w-full h-8 text-xs"
            disabled={!hasDraftChanges}
          >
            تطبيق الفلاتر
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
