import { useState } from "react";
import { Sparkles, Search, X, ArrowRight, Loader2, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface SemanticResult {
  id: string;
  name: string;
  role?: string;
  email?: string;
  skills?: string[];
  ai_score?: number;
  stage?: string;
  _score: number;
  _matched: string[];
}

const EXAMPLES = [
  "مطور React بخبرة 5 سنوات في الرياض",
  "مصمم UI/UX يعرف Figma",
  "مهندس بيانات Python و SQL",
  "Senior backend engineer Node.js",
];

export default function SemanticSearchDialog({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SemanticResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [expansion, setExpansion] = useState("");

  if (!open) return null;

  const runSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("semantic-search-candidates", {
        body: { query: q.trim(), limit: 20 },
      });
      if (error) throw error;
      setResults(data?.results || []);
      setExpansion(data?.query_expansion || "");
      if ((data?.results || []).length === 0) {
        toast({ title: "لم يتم العثور على نتائج" });
      }
    } catch (e: any) {
      toast({ title: "خطأ في البحث", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const initials = (n: string) => n.split(" ").map(x => x[0]).slice(0, 2).join("");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh]" dir="rtl">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-card rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-border/50"
      >
        {/* Header */}
        <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-foreground">بحث ذكي بـ AI</h3>
              <p className="text-[11px] text-muted-foreground">صف ما تبحث عنه بلغة طبيعية، سيقوم AI بفهم النية وترتيب النتائج</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>

          <div className="flex gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && runSearch(query)}
                placeholder="مثال: مطور React بخبرة 5 سنوات يعرف TypeScript..."
                className="pr-10 h-10"
                autoFocus
              />
            </div>
            <Button onClick={() => runSearch(query)} disabled={!query.trim() || loading} className="h-10 gap-1.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              ابحث
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!loading && results.length === 0 && (
            <div className="p-5">
              <p className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase">جرّب أمثلة</p>
              <div className="space-y-1.5">
                {EXAMPLES.map(ex => (
                  <button
                    key={ex}
                    onClick={() => { setQuery(ex); runSearch(ex); }}
                    className="w-full text-right text-xs px-3 py-2.5 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-colors flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {expansion && results.length > 0 && (
            <div className="px-5 pt-3 pb-2">
              <p className="text-[10px] text-muted-foreground">
                <span className="font-semibold">توسيع AI:</span> {expansion}
              </p>
            </div>
          )}

          <div className="p-3 space-y-1.5">
            <AnimatePresence>
              {results.map((r, idx) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                >
                  <Link
                    to={`/candidates/${r.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-colors group"
                  >
                    <Avatar className="w-9 h-9 border border-border/50">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials(r.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-primary/5 text-primary border-primary/20">
                          {Math.round(r._score * 100)}%
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {r.role || "—"}{r.stage ? ` • ${r.stage}` : ""}
                      </p>
                      {r._matched && r._matched.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {r._matched.slice(0, 4).map(t => (
                            <span key={t} className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <div className="text-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">جاري البحث الذكي...</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
