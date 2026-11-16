import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Webhook,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Zap,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  detectPlatformFromUrl,
  dispatchTeamNotification,
  TEAM_NOTIFICATION_EVENTS,
  type TeamNotificationEvent,
  type TeamPlatformType,
} from "@/lib/teamNotifications";

export default function SlackTeamsIntegrationsHub() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activePlatformTab, setActivePlatformTab] = useState<"all" | "slack" | "teams" | "generic">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    "candidate.applied",
    "candidate.top_match",
    "interview.scheduled",
    "offer.accepted",
  ]);
  const [testingEndpointId, setTestingEndpointId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch configured webhook endpoints
  const { data: endpoints = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["team-webhook-endpoints", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_endpoints")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch recent delivery logs
  const { data: deliveries = [], refetch: refetchDeliveries } = useQuery({
    queryKey: ["team-webhook-deliveries", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_deliveries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Detected platform based on entered URL
  const detectedPlatform = useMemo(() => detectPlatformFromUrl(url), [url]);

  // Add endpoint mutation
  const addEndpoint = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("يجب تسجيل الدخول");
      const { error } = await supabase.from("webhook_endpoints").insert({
        user_id: user.id,
        name: name.trim(),
        url: url.trim(),
        events: selectedEvents,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-webhook-endpoints"] });
      toast({
        title: "تم ربط قناة الإشعارات بنجاح ✅",
        description: `تم إعداد وتفعيل استقبال التنبيهات للقناة (${name})`,
      });
      setShowAddForm(false);
      setName("");
      setUrl("");
      setSelectedEvents(["candidate.applied", "candidate.top_match", "interview.scheduled", "offer.accepted"]);
    },
    onError: (e: any) => {
      toast({ title: "خطأ أثناء الحفظ", description: e.message, variant: "destructive" });
    },
  });

  // Toggle active state
  const toggleEndpoint = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("webhook_endpoints").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-webhook-endpoints"] });
      toast({ title: "تم تحديث حالة القناة" });
    },
  });

  // Delete endpoint
  const deleteEndpoint = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("webhook_endpoints").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-webhook-endpoints"] });
      toast({ title: "تم حذف رابط التكامل بنجاح 🗑️" });
    },
  });

  // Test notification ping
  const handleTestPing = async (endpoint: any) => {
    try {
      setTestingEndpointId(endpoint.id);
      const res = await dispatchTeamNotification(endpoint.url, {
        event: "test.ping",
        title: "تجربة ربط منصة توظيف إكس بنجاح 🚀",
        summary: `هذه رسالة اختبارية لتأكيد وصول الإشعارات اللحظية إلى قناة (${endpoint.name}).`,
        details: {
          "حالة الربط": "نشط ومتصل بالكامل ✅",
          "المنصة": endpoint.platform === "slack" ? "Slack" : endpoint.platform === "teams" ? "Microsoft Teams" : "Webhook",
          "وقت الفحص": new Date().toLocaleTimeString("ar-SA"),
          "نظام التشغيل": "TawzeefX Automation Engine",
        },
        actionUrl: window.location.origin + "/candidates",
        actionText: "الانتقال للوحة التوظيف ↗",
      });

      // Record test delivery in database
      await supabase.from("webhook_deliveries").insert({
        endpoint_id: endpoint.id,
        user_id: user?.id,
        event_type: "test.ping",
        payload: { test: true, ping: "success" },
        status: res.success ? "success" : "failed",
        status_code: res.status,
        response_body: res.message,
      });

      void refetchDeliveries();

      if (res.success) {
        toast({
          title: "تم استلام الإشعار بنجاح في القناة! 🎉",
          description: `استجابت القناة برمز الحالة HTTP ${res.status}. تحقق من الرسالة في ${res.platform === "slack" ? "Slack" : "Microsoft Teams"}.`,
        });
      } else {
        toast({
          title: "فشل إرسال الإشعار للقناة",
          description: `السبب: ${res.message} (رمز الاستجابة: ${res.status})`,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({ title: "فشل الاختبار", description: err.message, variant: "destructive" });
    } finally {
      setTestingEndpointId(null);
    }
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const filteredEndpoints = useMemo(() => {
    if (activePlatformTab === "all") return endpoints;
    return endpoints.filter((ep: any) => detectPlatformFromUrl(ep.url) === activePlatformTab);
  }, [endpoints, activePlatformTab]);

  const slackCount = endpoints.filter((ep: any) => detectPlatformFromUrl(ep.url) === "slack").length;
  const teamsCount = endpoints.filter((ep: any) => detectPlatformFromUrl(ep.url) === "teams").length;
  const genericCount = endpoints.filter((ep: any) => detectPlatformFromUrl(ep.url) === "generic").length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-background rounded-2xl p-6 border border-indigo-500/30 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-foreground">
                  مركز تكاملات Slack و Microsoft Teams والـ Webhooks
                </h2>
                <Badge variant="outline" className="text-[11px] bg-indigo-500/10 text-indigo-400 border-indigo-500/30 font-semibold">
                  تكامل حي ولحظي ⚡
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                اربط قنوات العمل المشتركة في Slack و Teams لتلقي بطاقات تفاعلية فورية عند تقديم مرشح مميز، حجز موعد مقابلة، أو قبول عرض عمل بنقرة واحدة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void refetch();
                void refetchDeliveries();
              }}
              disabled={isFetching}
              className="text-xs h-9 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
              تحديث
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-xs h-9 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              <Plus className="w-4 h-4 ml-0.5" />
              {showAddForm ? "إلغاء" : "إضافة قناة جديدة"}
            </Button>
          </div>
        </div>

        {/* Quick Platform Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-indigo-500/20">
          <div className="bg-card/60 backdrop-blur-xs p-3 rounded-xl border border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">قنوات Slack</span>
              <span className="text-lg font-black text-purple-400">{slackCount}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">بطاقات Block Kit ذكية</p>
          </div>

          <div className="bg-card/60 backdrop-blur-xs p-3 rounded-xl border border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">قنوات MS Teams</span>
              <span className="text-lg font-black text-blue-400">{teamsCount}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">بطاقات تفاعلية Adaptive</p>
          </div>

          <div className="bg-card/60 backdrop-blur-xs p-3 rounded-xl border border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Webhooks عامة</span>
              <span className="text-lg font-black text-emerald-400">{genericCount}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Zapier, n8n, Make</p>
          </div>

          <div className="bg-card/60 backdrop-blur-xs p-3 rounded-xl border border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">إجمالي الإرسال</span>
              <span className="text-lg font-black text-foreground">{deliveries.length}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">عمليات موثقة ومؤكدة</p>
          </div>
        </div>
      </div>

      {/* Add New Integration Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-indigo-500/40 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-500" />
                    ربط قناة جديدة (Slack / Microsoft Teams / Webhook)
                  </span>
                  {url && (
                    <Badge
                      className={
                        detectedPlatform === "slack"
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                          : detectedPlatform === "teams"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      }
                    >
                      {detectedPlatform === "slack" ? "💬 تم التعرف: Slack Incoming Webhook" : detectedPlatform === "teams" ? "💼 تم التعرف: Microsoft Teams Connector" : "🌐 تم التعرف: Generic Webhook"}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">اسم القناة أو الربط</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: #hiring-team في Slack أو فريق التوظيف في Teams"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">رابط Webhook URL</Label>
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://hooks.slack.com/services/... أو https://webhook.office.com/..."
                      className="mt-1 font-mono text-xs"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Guide hints */}
                <div className="bg-muted/20 rounded-xl p-3 text-xs text-muted-foreground flex items-start gap-2.5">
                  <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">كيف تحصل على الرابط؟</p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                      <li><strong>لـ Slack:</strong> ادخل على إدارة التطبيقات في مساحة عملك، وأضف <code>Incoming WebHooks</code> واختر القناة ثم انسخ الرابط.</li>
                      <li><strong>لـ Microsoft Teams:</strong> اضغط على النقاط الثلاث بجوار القناة ⭢ اختر <code>Workflows</code> أو <code>Connectors</code> ⭢ أنشئ <code>Post to a channel when a webhook request is received</code> وانسخ الرابط.</li>
                    </ul>
                  </div>
                </div>

                {/* Event triggers selection */}
                <div>
                  <Label className="text-xs font-semibold mb-2 block">أحداث التنبيه التلقائية</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {TEAM_NOTIFICATION_EVENTS.map((event) => (
                      <label
                        key={event.value}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          selectedEvents.includes(event.value)
                            ? "bg-indigo-500/10 border-indigo-500/40 text-foreground"
                            : "bg-card border-border/40 hover:bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        <Checkbox
                          checked={selectedEvents.includes(event.value)}
                          onCheckedChange={() => toggleEvent(event.value)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold flex items-center gap-1.5">
                            <span>{event.icon}</span>
                            <span>{event.label}</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{event.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                    إلغاء
                  </Button>
                  <Button
                    size="sm"
                    disabled={!name.trim() || !url.trim() || selectedEvents.length === 0 || addEndpoint.isPending}
                    onClick={() => addEndpoint.mutate()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {addEndpoint.isPending ? "جاري الحفظ..." : "حفظ وتفعيل القناة"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Tabs */}
      <Tabs defaultValue="all" onValueChange={(val: any) => setActivePlatformTab(val)}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="all" className="text-xs font-bold">
              جميع القنوات ({endpoints.length})
            </TabsTrigger>
            <TabsTrigger value="slack" className="text-xs font-bold gap-1.5">
              <span>💬</span> Slack ({slackCount})
            </TabsTrigger>
            <TabsTrigger value="teams" className="text-xs font-bold gap-1.5">
              <span>💼</span> Teams ({teamsCount})
            </TabsTrigger>
            <TabsTrigger value="generic" className="text-xs font-bold gap-1.5">
              <span>🌐</span> Webhooks ({genericCount})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Endpoints List */}
        <div className="mt-4">
          {isLoading ? (
            <div className="text-center py-10 bg-card rounded-xl border border-border/40">
              <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">جاري تحميل قنوات التكامل...</p>
            </div>
          ) : filteredEndpoints.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border/60">
              <Webhook className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h4 className="text-sm font-bold text-foreground">لا توجد قنوات مهيأة حالياً</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                قم بإضافة رابط Webhook لقناة Slack أو Microsoft Teams لبدء استقبال الإشعارات التفاعلية فوراً.
              </p>
              <Button
                size="sm"
                onClick={() => setShowAddForm(true)}
                className="mt-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="w-3.5 h-3.5 ml-1" />
                إضافة قناة الآن
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredEndpoints.map((ep: any) => {
                const platform = detectPlatformFromUrl(ep.url);
                const isTesting = testingEndpointId === ep.id;

                return (
                  <Card key={ep.id} className="border-border/50 hover:border-indigo-500/30 transition-all shadow-xs">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base font-bold ${
                            platform === "slack"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : platform === "teams"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {platform === "slack" ? "💬" : platform === "teams" ? "💼" : "🌐"}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-foreground truncate">{ep.name}</h4>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold ${
                                platform === "slack"
                                  ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                  : platform === "teams"
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              }`}
                            >
                              {platform === "slack" ? "Slack Block Kit" : platform === "teams" ? "MS Teams Card" : "Webhook"}
                            </Badge>
                            {ep.is_active ? (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px]">
                                متصل ونشط
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                متوقف مؤقتاً
                              </Badge>
                            )}
                          </div>

                          <p className="text-[11px] text-muted-foreground font-mono mt-1 truncate" dir="ltr">
                            {ep.url}
                          </p>

                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {ep.events?.map((ev: string) => {
                              const meta = TEAM_NOTIFICATION_EVENTS.find((e) => e.value === ev);
                              return (
                                <Badge key={ev} variant="secondary" className="text-[10px] gap-1 font-normal">
                                  <span>{meta?.icon || "⚡"}</span>
                                  <span>{meta?.label || ev}</span>
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Channel Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 w-full sm:w-auto justify-between sm:justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isTesting || !ep.is_active}
                          onClick={() => handleTestPing(ep)}
                          className="text-xs h-8 gap-1.5 font-bold border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                        >
                          <Send className={`w-3.5 h-3.5 ${isTesting ? "animate-pulse" : ""}`} />
                          {isTesting ? "جارِ الفحص..." : "إرسال اختبار ⚡"}
                        </Button>

                        <div className="flex items-center gap-1">
                          <Switch
                            checked={ep.is_active}
                            onCheckedChange={(checked) => toggleEndpoint.mutate({ id: ep.id, is_active: checked })}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 h-8 w-8"
                            onClick={() => deleteEndpoint.mutate(ep.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Tabs>

      {/* Deliveries History Table */}
      {deliveries.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-primary" />
              سجل عمليات الإرسال الأخيرة للقنوات
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => void refetchDeliveries()} className="text-xs h-8">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40 max-h-72 overflow-y-auto">
              {deliveries.map((d: any) => (
                <div key={d.id} className="p-3 hover:bg-muted/20 flex items-center justify-between text-xs transition-colors">
                  <div className="flex items-center gap-3">
                    {d.status === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : d.status === "failed" ? (
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {d.event_type}
                        </Badge>
                        <span className="font-semibold text-foreground">
                          {d.status === "success" ? "تم التسليم بنجاح" : "تعذر التسليم"}
                        </span>
                        {d.status_code && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            (HTTP {d.status_code})
                          </span>
                        )}
                      </div>
                      {d.error_message && (
                        <p className="text-[11px] text-rose-400 mt-0.5 line-clamp-1">{d.error_message}</p>
                      )}
                    </div>
                  </div>

                  <span className="text-muted-foreground text-[11px]">
                    {new Date(d.created_at).toLocaleTimeString("ar-SA")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
