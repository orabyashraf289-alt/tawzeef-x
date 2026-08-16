import { useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Bot, User, Copy, Check, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { cleanAIMessageContent } from "@/lib/cleanAiMessage";

export interface AIChatBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  userName?: string;
}

export default function AIChatBubble({
  role,
  content,
  timestamp,
  userName = "مدير التوظيف",
}: AIChatBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";
  const displayContent = isUser ? content : cleanAIMessageContent(content);

  const handleCopy = () => {
    navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "flex gap-3.5 max-w-3xl my-3 group",
        isUser ? "ms-auto flex-row-reverse" : "me-auto flex-row"
      )}
      dir="rtl"
    >
      {/* Avatar */}
      <div className="shrink-0 mt-0.5">
        {isUser ? (
          <Avatar className="w-8 h-8 border border-primary/20 shadow-xs">
            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
              {userName.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary via-primary/80 to-purple-600 flex items-center justify-center text-primary-foreground shadow-sm shadow-primary/20">
            <Bot className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Bubble Content */}
      <div className="flex-1 min-w-0">
        <div className={cn("flex items-center gap-2 mb-1 px-1", isUser ? "justify-end" : "justify-start")}>
          <span className="text-xs font-semibold text-foreground">
            {isUser ? userName : "ذكي AI"}
          </span>
          {timestamp && (
            <span className="text-[10px] text-muted-foreground">{timestamp}</span>
          )}
        </div>

        <div
          className={cn(
            "p-4 rounded-2xl text-xs leading-relaxed transition-all shadow-2xs relative group/bubble border",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-none border-primary/20"
              : "bg-card/90 text-foreground rounded-tl-none border-border/60 backdrop-blur-md dark:bg-card/70"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap font-medium">{displayContent}</p>
          ) : (
            <div className="prose prose-xs dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-foreground prose-table:border prose-table:border-border prose-th:bg-muted/40 prose-th:p-2 prose-td:p-2 prose-td:border-t prose-td:border-border/40">
              <ReactMarkdown>{displayContent}</ReactMarkdown>
            </div>
          )}

          {/* Action Toolbar on Hover */}
          {!isUser && (
            <div className="absolute top-2 left-2 opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1 bg-background/80 backdrop-blur-sm p-1 rounded-lg border border-border/50 shadow-xs">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="w-6 h-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                title="نسخ النص"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
