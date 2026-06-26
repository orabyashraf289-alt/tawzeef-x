import { Button } from "@/components/ui/button";
import { Download, FileText, Code, FileDown, Printer } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportConversationProps {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  title?: string;
}

export default function ExportConversation({ messages, title = "محادثة المساعد الذكي" }: ExportConversationProps) {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const hasNoMessages = messages.length <= 1;

  const exportMarkdown = () => {
    const date = new Date().toLocaleString(isAr ? "ar-SA" : "en-US");
    const lines = [
      `# ${title}`,
      `📅 ${date}`,
      `🌐 Tawzeef-X | ${isAr ? "المساعد الذكي" : "AI Assistant"}`,
      "",
      "---",
      "",
      ...messages.map((m, i) =>
        `## ${m.role === "user" ? (isAr ? "👤 أنت" : "👤 User") : (isAr ? "🤖 المساعد" : "🤖 Assistant")} (${i + 1})\n\n${m.content}\n`
      ),
    ];
    const content = lines.join("\n");
    downloadFile(content, `tawzeef-chat-${Date.now()}.md`, "text/markdown;charset=utf-8");
    toast({ title: isAr ? "تم تصدير المحادثة كـ Markdown ✅" : "Exported as Markdown ✅" });
  };

  const exportTxt = () => {
    const date = new Date().toLocaleString(isAr ? "ar-SA" : "en-US");
    const lines = [
      `${title}`,
      `Date: ${date}`,
      `Platform: Tawzeef-X`,
      "========================================",
      "",
      ...messages.map((m, i) =>
        `[${m.role === "user" ? (isAr ? "أنت" : "User") : (isAr ? "المساعد" : "Assistant")}]:\n${m.content}\n----------------------------------------\n`
      ),
    ];
    const content = lines.join("\n");
    downloadFile(content, `tawzeef-chat-${Date.now()}.txt`, "text/plain;charset=utf-8");
    toast({ title: isAr ? "تم تصدير المحادثة كـ نص بسيط ✅" : "Exported as Plain Text ✅" });
  };

  const exportJson = () => {
    const content = JSON.stringify(messages, null, 2);
    downloadFile(content, `tawzeef-chat-${Date.now()}.json`, "application/json;charset=utf-8");
    toast({ title: isAr ? "تم تصدير المحادثة كـ JSON ✅" : "Exported as JSON ✅" });
  };

  const exportPdfPrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: isAr ? "فشل فتح نافذة الطباعة" : "Failed to open print window", variant: "destructive" });
      return;
    }
    
    const isRtl = isAr;
    const direction = isRtl ? "rtl" : "ltr";
    
    printWindow.document.write(`
      <html dir="${direction}" lang="${locale}">
        <head>
          <title>${title}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1f2937; line-height: 1.6; }
            h1 { border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; color: #111827; margin-bottom: 5px; }
            .meta { font-size: 13px; color: #6b7280; margin-bottom: 30px; }
            .message { margin-bottom: 20px; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; page-break-inside: avoid; }
            .user { background-color: #f9fafb; border-${isRtl ? "right" : "left"}: 4px solid #6366f1; }
            .assistant { background-color: #f0fdf4; border-${isRtl ? "right" : "left"}: 4px solid #10b981; }
            .role { font-weight: bold; margin-bottom: 8px; color: #374151; font-size: 14px; }
            .content { white-space: pre-wrap; font-size: 14px; }
            @media print {
              body { padding: 20px; }
              .message { border: 1px solid #d1d5db; }
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="meta">📅 ${new Date().toLocaleString(isAr ? "ar-SA" : "en-US")} | Tawzeef-X AI Assistant</div>
          ${messages.map((m) => `
            <div class="message ${m.role}">
              <div class="role">${m.role === "user" ? (isAr ? "👤 أنت" : "👤 User") : (isAr ? "🤖 المساعد الذكي" : "🤖 Assistant")}</div>
              <div class="content">${m.content}</div>
            </div>
          `).join("")}
          <script>
            window.onload = function() {
              window.print();
              // Do not immediately close to let the print dialog settle
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast({ title: isAr ? "تم تجهيز ملف الطباعة/PDF ✅" : "Print/PDF layout loaded ✅" });
  };

  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={hasNoMessages}
          className="text-xs h-8 gap-1 shadow-sm hover:bg-accent hover:text-accent-foreground transition-all duration-200"
          title={isAr ? "تصدير المحادثة" : "Export Conversation"}
        >
          <Download className="w-3.5 h-3.5" />
          {isAr ? "تصدير" : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl border border-border/60 bg-card p-1 shadow-md">
        <DropdownMenuItem onClick={exportMarkdown} className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer">
          <FileDown className="w-4 h-4 text-primary" />
          <span>Markdown (.md)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportTxt} className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer">
          <FileText className="w-4 h-4 text-accent" />
          <span>Text (.txt)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportJson} className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer">
          <Code className="w-4 h-4 text-warning" />
          <span>JSON (.json)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPdfPrint} className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer border-t border-border/30 mt-1 pt-2">
          <Printer className="w-4 h-4 text-success" />
          <span className="font-semibold">{isAr ? "طباعة / حفظ PDF" : "Print / Save PDF"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
