import { Bot, Sparkles, Trash2, Zap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface AIChatHeaderProps {
  onClearChat: () => void;
  messageCount: number;
  isStreaming?: boolean;
}

export default function AIChatHeader({
  onClearChat,
  messageCount,
  isStreaming = false,
}: AIChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 px-6 border-b border-border/50 bg-card/60 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary via-primary/80 to-purple-600 flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20">
            <Bot className="w-5 h-5" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card animate-pulse" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">المساعد الذكي (ذكي AI)</h2>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 gap-1 px-2">
              <Sparkles className="w-3 h-3" />
              Gemini 2.0 Flash
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {isStreaming ? (
              <span className="text-primary font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                جاري التفكير وصياغة التقرير...
              </span>
            ) : (
              "مستشارك التنفيذي لإدارة التوظيف وتحليل السير الذاتية"
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearChat}
                disabled={messageCount <= 1 || isStreaming}
                className="h-9 px-3 text-xs gap-1.5 rounded-xl border-border/60 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>محادثة جديدة</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">مسح المحادثة الحالية والبدء من جديد</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
