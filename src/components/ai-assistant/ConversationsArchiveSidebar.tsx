import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Search,
  Plus,
  Trash2,
  Pin,
  PinOff,
  Pencil,
  Check,
  X,
  Clock,
  Briefcase,
  Calendar,
  BarChart3,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
}

interface ConversationsArchiveSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  sidebarOpen: boolean;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  onClearAll: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onTogglePinConversation: (id: string) => void;
  onToggleSidebar: () => void;
}

// Auto-detect topic icon from title
function getTopicMeta(title: string) {
  const t = title.toLowerCase();
  if (t.includes("وظيفة") || t.includes("شغور") || t.includes("مطور") || t.includes("مهندس") || t.includes("job")) {
    return { icon: Briefcase, color: "text-blue-500 bg-blue-500/10 border-blue-500/20", label: "وظائف" };
  }
  if (t.includes("مقابلة") || t.includes("جدول") || t.includes("jitsi") || t.includes("موعد")) {
    return { icon: Calendar, color: "text-purple-500 bg-purple-500/10 border-purple-500/20", label: "مقابلات" };
  }
  if (t.includes("تقرير") || t.includes("إحصائي") || t.includes("مؤشر") || t.includes("pipeline") || t.includes("stats")) {
    return { icon: BarChart3, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20", label: "تقارير" };
  }
  if (t.includes("سيرة") || t.includes("cv") || t.includes("مرشح") || t.includes("تحليل")) {
    return { icon: FileText, color: "text-amber-500 bg-amber-500/10 border-amber-500/20", label: "سير ذاتية" };
  }
  return { icon: MessageSquare, color: "text-primary bg-primary/10 border-primary/20", label: "عام" };
}

export default function ConversationsArchiveSidebar({
  conversations,
  activeConversationId,
  sidebarOpen,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onClearAll,
  onRenameConversation,
  onTogglePinConversation,
  onToggleSidebar,
}: ConversationsArchiveSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "pinned" | "jobs" | "interviews">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const handleStartRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      onRenameConversation(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (activeFilter === "pinned") return !!c.is_pinned;
      if (activeFilter === "jobs") return c.title.includes("وظيفة") || c.title.includes("شغور") || c.title.includes("مطور");
      if (activeFilter === "interviews") return c.title.includes("مقابلة") || c.title.includes("جدول");
      return true;
    });
  }, [conversations, searchQuery, activeFilter]);

  // Date groups
  const grouped = useMemo(() => {
    const pinned: Conversation[] = [];
    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const thisWeek: Conversation[] = [];
    const older: Conversation[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOfWeek = startOfToday - 6 * 86400000;

    filtered.forEach((c) => {
      if (c.is_pinned) {
        pinned.push(c);
        return;
      }
      const t = new Date(c.updated_at).getTime();
      if (t >= startOfToday) today.push(c);
      else if (t >= startOfYesterday) yesterday.push(c);
      else if (t >= startOfWeek) thisWeek.push(c);
      else older.push(c);
    });

    return { pinned, today, yesterday, thisWeek, older };
  }, [filtered]);

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div
      className={cn(
        "fixed lg:relative inset-y-0 right-0 z-30 h-full border-l border-border/30 bg-card/90 backdrop-blur-2xl transition-all duration-300 flex flex-col shadow-2xl lg:shadow-none overflow-hidden shrink-0",
        sidebarOpen
          ? "w-80 translate-x-0 opacity-100"
          : "w-0 lg:w-0 translate-x-full lg:translate-x-0 border-0 opacity-0 pointer-events-none"
      )}
    >
      {/* Top Header Card */}
      <div className="p-4 border-b border-border/30 shrink-0 bg-gradient-to-b from-primary/5 via-card/80 to-transparent space-y-3 min-w-[320px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
              <MessageSquare className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground flex items-center gap-1.5">
                أرشيف المحادثات
                <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0.2 bg-primary/10 text-primary border-0">
                  {conversations.length}
                </Badge>
              </h2>
              <p className="text-[10px] text-muted-foreground font-semibold">سجل استشارات وسجلات الذكاء الاصطناعي</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {conversations.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                onClick={onClearAll}
                title="مسح كل السجل"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden h-8 w-8 p-0 hover:bg-muted rounded-xl"
              onClick={onToggleSidebar}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* New Chat Primary Button */}
        <Button
          onClick={onNewChat}
          className="w-full text-xs font-extrabold h-9 gap-2 rounded-xl bg-gradient-to-r from-primary via-indigo-600 to-primary/90 text-primary-foreground shadow-md hover:shadow-lg hover:scale-[1.01] transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          محادثة جديدة بالذكاء الاصطناعي
        </Button>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في المحادثات بالعنوان..."
            className="h-8.5 text-xs pr-9 bg-muted/40 border border-border/30 rounded-xl focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide text-[11px] font-bold">
          <button
            onClick={() => setActiveFilter("all")}
            className={cn(
              "px-2.5 py-1 rounded-lg border transition-all shrink-0",
              activeFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground hover:text-foreground border-border/20"
            )}
          >
            الكل ({conversations.length})
          </button>
          <button
            onClick={() => setActiveFilter("pinned")}
            className={cn(
              "px-2.5 py-1 rounded-lg border transition-all shrink-0 flex items-center gap-1",
              activeFilter === "pinned" ? "bg-amber-500 text-white border-amber-500" : "bg-muted/40 text-muted-foreground hover:text-foreground border-border/20"
            )}
          >
            <Pin className="w-3 h-3" />
            المثبتة
          </button>
          <button
            onClick={() => setActiveFilter("jobs")}
            className={cn(
              "px-2.5 py-1 rounded-lg border transition-all shrink-0 flex items-center gap-1",
              activeFilter === "jobs" ? "bg-blue-600 text-white border-blue-600" : "bg-muted/40 text-muted-foreground hover:text-foreground border-border/20"
            )}
          >
            <Briefcase className="w-3 h-3" />
            الوظائف
          </button>
          <button
            onClick={() => setActiveFilter("interviews")}
            className={cn(
              "px-2.5 py-1 rounded-lg border transition-all shrink-0 flex items-center gap-1",
              activeFilter === "interviews" ? "bg-purple-600 text-white border-purple-600" : "bg-muted/40 text-muted-foreground hover:text-foreground border-border/20"
            )}
          >
            <Calendar className="w-3 h-3" />
            المقابلات
          </button>
        </div>
      </div>

      {/* Conversations List Scroll Area */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto text-muted-foreground/60">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="font-bold text-foreground/80">لا توجد محادثات مطابقة</p>
              <p className="text-[11px] text-muted-foreground">جرب البحث بكلمات أخرى أو أنشئ محادثة جديدة</p>
            </div>
          ) : (
            <>
              {/* Pinned Section */}
              {grouped.pinned.length > 0 && (
                <RenderConversationGroup
                  title="المحادثات المثبتة 📌"
                  items={grouped.pinned}
                  activeConversationId={activeConversationId}
                  editingId={editingId}
                  editingTitle={editingTitle}
                  setEditingTitle={setEditingTitle}
                  onSelectConversation={onSelectConversation}
                  onStartRename={handleStartRename}
                  onSaveRename={handleSaveRename}
                  onCancelRename={handleCancelRename}
                  onTogglePin={onTogglePinConversation}
                  onDelete={onDeleteConversation}
                  formatTime={formatTime}
                />
              )}

              {/* Today Section */}
              {grouped.today.length > 0 && (
                <RenderConversationGroup
                  title="اليوم 🌅"
                  items={grouped.today}
                  activeConversationId={activeConversationId}
                  editingId={editingId}
                  editingTitle={editingTitle}
                  setEditingTitle={setEditingTitle}
                  onSelectConversation={onSelectConversation}
                  onStartRename={handleStartRename}
                  onSaveRename={handleSaveRename}
                  onCancelRename={handleCancelRename}
                  onTogglePin={onTogglePinConversation}
                  onDelete={onDeleteConversation}
                  formatTime={formatTime}
                />
              )}

              {/* Yesterday Section */}
              {grouped.yesterday.length > 0 && (
                <RenderConversationGroup
                  title="أمس 🕒"
                  items={grouped.yesterday}
                  activeConversationId={activeConversationId}
                  editingId={editingId}
                  editingTitle={editingTitle}
                  setEditingTitle={setEditingTitle}
                  onSelectConversation={onSelectConversation}
                  onStartRename={handleStartRename}
                  onSaveRename={handleSaveRename}
                  onCancelRename={handleCancelRename}
                  onTogglePin={onTogglePinConversation}
                  onDelete={onDeleteConversation}
                  formatTime={formatTime}
                />
              )}

              {/* This Week Section */}
              {grouped.thisWeek.length > 0 && (
                <RenderConversationGroup
                  title="هذا الأسبوع 🗓️"
                  items={grouped.thisWeek}
                  activeConversationId={activeConversationId}
                  editingId={editingId}
                  editingTitle={editingTitle}
                  setEditingTitle={setEditingTitle}
                  onSelectConversation={onSelectConversation}
                  onStartRename={handleStartRename}
                  onSaveRename={handleSaveRename}
                  onCancelRename={handleCancelRename}
                  onTogglePin={onTogglePinConversation}
                  onDelete={onDeleteConversation}
                  formatTime={formatTime}
                />
              )}

              {/* Older Section */}
              {grouped.older.length > 0 && (
                <RenderConversationGroup
                  title="سجل سابق 📦"
                  items={grouped.older}
                  activeConversationId={activeConversationId}
                  editingId={editingId}
                  editingTitle={editingTitle}
                  setEditingTitle={setEditingTitle}
                  onSelectConversation={onSelectConversation}
                  onStartRename={handleStartRename}
                  onSaveRename={handleSaveRename}
                  onCancelRename={handleCancelRename}
                  onTogglePin={onTogglePinConversation}
                  onDelete={onDeleteConversation}
                  formatTime={formatTime}
                />
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function RenderConversationGroup({
  title,
  items,
  activeConversationId,
  editingId,
  editingTitle,
  setEditingTitle,
  onSelectConversation,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onTogglePin,
  onDelete,
  formatTime,
}: {
  title: string;
  items: Conversation[];
  activeConversationId: string | null;
  editingId: string | null;
  editingTitle: string;
  setEditingTitle: (v: string) => void;
  onSelectConversation: (id: string) => void;
  onStartRename: (conv: Conversation, e: React.MouseEvent) => void;
  onSaveRename: (id: string, e: React.MouseEvent | React.FormEvent) => void;
  onCancelRename: (e: React.MouseEvent) => void;
  onTogglePin: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  formatTime: (iso: string) => string;
}) {
  return (
    <div className="space-y-1.5">
      <h3 className="px-2 text-[10px] font-black text-muted-foreground/80 uppercase tracking-wider flex items-center justify-between">
        <span>{title}</span>
        <span className="text-[9px] font-bold opacity-60">({items.length})</span>
      </h3>

      <div className="space-y-1">
        {items.map((conv) => {
          const isActive = activeConversationId === conv.id;
          const isEditing = editingId === conv.id;
          const topic = getTopicMeta(conv.title);
          const Icon = topic.icon;

          return (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative group"
            >
              <div
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  "w-full text-right px-3 py-2.5 rounded-2xl text-xs transition-all duration-300 flex items-center gap-2.5 border relative overflow-hidden cursor-pointer",
                  isActive
                    ? "bg-gradient-to-r from-primary/15 via-primary/10 to-card border-primary/40 font-bold shadow-md shadow-primary/5 text-primary"
                    : "bg-card/40 border-border/20 hover:bg-card/90 hover:border-primary/30 text-foreground/90 hover:shadow-sm"
                )}
              >
                {/* Active strip indicator */}
                {isActive && (
                  <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary to-indigo-600 rounded-r-full" />
                )}

                {/* Topic icon badge */}
                <div
                  className={cn(
                    "p-1.5 rounded-xl border transition-transform duration-300 shrink-0",
                    topic.color,
                    isActive ? "scale-110 shadow-sm" : "group-hover:scale-105"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                {/* Title & Time or Inline Edit Input */}
                <div className="flex-1 min-w-0 pr-0.5">
                  {isEditing ? (
                    <form
                      onSubmit={(e) => onSaveRename(conv.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1"
                    >
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        autoFocus
                        className="h-6 text-xs px-2 py-0 bg-background border-primary"
                      />
                      <button
                        type="submit"
                        className="p-1 rounded text-emerald-600 hover:bg-emerald-500/10"
                        title="حفظ التعديل"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={onCancelRename}
                        className="p-1 rounded text-muted-foreground hover:bg-muted"
                        title="إلغاء"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-bold truncate text-foreground/90 text-xs leading-normal">
                          {conv.title}
                        </p>
                        {conv.is_pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0 fill-amber-500/20" />}
                      </div>
                      <p className="text-[9.5px] text-muted-foreground flex items-center gap-1 mt-0.5 font-semibold">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTime(conv.updated_at)}
                      </p>
                    </>
                  )}
                </div>

                {/* Action Buttons on Hover */}
                {!isEditing && (
                  <div
                    className={cn(
                      "flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0",
                      isActive && "opacity-100"
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onTogglePin(conv.id)}
                      className={cn(
                        "p-1 rounded-lg transition-colors text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10",
                        conv.is_pinned && "text-amber-500 opacity-100"
                      )}
                      title={conv.is_pinned ? "إلغاء التثبيت" : "تثبيت المحادثة"}
                    >
                      {conv.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                    </button>

                    <button
                      onClick={(e) => onStartRename(conv, e)}
                      className="p-1 rounded-lg transition-colors text-muted-foreground hover:text-primary hover:bg-primary/10"
                      title="إعادة تسمية"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>

                    <button
                      onClick={(e) => onDelete(conv.id, e)}
                      className="p-1 rounded-lg transition-colors text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="حذف المحادثة"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
