import { useState } from "react";
import { Copy, Check, RefreshCw, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MessageActionsProps {
  content: string;
  onRegenerate?: () => void;
}

export default function MessageActions({ content, onRegenerate }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast({ title: "تم نسخ الرد ✅" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "فشل النسخ", variant: "destructive" });
    }
  };

  return (
    <div className="flex items-center gap-1 mt-1">
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="نسخ"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="إعادة توليد"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        onClick={() => { setFeedback("up"); toast({ title: "شكراً للتقييم 👍" }); }}
        className={`p-1.5 rounded-md hover:bg-muted transition-colors ${feedback === "up" ? "text-green-600" : "text-muted-foreground hover:text-foreground"}`}
        title="مفيد"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => { setFeedback("down"); toast({ title: "شكراً، سنحسّن الإجابات" }); }}
        className={`p-1.5 rounded-md hover:bg-muted transition-colors ${feedback === "down" ? "text-red-600" : "text-muted-foreground hover:text-foreground"}`}
        title="غير مفيد"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
