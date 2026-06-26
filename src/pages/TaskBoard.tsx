import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useI18n } from "@/contexts/I18nContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Calendar, User, Clock, ArrowLeft, ArrowRight, X,
  CheckCircle2, AlertCircle, Trash2, Sliders, ChevronLeft, ChevronRight, ClipboardList, GripVertical,
  AlertTriangle, Sparkles
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DndContext, useDraggable, useDroppable, DragEndEvent } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { AnimatedDashboardBackground } from "@/components/AnimatedBackground";

interface Task {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  assignee: string;
  assigneeEn: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  column: "backlog" | "todo" | "in_progress" | "in_review" | "done";
}

const initialTasks: Task[] = [
  {
    id: "task-1",
    title: "تصميم واجهة لوحة تحكم التقييم الشامل",
    titleEn: "Design 360-Evaluation dashboard UI",
    description: "إعداد التصميم والتجربة التفاعلية لتقييم الـ 360 درجة ليتناسب مع أجهزة الجوال.",
    descriptionEn: "Setup design and interactive experience for 360 evaluation to fit mobile devices.",
    assignee: "أحمد الحربي",
    assigneeEn: "Ahmad Al-Harbi",
    dueDate: "2026-06-20",
    priority: "high",
    column: "in_progress"
  },
  {
    id: "task-2",
    title: "ربط بوابة الدفع للاشتراكات",
    titleEn: "Integrate subscription payment gateway",
    description: "إعداد بوابة دفع تابي وسبلا لتناسب السوق السعودية والخليجية.",
    descriptionEn: "Configure Tabby and Stc Pay gateways for Saudi and Gulf markets.",
    assignee: "خالد منصور",
    assigneeEn: "Khaled Mansour",
    dueDate: "2026-06-25",
    priority: "high",
    column: "todo"
  },
  {
    id: "task-3",
    title: "تحديث شروط سياسة الخصوصية",
    titleEn: "Update privacy policy terms",
    description: "صياغة الشروط الجديدة بما يتوافق مع هيئة البيانات والذكاء الاصطناعي (سدايا).",
    descriptionEn: "Draft new terms complying with the Saudi Data & AI Authority (SDAIA).",
    assignee: "سارة العتيبي",
    assigneeEn: "Sarah Al-Otaibi",
    dueDate: "2026-06-18",
    priority: "low",
    column: "done"
  },
  {
    id: "task-4",
    title: "تحسين سرعة تحميل صور المرشحين",
    titleEn: "Optimize candidate profile image loading",
    description: "ضغط الصور سحابياً لتقليل استهلاك الباقة لمستخدمي الجوال.",
    descriptionEn: "Compress images in cloud storage to reduce bandwidth for mobile users.",
    assignee: "خالد منصور",
    assigneeEn: "Khaled Mansour",
    dueDate: "2026-06-30",
    priority: "medium",
    column: "backlog"
  }
];

const mapDbTaskToTask = (t: any): Task => ({
  id: t.id,
  title: t.title,
  titleEn: t.title_en || t.title,
  description: t.description || "",
  descriptionEn: t.description_en || t.description || "",
  assignee: t.assignee,
  assigneeEn: t.assignee_en || t.assignee,
  dueDate: t.due_date,
  priority: t.priority as any,
  column: t.column_status as any,
});

const COLUMNS = [
  { id: "backlog" as const, name: "المتأخرات", nameEn: "Backlog", color: "border-slate-500 bg-slate-500/5 text-slate-600 dark:text-slate-400" },
  { id: "todo" as const, name: "المخططة", nameEn: "To Do", color: "border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400" },
  { id: "in_progress" as const, name: "قيد التنفيذ", nameEn: "In Progress", color: "border-amber-500 bg-amber-500/5 text-amber-600 dark:text-amber-400" },
  { id: "in_review" as const, name: "قيد المراجعة", nameEn: "In Review", color: "border-purple-500 bg-purple-500/5 text-purple-600 dark:text-purple-400" },
  { id: "done" as const, name: "المكتملة", nameEn: "Done", color: "border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400" }
];

// Helper functions for card features
const getInitials = (name: string) => {
  if (!name) return "??";
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const getAvatarColor = (name: string) => {
  if (!name) return "hsl(222, 60%, 50%)";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 42%)`;
};

const getDueDateUrgency = (dueDateStr: string, column: string, locale: string) => {
  if (column === "done") {
    return { 
      text: locale === "ar" ? "مكتملة" : "Completed", 
      color: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5", 
      icon: CheckCircle2, 
      status: "completed" 
    };
  }
  
  if (!dueDateStr) {
    return {
      text: locale === "ar" ? "بدون تاريخ" : "No Due Date",
      color: "text-muted-foreground border-transparent bg-muted/30",
      icon: Calendar,
      status: "none"
    };
  }

  const dueDate = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return {
      text: locale === "ar" ? "متأخرة" : "Overdue",
      color: "text-rose-500 border-rose-500/25 bg-rose-500/5 animate-pulse",
      icon: AlertTriangle,
      status: "overdue"
    };
  } else if (diffDays === 0) {
    return {
      text: locale === "ar" ? "تسليم اليوم" : "Due Today",
      color: "text-amber-500 border-amber-500/25 bg-amber-500/5",
      icon: Clock,
      status: "today"
    };
  } else if (diffDays === 1) {
    return {
      text: locale === "ar" ? "تسليم غداً" : "Due Tomorrow",
      color: "text-amber-400 border-amber-400/25 bg-amber-400/5",
      icon: Clock,
      status: "tomorrow"
    };
  } else {
    return {
      text: locale === "ar" ? `متبقي ${diffDays} أيام` : `${diffDays} days left`,
      color: "text-muted-foreground border-border bg-muted/20",
      icon: Calendar,
      status: "upcoming"
    };
  }
};

const getProgressValue = (column: string) => {
  switch (column) {
    case "backlog": return 0;
    case "todo": return 15;
    case "in_progress": return 55;
    case "in_review": return 85;
    case "done": return 100;
    default: return 0;
  }
};

const getProgressColor = (column: string) => {
  switch (column) {
    case "backlog": return "bg-slate-400/80";
    case "todo": return "bg-blue-500";
    case "in_progress": return "bg-amber-500";
    case "in_review": return "bg-purple-500";
    case "done": return "bg-emerald-500";
    default: return "bg-primary";
  }
};

interface DroppableColumnProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

function DroppableColumn({ id, children, className }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 space-y-4 overflow-y-auto min-h-[450px] transition-all p-1.5 rounded-xl border border-transparent",
        isOver && "bg-primary/5 border border-dashed border-primary/25 shadow-inner",
        className
      )}
    >
      {children}
    </div>
  );
}

interface DraggableTaskCardProps {
  task: Task;
  children: React.ReactNode;
  locale: string;
  dir: "rtl" | "ltr";
}

function DraggableTaskCard({ task, children, locale, dir }: DraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-all relative group",
        isDragging && "opacity-30 shadow-none scale-95"
      )}
    >
      {children}
      <div
        {...listeners}
        {...attributes}
        className={cn(
          "absolute top-3 w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-20",
          dir === "rtl" ? "left-8" : "right-8"
        )}
        title={locale === "ar" ? "اسحب لإعادة الترتيب" : "Drag to reorder"}
      >
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50" />
      </div>
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } }
};

export default function TaskBoard() {
  const { locale, dir } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState<string>(" ");
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"dueDateAsc" | "dueDateDesc">("dueDateAsc");

  // New task form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskTitleEn, setTaskTitleEn] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDescEn, setTaskDescEn] = useState("");
  const [taskAssignee, setTaskAssignee] = useState(locale === "ar" ? "أحمد الحربي" : "Ahmad Al-Harbi");
  const [taskAssigneeEn, setTaskAssigneeEn] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [taskColumn, setTaskColumn] = useState<"backlog" | "todo" | "in_progress" | "in_review" | "done">("todo");

  // Fetch tasks
  const { data: dbTasks, isLoading } = useQuery({
    queryKey: ["tasks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("tasks" as any)
        .select("*")
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("Error fetching tasks:", error);
        throw error;
      }
      
      // Auto seed if no data found
      if (!data || data.length === 0) {
        const seededTasks = initialTasks.map(t => ({
          title: t.title,
          title_en: t.titleEn,
          description: t.description,
          description_en: t.descriptionEn,
          assignee: t.assignee,
          assignee_en: t.assigneeEn,
          due_date: t.dueDate,
          priority: t.priority,
          column_status: t.column,
          user_id: user.id,
        }));
        
        const { data: inserted, error: insertError } = await supabase
          .from("tasks" as any)
          .insert(seededTasks)
          .select();
          
        if (insertError) {
          console.error("Error seeding tasks:", insertError);
          return initialTasks;
        }
        
        return (inserted || []).map(mapDbTaskToTask);
      }
      
      return data.map(mapDbTaskToTask);
    },
    enabled: !!user,
  });

  const tasks = useMemo(() => {
    return dbTasks || [];
  }, [dbTasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => {
      const matchTitle = locale === "ar" ? t.title : t.titleEn;
      const matchDesc = locale === "ar" ? t.description : t.descriptionEn;
      const matchesSearch = (
        matchTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        matchDesc.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });

    result.sort((a, b) => {
      const dateA = new Date(a.dueDate).getTime();
      const dateB = new Date(b.dueDate).getTime();
      return sortBy === "dueDateAsc" ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [tasks, searchTerm, priorityFilter, sortBy, locale]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const targetColumn = over.id as string;

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.column === targetColumn) return;

    updateTaskColumnMutation.mutate({ taskId, column: targetColumn });
  };

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: async (newTask: Omit<Task, "id">) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("tasks" as any)
        .insert([{
          title: newTask.title,
          title_en: newTask.titleEn,
          description: newTask.description,
          description_en: newTask.descriptionEn,
          assignee: newTask.assignee,
          assignee_en: newTask.assigneeEn,
          due_date: newTask.dueDate,
          priority: newTask.priority,
          column_status: newTask.column,
          user_id: user.id,
        }])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", user?.id] });
      toast({
        title: locale === "ar" ? "تمت إضافة المهمة" : "Task Added",
        description: locale === "ar" ? "تم إنشاء المهمة بنجاح وإدراجها باللوحة." : "The task was created successfully.",
      });
      // Reset Form
      setTaskTitle("");
      setTaskTitleEn("");
      setTaskDesc("");
      setTaskDescEn("");
      setTaskDueDate("");
      setIsDrawerOpen(false);
    },
    onError: (err) => {
      toast({
        title: locale === "ar" ? "خطأ في الإضافة" : "Add Error",
        description: err.message,
        variant: "destructive"
      });
    }
  });

  const updateTaskColumnMutation = useMutation({
    mutationFn: async ({ taskId, column }: { taskId: string; column: string }) => {
      const { error } = await supabase
        .from("tasks" as any)
        .update({ column_status: column })
        .eq("id", taskId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", user?.id] });
      toast({
        title: locale === "ar" ? "تم تحديث حالة المهمة" : "Task Status Updated",
        description: locale === "ar" ? "تم نقل المهمة إلى العمود بنجاح." : "The task has been moved successfully.",
      });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks" as any)
        .delete()
        .eq("id", taskId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", user?.id] });
      toast({
        title: locale === "ar" ? "تم حذف المهمة" : "Task Deleted",
        description: locale === "ar" ? "تمت إزالة المهمة من لوحة العمل." : "The task was removed from the board.",
        variant: "destructive",
      });
    }
  });

  const moveTask = (taskId: string, direction: "next" | "prev") => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const currentIdx = COLUMNS.findIndex(col => col.id === task.column);
    let nextIdx = currentIdx;

    if (direction === "next") {
      nextIdx = Math.min(currentIdx + 1, COLUMNS.length - 1);
    } else {
      nextIdx = Math.max(currentIdx - 1, 0);
    }

    updateTaskColumnMutation.mutate({ taskId, column: COLUMNS[nextIdx].id });
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    createTaskMutation.mutate({
      title: taskTitle,
      titleEn: taskTitleEn || taskTitle,
      description: taskDesc,
      descriptionEn: taskDescEn || taskDesc,
      assignee: taskAssignee,
      assigneeEn: taskAssigneeEn || taskAssignee,
      dueDate: taskDueDate || new Date().toISOString().slice(0, 10),
      priority: taskPriority,
      column: taskColumn
    });
  };

  const deleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
  };

  return (
    <DashboardLayout>
      <AnimatedDashboardBackground />
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 select-none relative" 
        dir={dir}
      >
        
        {/* Page Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6 relative z-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
              <ClipboardList className="w-8 h-8 text-primary" />
              <span>{locale === "ar" ? "لوحة المهام (كانبان)" : "Task Board (Kanban)"}</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1.5">
              {locale === "ar"
                ? "تنظيم ومتابعة وإسناد المهام لأعضاء الفريق عبر لوحة عمل متكاملة وسلسة الاستخدام."
                : "Organize, track, and assign tasks to team members across an integrated work board."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className={`w-4 h-4 absolute ${dir === "rtl" ? "right-3" : "left-3"} top-3 text-muted-foreground pointer-events-none`} />
              <Input
                placeholder={locale === "ar" ? "بحث عن مهمة..." : "Search task..."}
                value={searchTerm === " " ? "" : searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn("bg-card/45 backdrop-blur-sm border-border/80 rounded-xl text-xs h-10 w-full sm:w-56 focus:ring-1 focus:ring-primary focus:border-primary", dir === "rtl" ? "pr-9 pl-4" : "pl-9 pr-4")}
              />
            </div>
            
            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-card/45 backdrop-blur-sm border border-border/80 rounded-xl px-3 py-2 text-xs h-10 focus:ring-1 focus:ring-primary focus:outline-none transition-all"
            >
              <option value="all">{locale === "ar" ? "كل الأولويات" : "All Priorities"}</option>
              <option value="high">{locale === "ar" ? "أولوية عالية" : "High Priority"}</option>
              <option value="medium">{locale === "ar" ? "أولوية متوسطة" : "Medium Priority"}</option>
              <option value="low">{locale === "ar" ? "أولوية منخفضة" : "Low Priority"}</option>
            </select>

            {/* Due Date Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-card/45 backdrop-blur-sm border border-border/80 rounded-xl px-3 py-2 text-xs h-10 focus:ring-1 focus:ring-primary focus:outline-none transition-all"
            >
              <option value="dueDateAsc">{locale === "ar" ? "الأقرب تاريخاً" : "Due Date: Earliest"}</option>
              <option value="dueDateDesc">{locale === "ar" ? "الأبعد تاريخاً" : "Due Date: Latest"}</option>
            </select>

            <Button onClick={() => setIsDrawerOpen(true)} className="rounded-xl flex items-center justify-center gap-2 font-bold shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-xs py-2 px-4 h-10 transition-all hover:scale-105 active:scale-95">
              <Plus className="w-4 h-4" />
              <span>{locale === "ar" ? "إنشاء مهمة جديدة" : "Add Task"}</span>
            </Button>
          </div>
        </motion.div>

        {/* Statistics Bar */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
          {[
            { label: locale === "ar" ? "إجمالي المهام" : "Total Tasks", value: tasks.length, icon: ClipboardList, color: "text-primary bg-primary/10 border-primary/20" },
            { label: locale === "ar" ? "مهام عالية الأولوية" : "High Priority", value: tasks.filter(t => t.priority === "high").length, icon: AlertCircle, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
            { label: locale === "ar" ? "جاري العمل عليها" : "Tasks In Progress", value: tasks.filter(t => t.column === "in_progress").length, icon: Clock, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
            { label: locale === "ar" ? "المهام المكتملة" : "Completed", value: tasks.filter(t => t.column === "done").length, icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 350, damping: 18 }}
              className="glass-card-premium border-none shadow-sm rounded-2xl p-5 flex items-center justify-between group cursor-default"
            >
              <div>
                <span className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase">{stat.label}</span>
                <div className="text-2xl font-black text-foreground mt-1.5 tabular-nums">
                  {stat.value}
                </div>
              </div>
              <motion.div 
                whileHover={{ rotate: 10, scale: 1.15 }}
                transition={{ type: "spring", stiffness: 400 }}
                className={cn("w-11 h-11 rounded-xl flex items-center justify-center border shadow-sm transition-all duration-300", stat.color)}
              >
                <stat.icon className="w-5 h-5" />
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Board Columns Grid */}
        <DndContext onDragEnd={handleDragEnd}>
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-start overflow-x-auto pb-4 relative z-10">
            {COLUMNS.map(col => {
              const colTasks = filteredTasks.filter(t => t.column === col.id);
              return (
                <div key={col.id} className="glass-card-premium border-none shadow-sm rounded-2xl p-4.5 flex flex-col min-h-[520px] relative overflow-hidden group">
                  {/* Glowing header bar */}
                  <div className={cn("absolute top-0 left-0 right-0 h-1", 
                    col.id === "backlog" ? "bg-slate-400" :
                    col.id === "todo" ? "bg-blue-500" :
                    col.id === "in_progress" ? "bg-amber-500" :
                    col.id === "in_review" ? "bg-purple-500" :
                    "bg-emerald-500"
                  )} />

                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/40 shrink-0 mt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-foreground">
                        {locale === "ar" ? col.name : col.nameEn}
                      </span>
                      <Badge variant="secondary" className="rounded-lg text-[10px] py-0.5 px-2 font-bold bg-muted text-muted-foreground border-none">
                        {colTasks.length}
                      </Badge>
                    </div>
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      col.id === "backlog" ? "bg-slate-400" :
                      col.id === "todo" ? "bg-blue-500" :
                      col.id === "in_progress" ? "bg-amber-500 animate-pulse" :
                      col.id === "in_review" ? "bg-purple-500" :
                      "bg-emerald-500 live-breathing-indicator"
                    )} />
                  </div>

                  {/* Column Tasks */}
                  <DroppableColumn id={col.id}>
                    {isLoading ? (
                      <>
                        <div className="bg-card/30 border border-border/30 rounded-xl p-4 space-y-3 animate-pulse">
                          <div className="h-3 w-12 bg-muted rounded" />
                          <div className="h-4 w-5/6 bg-muted rounded" />
                          <div className="h-3 w-full bg-muted rounded" />
                          <div className="flex justify-between pt-2">
                            <div className="h-3.5 w-16 bg-muted rounded" />
                            <div className="h-3.5 w-16 bg-muted rounded" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {colTasks.map(task => {
                          const priorityColor = 
                            task.priority === "high" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                            task.priority === "medium" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                            "bg-slate-500/10 text-slate-500 border border-slate-500/10";

                          return (
                            <DraggableTaskCard key={task.id} task={task} locale={locale} dir={dir}>
                              <motion.div
                                whileHover={{ y: -6, scale: 1.01 }}
                                transition={{ type: "spring", stiffness: 350, damping: 18 }}
                                className="bg-card/40 dark:bg-card/25 border border-border/40 hover:border-primary/30 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 space-y-3.5 relative group/card overflow-hidden cursor-grab active:cursor-grabbing"
                              >
                                {/* Priority Badge & Delete */}
                                <div className="flex items-center justify-between relative z-10">
                                  <Badge className={cn("text-[9px] font-extrabold uppercase py-0.5 px-2 rounded-md", priorityColor)}>
                                    {locale === "ar" 
                                      ? (task.priority === "high" ? "عالية" : task.priority === "medium" ? "متوسطة" : "منخفضة")
                                      : task.priority}
                                  </Badge>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                                    className="text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-destructive/10 opacity-0 group-hover/card:opacity-100 transition-opacity"
                                    title={locale === "ar" ? "حذف المهمة" : "Delete Task"}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Title & Description */}
                                <div className="space-y-1.5 relative z-10">
                                  <h4 className="text-xs font-bold text-foreground leading-snug group-hover/card:text-primary transition-colors">
                                    {locale === "ar" ? task.title : task.titleEn}
                                  </h4>
                                  <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                                    {locale === "ar" ? task.description : task.descriptionEn}
                                  </p>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-1 relative z-10">
                                  <div className="flex justify-between text-[9px] text-muted-foreground/80">
                                    <span>{locale === "ar" ? "نسبة الإنجاز" : "Completion"}</span>
                                    <span className="font-bold">{getProgressValue(task.column)}%</span>
                                  </div>
                                  <div className="relative h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }} 
                                      animate={{ width: `${getProgressValue(task.column)}%` }} 
                                      transition={{ duration: 0.5 }} 
                                      className={cn("absolute h-full rounded-full", getProgressColor(task.column))} 
                                    />
                                  </div>
                                </div>

                                {/* Date & Assignee Wrapper */}
                                <div className="flex flex-col gap-2 pt-2 border-t border-border/30 relative z-10">
                                  <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                                    {(() => {
                                      const urgency = getDueDateUrgency(task.dueDate, task.column, locale);
                                      const UrgencyIcon = urgency.icon;
                                      return (
                                        <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded border text-[8px]", urgency.color)}>
                                          <UrgencyIcon className="w-2.5 h-2.5 shrink-0" />
                                          <span className="font-semibold">{urgency.text}</span>
                                        </div>
                                      );
                                    })()}
                                    
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-muted-foreground/50" />
                                      <span>{task.dueDate}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-1">
                                    <div className="flex items-center gap-1.5">
                                      <div 
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm shrink-0"
                                        style={{ backgroundColor: getAvatarColor(locale === "ar" ? task.assignee : task.assigneeEn) }}
                                      >
                                        {getInitials(locale === "ar" ? task.assignee : task.assigneeEn)}
                                      </div>
                                      <span className="text-[10px] font-medium text-foreground">{locale === "ar" ? task.assignee : task.assigneeEn}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Mobile & Desktop Quick Column Movements */}
                                <div className="flex items-center justify-between pt-2 gap-1 border-t border-border/20 relative z-10">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={col.id === "backlog"}
                                    onClick={(e) => { e.stopPropagation(); moveTask(task.id, "prev"); }}
                                    className="w-6 h-6 rounded-md hover:bg-muted shrink-0 shadow-none"
                                    aria-label={locale === "ar" ? "الحالة السابقة" : "Previous Stage"}
                                  >
                                    {dir === "rtl" ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                                  </Button>
                                  <span className="text-[9px] text-muted-foreground/50 font-medium">{locale === "ar" ? "تغيير الحالة" : "Move"}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={col.id === "done"}
                                    onClick={(e) => { e.stopPropagation(); moveTask(task.id, "next"); }}
                                    className="w-6 h-6 rounded-md hover:bg-muted shrink-0 shadow-none"
                                    aria-label={locale === "ar" ? "الحالة التالية" : "Next Stage"}
                                  >
                                    {dir === "rtl" ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                  </Button>
                                </div>

                              </motion.div>
                            </DraggableTaskCard>
                          );
                        })}
                        {colTasks.length === 0 && (
                          <div className="border border-dashed border-border/50 rounded-xl py-10 text-center text-[10px] text-muted-foreground bg-muted/5">
                            {locale === "ar" ? "لا توجد مهام حالياً" : "No tasks here"}
                          </div>
                        )}
                      </>
                    )}
                  </DroppableColumn>

                </div>
              );
            })}
          </motion.div>
        </DndContext>

        {/* Slide-over Drawer for Creating New Task */}
        <AnimatePresence>
          {isDrawerOpen && (
            <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
                onClick={() => setIsDrawerOpen(false)}
              />
              <motion.div
                initial={{ x: dir === "rtl" ? "-100%" : "100%" }}
                animate={{ x: 0 }}
                exit={{ x: dir === "rtl" ? "-100%" : "100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="relative w-full max-w-md glass-card-premium border-y-0 border-l border-r-0 border-border/50 shadow-2xl h-full flex flex-col z-10"
              >
                <div className="p-5 border-b border-border/60 flex items-center justify-between shrink-0">
                  <h3 className="text-base font-black text-foreground flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    <span>{locale === "ar" ? "إنشاء مهمة جديدة" : "Create New Task"}</span>
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setIsDrawerOpen(false)} className="rounded-xl">
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <form onSubmit={handleCreateTask} className="flex-1 overflow-y-auto p-5 space-y-6">
                  
                  {/* Arabic Task Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-xs font-bold">{locale === "ar" ? "عنوان المهمة بالعربية *" : "Task Title in Arabic *"}</Label>
                    <Input
                      id="title"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="مثال: إكمال نظام التقييم"
                      className="bg-card/45 backdrop-blur-sm border-border/80 rounded-xl text-xs h-10 w-full focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                      required
                    />
                  </div>

                  {/* English Task Title */}
                  <div className="space-y-2">
                    <Label htmlFor="titleEn" className="text-xs font-bold">{locale === "ar" ? "عنوان المهمة بالإنجليزية (اختياري)" : "Task Title in English (Optional)"}</Label>
                    <Input
                      id="titleEn"
                      value={taskTitleEn}
                      onChange={(e) => setTaskTitleEn(e.target.value)}
                      placeholder="e.g. Complete evaluation system"
                      className="bg-card/45 backdrop-blur-sm border-border/80 rounded-xl text-xs h-10 w-full focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    />
                  </div>

                  {/* Arabic Task Description */}
                  <div className="space-y-2">
                    <Label htmlFor="desc" className="text-xs font-bold">{locale === "ar" ? "تفاصيل ووصف المهمة بالعربية *" : "Description in Arabic *"}</Label>
                    <textarea
                      id="desc"
                      value={taskDesc}
                      onChange={(e) => setTaskDesc(e.target.value)}
                      rows={3}
                      placeholder="اكتب وصفاً أو تفاصيل إضافية للمهمة..."
                      className="w-full bg-card/45 backdrop-blur-sm border border-border/80 rounded-xl p-3 text-xs focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                      required
                    />
                  </div>

                  {/* English Task Description */}
                  <div className="space-y-2">
                    <Label htmlFor="descEn" className="text-xs font-bold">{locale === "ar" ? "الوصف بالإنجليزية (اختياري)" : "Description in English (Optional)"}</Label>
                    <textarea
                      id="descEn"
                      value={taskDescEn}
                      onChange={(e) => setTaskDescEn(e.target.value)}
                      rows={3}
                      placeholder="e.g. Write descriptive notes for the task..."
                      className="w-full bg-card/45 backdrop-blur-sm border border-border/80 rounded-xl p-3 text-xs focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                    />
                  </div>

                  {/* Assignee Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="assignee" className="text-xs font-bold">{locale === "ar" ? "المسؤول عن المهمة بالعربية *" : "Assignee Name in Arabic *"}</Label>
                    <Input
                      id="assignee"
                      value={taskAssignee}
                      onChange={(e) => setTaskAssignee(e.target.value)}
                      placeholder="مثال: خالد منصور"
                      className="bg-card/45 backdrop-blur-sm border-border/80 rounded-xl text-xs h-10 w-full focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assigneeEn" className="text-xs font-bold">{locale === "ar" ? "المسؤول عن المهمة بالإنجليزية (اختياري)" : "Assignee Name in English (Optional)"}</Label>
                    <Input
                      id="assigneeEn"
                      value={taskAssigneeEn}
                      onChange={(e) => setTaskAssigneeEn(e.target.value)}
                      placeholder="e.g. Khaled Mansour"
                      className="bg-card/45 backdrop-blur-sm border-border/80 rounded-xl text-xs h-10 w-full focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    />
                  </div>

                  {/* Due Date */}
                  <div className="space-y-2">
                    <Label htmlFor="dueDate" className="text-xs font-bold">{locale === "ar" ? "تاريخ الاستحقاق والتسليم *" : "Due Date *"}</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="bg-card/45 backdrop-blur-sm border-border/80 rounded-xl text-xs h-10 w-full focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                      required
                    />
                  </div>

                  {/* Priority & Column Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priority" className="text-xs font-bold">{locale === "ar" ? "الأولوية" : "Priority"}</Label>
                      <select
                        id="priority"
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value as any)}
                        className="w-full bg-card/45 backdrop-blur-sm border border-border/80 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none transition-all h-10"
                      >
                        <option value="high">{locale === "ar" ? "عالية" : "High"}</option>
                        <option value="medium">{locale === "ar" ? "متوسطة" : "Medium"}</option>
                        <option value="low">{locale === "ar" ? "منخفضة" : "Low"}</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="column" className="text-xs font-bold">{locale === "ar" ? "العمود البدائي" : "Initial Column"}</Label>
                      <select
                        id="column"
                        value={taskColumn}
                        onChange={(e) => setTaskColumn(e.target.value as any)}
                        className="w-full bg-card/45 backdrop-blur-sm border border-border/80 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none transition-all h-10"
                      >
                        <option value="backlog">{locale === "ar" ? "المتأخرات" : "Backlog"}</option>
                        <option value="todo">{locale === "ar" ? "المخططة" : "To Do"}</option>
                        <option value="in_progress">{locale === "ar" ? "قيد التنفيذ" : "In Progress"}</option>
                        <option value="in_review">{locale === "ar" ? "قيد المراجعة" : "In Review"}</option>
                        <option value="done">{locale === "ar" ? "المكتملة" : "Done"}</option>
                      </select>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 shrink-0">
                    <Button type="submit" className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white font-bold h-11 text-xs shadow-md shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                      {locale === "ar" ? "إنشاء المهمة وحفظها" : "Save and Create Task"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </motion.div>
    </DashboardLayout>
  );
}
