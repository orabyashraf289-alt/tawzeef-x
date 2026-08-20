import React from "react";
import { Bot, Sparkles, Trash2, PanelRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface AIChatHeaderProps {
  onClearChat: () => void;
  messageCount: number;
  isStreaming?: boolean;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  children?: React.ReactNode;
}

export default function AIChatHeader({
  onClearChat,
  messageCount,
  isStreaming = false,
  onToggleSidebar,
  sidebarOpen = false,
  children,
}: AIChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-3.5 px-4 sm:px-5 border-b border-border/40 bg-card/80 backdrop-blur-md sticky top-0 z-20 shrink-0">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`shrink-0 w-9 h-9 rounded-xl transition-colors ${
                    sidebarOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/80"
                  }`}
                  onClick={onToggleSidebar}
                  aria-label="سجل المحادثات"
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {sidebarOpen ? "إخفاء سجل المحادثات" : "عرض سجل المحادثات"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <div className="relative">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary via-primary/80 to-purple-600 flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20">
            <Bot className="w-4.5 h-4.5" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card animate-pulse" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground">مساعد التوظيف الذكي</h2>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 gap-1 px-2 py-0 hidden sm:inline-flex">
              <Sparkles className="w-3 h-3 text-primary animate-pulse" />
              مستشار التوظيف
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-1">
            {isStreaming ? (
              <span className="text-primary font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                جاري التفكير وصياغة التقرير...
              </span>
            ) : (
              "تحليل السير الذاتية، صياغة الشواغر، وإعداد المقابلات"
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {children}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearChat}
                disabled={messageCount <= 0 || isStreaming}
                className="h-8 px-3 text-xs gap-1.5 rounded-xl border-border/60 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">محادثة جديدة</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">مسح المحادثة الحالية والبدء من جديد</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
