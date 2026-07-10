import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface CandidateChatbotProps {
  candidateData?: {
    name: string;
    stage: string;
    status: string;
    role: string | null;
    jobTitle: string | null;
    appliedAt: string;
    trackingCode: string;
  } | null;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/candidate-chatbot`;

export default function CandidateChatbot({ candidateData }: CandidateChatbotProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Set initial greeting
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: `مرحباً بك${candidateData ? ` يا ${candidateData.name}` : ""}! 👋 أنا المساعد الذكي لبوابة المرشح.\n\nيمكنني مساعدتك بالإجابة على أسئلتك حول:\n- حالة طلبك الحالي\n- مراحل التوظيف وتفاصيلها\n- مواعيد المقابلات المقررة\n- أي استفسارات عامة عن الشركة\n\nكيف يمكنني مساعدتك اليوم؟`
      }
    ]);
  }, [candidateData]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 1) Speech Recognition Initialization
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "ar-SA";

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        setIsListening(false);
        toast({ title: "لم نتمكن من الاستماع", description: "يرجى التحقق من صلاحيات الميكروفون والمحاولة مرة أخرى.", variant: "destructive" });
      };
      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          setInput(prev => (prev ? prev + " " + text : text));
        }
      };

      recognitionRef.current = rec;
    }
  }, [toast]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({ title: "التعرف على الصوت غير مدعوم", description: "متصفحك الحالي لا يدعم ميزة الإدخال الصوتي باللغة العربية.", variant: "destructive" });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
      }
    }
  };

  // 2) Text-to-Speech synthesis
  const speakText = (text: string) => {
    if (!isTtsEnabled) return;

    // Stop current speech
    window.speechSynthesis.cancel();

    // Clean markdown characters from text for natural speech synthesis
    const cleanText = text
      .replace(/[*#_\-`]/g, "") // Remove bold, headers, list dashes
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Simplify link format to text only
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "ar-SA";

    // Set voice to Arabic if available
    const voices = window.speechSynthesis.getVoices();
    const arVoice = voices.find(v => v.lang.startsWith("ar"));
    if (arVoice) {
      utterance.voice = arVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  // Stop reading and recording when chatbot closes
  useEffect(() => {
    if (!isOpen) {
      window.speechSynthesis.cancel();
      if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  }, [isOpen, isListening]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";
    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > 1 && prev[prev.length - 2]?.role === "user") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      const allMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          candidateContext: candidateData || null,
        }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error("فشل الاتصال بالمساعد الذكي");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          speakText(assistantContent);
          break;
        }
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) updateAssistant(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      const errMsg = "عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى لاحقاً.";
      setMessages(prev => [...prev, {
        role: "assistant",
        content: errMsg
      }]);
      speakText(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[500px] max-h-[calc(100vh-120px)] bg-card border border-border/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary p-4 flex items-center justify-between" dir="rtl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary-foreground">المساعد الذكي للمرشح</h3>
                  <p className="text-[10px] text-primary-foreground/70">متاح للمساعدة الصوتية 🎙️</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = !isTtsEnabled;
                    setIsTtsEnabled(next);
                    if (!next) {
                      window.speechSynthesis.cancel();
                    } else {
                      toast({ title: "تم تفعيل القراءة الصوتية 🔊" });
                    }
                  }}
                  className="text-primary-foreground/70 hover:text-primary-foreground p-1 rounded-lg hover:bg-primary-foreground/10 transition-colors"
                  title={isTtsEnabled ? "كتم الصوت" : "تفعيل قراءة الردود"}
                >
                  {isTtsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-primary-foreground/70 hover:text-primary-foreground p-1 rounded-lg hover:bg-primary-foreground/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" dir="rtl">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "")}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                    msg.role === "user" ? "bg-primary/10" : "bg-muted"
                  )}>
                    {msg.role === "user" ? <User className="w-3.5 h-3.5 text-primary" /> : <Bot className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm relative group",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}>
                    <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    {msg.role === "assistant" && (
                      <button
                        onClick={() => {
                          setIsTtsEnabled(true);
                          speakText(msg.content);
                        }}
                        className="absolute bottom-1 left-2 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-0.5 rounded text-muted-foreground"
                        title="اقرأ بصوت عالٍ"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border/50" dir="rtl">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder={isListening ? "جاري الاستماع والترجمة..." : "اكتب سؤالك هنا..."}
                  className="text-sm flex-1"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  size="icon"
                  variant={isListening ? "destructive" : "outline"}
                  onClick={toggleListening}
                  className="shrink-0"
                  disabled={isLoading}
                  title={isListening ? "إيقاف الاستماع" : "التحدث بصوتك"}
                >
                  {isListening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
                </Button>
                <Button size="icon" onClick={handleSend} disabled={isLoading || (!input.trim() && !isListening)} className="shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
