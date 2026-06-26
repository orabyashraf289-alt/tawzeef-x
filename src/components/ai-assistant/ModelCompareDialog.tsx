import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, GitCompare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { MODEL_OPTIONS, type ModelChoice } from "./ModelSelector";
import { cn } from "@/lib/utils";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

interface Props {
  open: boolean;
  onClose: () => void;
  // The exact conversation context to replay (without the assistant reply we are comparing)
  baseMessages: { role: "user" | "assistant"; content: string }[];
  // The original assistant reply (left column)
  originalReply: string;
  originalModelLabel: string;
}

const COMPARABLE = MODEL_OPTIONS.filter((o) => o.value !== "auto");

export default function ModelCompareDialog({
  open,
  onClose,
  baseMessages,
  originalReply,
  originalModelLabel,
}: Props) {
  const [selectedModel, setSelectedModel] = useState<ModelChoice>(
    "openai/gpt-5-mini"
  );
  const [loading, setLoading] = useState(false);
  const [altReply, setAltReply] = useState("");

  const runCompare = async () => {
    setLoading(true);
    setAltReply("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: baseMessages,
          model_override: selectedModel,
          // disable tool execution for comparisons (text only)
          disable_tools: true,
        }),
      });

      if (resp.status === 429) {
        toast({ title: "تم تجاوز حد الطلبات", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast({ title: "يرجى إضافة رصيد للاستمرار", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("Failed");

      const ct = resp.headers.get("Content-Type") || "";
      if (ct.includes("text/event-stream")) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, idx);
            buf = buf.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") break;
            try {
              const parsed = JSON.parse(json);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                acc += content;
                setAltReply(acc);
              }
            } catch {
              buf = line + "\n" + buf;
              break;
            }
          }
        }
      } else {
        const data = await resp.json();
        setAltReply(data.content || data.error || "(لا يوجد رد)");
      }
    } catch (e) {
      console.error(e);
      toast({ title: "فشل في المقارنة", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <GitCompare className="w-5 h-5 text-primary" />
            مقارنة بين موديلات الذكاء الاصطناعي
          </DialogTitle>
        </DialogHeader>

        {/* Model picker */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border">
          <span className="text-xs text-muted-foreground">قارن مع:</span>
          {COMPARABLE.map((m) => {
            const Icon = m.icon;
            const active = selectedModel === m.value;
            return (
              <button
                key={m.value}
                onClick={() => setSelectedModel(m.value)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:border-primary/40"
                )}
              >
                <Icon className="w-3 h-3" />
                {m.short}
              </button>
            );
          })}
          <Button
            size="sm"
            onClick={runCompare}
            disabled={loading}
            className="ms-auto h-8 text-xs gap-1.5"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {loading ? "جارٍ التوليد..." : "ابدأ المقارنة"}
          </Button>
        </div>

        {/* Side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto flex-1 pt-2">
          {/* Original */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-xl border border-border bg-card p-3 flex flex-col"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
              <span className="text-[11px] font-bold text-foreground">الرد الأصلي</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                {originalModelLabel}
              </span>
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert text-xs leading-relaxed overflow-y-auto">
              <ReactMarkdown>{originalReply || "(لا يوجد محتوى)"}</ReactMarkdown>
            </div>
          </motion.div>

          {/* Alternative */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-xl border border-primary/30 bg-primary/[0.03] p-3 flex flex-col"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-primary/20">
              <span className="text-[11px] font-bold text-primary">رد بديل</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
                {MODEL_OPTIONS.find((o) => o.value === selectedModel)?.short}
              </span>
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert text-xs leading-relaxed overflow-y-auto min-h-[120px]">
              {altReply ? (
                <ReactMarkdown>{altReply}</ReactMarkdown>
              ) : loading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  جارٍ توليد الرد البديل...
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  اختر موديلاً واضغط "ابدأ المقارنة" لتوليد رد بديل بنفس السؤال.
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
