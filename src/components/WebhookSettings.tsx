import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Webhook, Plus, Trash2, ExternalLink, CheckCircle2, XCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";

const EVENT_TYPES = [
  { value: "job.created", label: "إنشاء وظيفة جديدة (لنشرها على LinkedIn)" },
  { value: "candidate.status_changed", label: "تغيير حالة مرشح" },
  { value: "job.status_changed", label: "تغيير حالة وظيفة" },
  { value: "offer.status_changed", label: "تغيير حالة عرض عمل" },
  { value: "offer.email_requested", label: "إرسال بريد عرض عمل" },
];

export default function WebhookSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const { data: endpoints, isLoading } = useQuery({
    queryKey: ["webhook-endpoints", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_endpoints")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: deliveries } = useQuery({
    queryKey: ["webhook-deliveries", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_deliveries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addEndpoint = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("webhook_endpoints").insert({
        user_id: user!.id,
        name,
        url,
        events: selectedEvents,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-endpoints"] });
      toast({ title: "تم إضافة Webhook بنجاح ✅" });
      setShowAdd(false);
      setName("");
      setUrl("");
      setSelectedEvents([]);
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const toggleEndpoint = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("webhook_endpoints").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhook-endpoints"] }),
  });

  const deleteEndpoint = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("webhook_endpoints").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-endpoints"] });
      toast({ title: "تم حذف Webhook ✅" });
    },
  });

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-card rounded-xl p-5 border border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Webhook className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Webhooks</h3>
              <p className="text-xs text-muted-foreground">
                ربط أتمتة خارجية عبر Zapier أو n8n عند أحداث النظام
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)} variant={showAdd ? "outline" : "default"}>
            <Plus className="w-4 h-4 ml-1" />
            {showAdd ? "إلغاء" : "إضافة Webhook"}
          </Button>
        </div>

        {/* Add Form */}
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="border-t border-border/50 pt-4 space-y-3">
            <div>
              <Label className="text-xs">الاسم</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: Zapier - إشعار قبول" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">رابط Webhook URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.zapier.com/..." className="mt-1 font-mono text-xs" dir="ltr" />
            </div>
            <div>
              <Label className="text-xs mb-2 block">الأحداث</Label>
              <div className="space-y-2">
                {EVENT_TYPES.map((event) => (
                  <label key={event.value} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
                    <Checkbox
                      checked={selectedEvents.includes(event.value)}
                      onCheckedChange={() => toggleEvent(event.value)}
                    />
                    <span className="text-sm">{event.label}</span>
                    <Badge variant="outline" className="text-[10px] font-mono mr-auto">{event.value}</Badge>
                  </label>
                ))}
              </div>
            </div>
            <Button
              size="sm"
              disabled={!name || !url || selectedEvents.length === 0 || addEndpoint.isPending}
              onClick={() => addEndpoint.mutate()}
            >
              {addEndpoint.isPending ? "جاري الإضافة..." : "حفظ Webhook"}
            </Button>
          </motion.div>
        )}

        {/* Endpoints List */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">جاري التحميل...</p>
        ) : endpoints && endpoints.length > 0 ? (
          <div className="space-y-2 mt-4">
            {endpoints.map((ep) => (
              <div key={ep.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/30">
                <Switch
                  checked={ep.is_active}
                  onCheckedChange={(checked) => toggleEndpoint.mutate({ id: ep.id, is_active: checked })}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{ep.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono truncate" dir="ltr">{ep.url}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {ep.events?.map((ev: string) => (
                      <Badge key={ev} variant="secondary" className="text-[10px]">{ev}</Badge>
                    ))}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" onClick={() => deleteEndpoint.mutate(ep.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : !showAdd ? (
          <p className="text-sm text-muted-foreground text-center py-4">لا يوجد Webhooks مُعدّة بعد</p>
        ) : null}
      </div>

      {/* Recent Deliveries */}
      {deliveries && deliveries.length > 0 && (
        <div className="bg-card rounded-xl p-5 border border-border/50">
          <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-primary" />
            آخر عمليات الإرسال
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {deliveries.map((d) => (
              <div key={d.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/10 text-xs">
                {d.status === "success" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                ) : d.status === "failed" ? (
                  <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <Badge variant="outline" className="text-[10px] font-mono">{d.event_type}</Badge>
                <span className="text-muted-foreground">{d.status_code || "-"}</span>
                <span className="text-muted-foreground mr-auto">{new Date(d.created_at).toLocaleString("ar-SA")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
