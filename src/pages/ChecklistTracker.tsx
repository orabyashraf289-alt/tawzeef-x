import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAllAgencies } from "@/hooks/useAgencies";
import { Search, ClipboardList, AlertTriangle, CheckCircle2, Clock, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrackerRow {
  candidate_id: string;
  candidate_name: string;
  candidate_stage: string | null;
  agency_id: string | null;
  agency_name: string | null;
  checklist_id: string;
  checklist_title: string;
  total: number;
  done: number;
  pending: number;
  in_progress: number;
  blocked: number;
  overdue: number;
  nearest_due: string | null;
}

export default function ChecklistTracker() {
  const { data: agencies = [] } = useAllAgencies();
  const [search, setSearch] = useState("");
  const [agencyFilter, setAgencyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // all|in_progress|completed|overdue
  const [dueFilter, setDueFilter] = useState<string>("all"); // all|7d|30d|overdue

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["checklist-tracker"],
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async (): Promise<TrackerRow[]> => {
      const sb = supabase as any;
      const { data: checklists, error } = await sb
        .from("candidate_checklists")
        .select("id, title, candidate_id, candidate:candidate_id(id, name, stage, agency_id)");
      if (error) throw error;
      const ids = (checklists || []).map((c: any) => c.id);
      if (ids.length === 0) return [];

      const { data: items, error: iErr } = await sb
        .from("candidate_checklist_items")
        .select("checklist_id, status, due_date")
        .in("checklist_id", ids);
      if (iErr) throw iErr;

      const agencyIds = [
        ...new Set((checklists || []).map((c: any) => c.candidate?.agency_id).filter(Boolean)),
      ];
      const { data: agencyData } = agencyIds.length
        ? await sb.from("agencies").select("id, name").in("id", agencyIds)
        : { data: [] };
      const agencyMap = new Map((agencyData || []).map((a: any) => [a.id, a.name]));

      const now = Date.now();
      return (checklists || []).map((cl: any) => {
        const its = (items || []).filter((it: any) => it.checklist_id === cl.id);
        const done = its.filter((it: any) => it.status === "done").length;
        const pending = its.filter((it: any) => it.status === "pending").length;
        const in_progress = its.filter((it: any) => it.status === "in_progress").length;
        const blocked = its.filter((it: any) => it.status === "blocked").length;
        const overdue = its.filter(
          (it: any) =>
            it.due_date &&
            it.status !== "done" &&
            it.status !== "skipped" &&
            new Date(it.due_date).getTime() < now
        ).length;
        const upcoming = its
          .filter((it: any) => it.due_date && it.status !== "done" && it.status !== "skipped")
          .map((it: any) => new Date(it.due_date).getTime())
          .sort((a: number, b: number) => a - b);
        return {
          candidate_id: cl.candidate?.id || cl.candidate_id,
          candidate_name: cl.candidate?.name || "—",
          candidate_stage: cl.candidate?.stage || null,
          agency_id: cl.candidate?.agency_id || null,
          agency_name: cl.candidate?.agency_id ? (agencyMap.get(cl.candidate.agency_id) as string) || null : null,
          checklist_id: cl.id,
          checklist_title: cl.title,
          total: its.length,
          done,
          pending,
          in_progress,
          blocked,
          overdue,
          nearest_due: upcoming.length ? new Date(upcoming[0]).toISOString() : null,
        };
      });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    return rows.filter((r) => {
      if (q && !r.candidate_name.toLowerCase().includes(q) && !r.checklist_title.toLowerCase().includes(q)) return false;
      if (agencyFilter !== "all") {
        if (agencyFilter === "none" ? !!r.agency_id : r.agency_id !== agencyFilter) return false;
      }
      if (statusFilter === "completed" && (r.total === 0 || r.done !== r.total)) return false;
      if (statusFilter === "in_progress" && (r.done === r.total || r.total === 0)) return false;
      if (statusFilter === "overdue" && r.overdue === 0) return false;
      if (dueFilter === "overdue" && r.overdue === 0) return false;
      if (dueFilter !== "all" && dueFilter !== "overdue") {
        if (!r.nearest_due) return false;
        const days = (new Date(r.nearest_due).getTime() - now) / 86400000;
        const limit = dueFilter === "7d" ? 7 : 30;
        if (days < 0 || days > limit) return false;
      }
      return true;
    });
  }, [rows, search, agencyFilter, statusFilter, dueFilter]);

  const stats = useMemo(() => {
    const completed = rows.filter((r) => r.total > 0 && r.done === r.total).length;
    const overdue = rows.filter((r) => r.overdue > 0).length;
    const inprog = rows.filter((r) => r.total > 0 && r.done < r.total && r.overdue === 0).length;
    return { total: rows.length, completed, overdue, inprog };
  }, [rows]);

  const hasFilters = agencyFilter !== "all" || statusFilter !== "all" || dueFilter !== "all" || !!search;

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            متابعة قوائم المرشحين
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            تقدم كل مرشح في الـ Checklist مع فلترة حسب المكتب والحالة وموعد الاستحقاق
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="إجمالي القوائم" value={stats.total} color="bg-muted/50 text-foreground" />
          <StatCard label="قيد التنفيذ" value={stats.inprog} color="bg-info/10 text-info" icon={Clock} />
          <StatCard label="مكتملة" value={stats.completed} color="bg-success/10 text-success" icon={CheckCircle2} />
          <StatCard label="متأخرة" value={stats.overdue} color="bg-destructive/10 text-destructive" icon={AlertTriangle} />
        </div>

        {/* Filters */}
        <Card className="p-3 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث باسم المرشح أو القائمة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={agencyFilter} onValueChange={setAgencyFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="المكتب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المكاتب</SelectItem>
                <SelectItem value="none">بدون مكتب</SelectItem>
                {agencies.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                <SelectItem value="completed">مكتملة</SelectItem>
                <SelectItem value="overdue">متأخرة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dueFilter} onValueChange={setDueFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="الاستحقاق" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المواعيد</SelectItem>
                <SelectItem value="7d">خلال 7 أيام</SelectItem>
                <SelectItem value="30d">خلال 30 يوم</SelectItem>
                <SelectItem value="overdue">متأخر</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <button
                onClick={() => {
                  setSearch("");
                  setAgencyFilter("all");
                  setStatusFilter("all");
                  setDueFilter("all");
                }}
                className="flex items-center gap-1 text-xs text-destructive hover:underline px-2"
              >
                <X className="w-3 h-3" />
                إعادة ضبط
              </button>
            )}
          </div>
        </Card>

        {/* Table */}
        {isLoading ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">جارٍ التحميل...</Card>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">لا توجد قوائم مطابقة للفلاتر الحالية</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const pct = r.total > 0 ? Math.round((r.done / r.total) * 100) : 0;
              return (
                <Link
                  key={r.checklist_id}
                  to={`/candidates/${r.candidate_id}`}
                  className="block group"
                >
                  <Card className="p-4 hover:shadow-md transition-all hover:border-primary/30">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                            {r.candidate_name}
                          </h3>
                          {r.candidate_stage && (
                            <Badge variant="outline" className="text-[10px]">
                              {r.candidate_stage}
                            </Badge>
                          )}
                          {r.agency_name && (
                            <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/20">
                              🏢 {r.agency_name}
                            </Badge>
                          )}
                          {r.overdue > 0 && (
                            <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                              ⚠️ {r.overdue} متأخر
                            </Badge>
                          )}
                          {r.total > 0 && r.done === r.total && (
                            <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
                              ✅ مكتملة
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{r.checklist_title}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span>{r.done}/{r.total} منجزة</span>
                          {r.in_progress > 0 && <span>• {r.in_progress} جارية</span>}
                          {r.pending > 0 && <span>• {r.pending} منتظرة</span>}
                          {r.blocked > 0 && <span className="text-destructive">• {r.blocked} متوقفة</span>}
                          {r.nearest_due && (
                            <span>
                              • أقرب استحقاق: {new Date(r.nearest_due).toLocaleDateString("ar-SA")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-32 shrink-0">
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-muted-foreground">التقدم</span>
                          <span className={cn("font-bold", pct === 100 ? "text-success" : "text-primary")}>{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon?: any;
}) {
  return (
    <div className={cn("rounded-xl p-4 border border-border/50", color.split(" ")[0])}>
      <div className="flex items-center justify-between">
        <div>
          <p className={cn("text-2xl font-bold", color.split(" ")[1])}>{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
        {Icon && <Icon className={cn("w-5 h-5 opacity-50", color.split(" ")[1])} />}
      </div>
    </div>
  );
}
