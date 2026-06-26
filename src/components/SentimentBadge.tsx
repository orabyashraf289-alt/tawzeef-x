import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Brain, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SENTIMENT_STYLES: Record<string, { label: string; color: string; emoji: string }> = {
  positive: { label: "إيجابي", color: "bg-success/10 text-success border-success/20", emoji: "😊" },
  negative: { label: "سلبي", color: "bg-destructive/10 text-destructive border-destructive/20", emoji: "😟" },
  neutral: { label: "محايد", color: "bg-muted text-muted-foreground border-border", emoji: "😐" },
  mixed: { label: "مختلط", color: "bg-warning/10 text-warning border-warning/20", emoji: "🤔" },
};

interface SentimentResult {
  sentiment: string;
  confidence: number;
  summary_ar: string;
  key_points: string[];
  recommendation: string;
}

export default function SentimentBadge({ text, context }: { text: string; context?: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SentimentResult | null>(null);

  const analyze = async () => {
    if (result) return; // Already analyzed
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-sentiment", {
        body: { text, context },
      });
      if (error) throw error;
      setResult(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const style = result ? SENTIMENT_STYLES[result.sentiment] || SENTIMENT_STYLES.neutral : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-[10px] gap-1"
          onClick={analyze}
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : result ? (
            <Badge variant="outline" className={`text-[10px] ${style?.color}`}>
              {style?.emoji} {style?.label}
            </Badge>
          ) : (
            <>
              <Brain className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">تحليل</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      {result && (
        <PopoverContent className="w-72 text-xs" dir="rtl" align="start">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold">{style?.emoji} {style?.label}</span>
              <span className="text-muted-foreground">{Math.round(result.confidence * 100)}% ثقة</span>
            </div>
            <p className="text-muted-foreground">{result.summary_ar}</p>
            {result.key_points?.length > 0 && (
              <ul className="space-y-1">
                {result.key_points.map((p, i) => (
                  <li key={i} className="text-muted-foreground">• {p}</li>
                ))}
              </ul>
            )}
            {result.recommendation && (
              <p className="bg-primary/5 rounded-lg p-2 text-primary font-medium">
                💡 {result.recommendation}
              </p>
            )}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
