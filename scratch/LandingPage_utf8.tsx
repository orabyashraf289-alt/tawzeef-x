import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { Link } from "react-router-dom";
import { Users, Bot, ArrowLeft, TrendingUp, Shield, Globe, CheckCircle2, Zap, Star, Briefcase, FileText, BarChart3, Video, Sparkles, Award, Play, ArrowUpRight, MousePointerClick, Layout, MessageSquare, Calendar, Send, Menu, X, Sun, Moon, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform, AnimatePresence, useInView, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";

import { supabase } from "@/integrations/supabase/client";

const features = [
  { icon: Bot, title: "╪░┘â╪º╪í ╪º╪╡╪╖┘å╪º╪╣┘è ┘à╪¬┘é╪»┘à", description: "┘ü┘ä╪¬╪▒╪⌐ ┘ê╪¬╪╡┘å┘è┘ü ╪º┘ä┘à╪▒╪┤╪¡┘è┘å ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ╪¿╪º╪│╪¬╪«╪»╪º┘à AI ┘à╪╣ ╪¬┘é┘è┘è┘à ╪┤╪º┘à┘ä ┘ä┘ä┘à┘ç╪º╪▒╪º╪¬ ┘ê╪º┘ä╪«╪¿╪▒╪º╪¬", color: "primary", highlight: "╪¬┘ê┘ü┘è╪▒ 80% ┘à┘å ╪º┘ä┘ê┘é╪¬" },
  { icon: Users, title: "╪Ñ╪»╪º╪▒╪⌐ ┘à╪▒╪┤╪¡┘è┘å ╪º╪¡╪¬╪▒╪º┘ü┘è╪⌐", description: "Kanban Board ┘à╪¬┘é╪»┘à ┘ä╪¬╪¬╪¿╪╣ ╪º┘ä┘à╪▒╪┤╪¡┘è┘å ╪╣╪¿╪▒ ╪¼┘à┘è╪╣ ┘à╪▒╪º╪¡┘ä ╪º┘ä╪¬┘ê╪╕┘è┘ü ┘à╪╣ ┘à┘é╪º╪▒┘å╪⌐ ┘ü┘ê╪▒┘è╪⌐", color: "accent", highlight: "┘à┘é╪º╪▒┘å╪⌐ ╪¡╪¬┘ë 4 ┘à╪▒╪┤╪¡┘è┘å" },
  { icon: Video, title: "┘à┘é╪º╪¿┘ä╪º╪¬ ╪ú┘ê┘å┘ä╪º┘è┘å ┘à╪»┘à╪¼╪⌐", description: "╪║╪▒┘ü ┘ü┘è╪»┘è┘ê ┘à╪»┘à╪¼╪⌐ ┘ü┘è ╪º┘ä┘à┘å╪╡╪⌐ ┘à╪╣ ╪¬╪│╪¼┘è┘ä ┘ê┘å╪│╪« ┘å╪╡┘è ╪¬┘ä┘é╪º╪ª┘è ┘ê╪¬┘é┘è┘è┘à ╪¬┘ü╪╡┘è┘ä┘è", color: "warning", highlight: "╪¬╪│╪¼┘è┘ä + ┘å╪│╪« ┘å╪╡┘è" },
  { icon: TrendingUp, title: "╪¬┘é╪º╪▒┘è╪▒ ┘ê╪¬╪¡┘ä┘è┘ä╪º╪¬ ╪░┘â┘è╪⌐", description: "┘ä┘ê╪¡╪⌐ ╪¬╪¡┘â┘à ╪¬┘ü╪º╪╣┘ä┘è╪⌐ ┘à╪╣ ╪▒╪│┘ê┘à ╪¿┘è╪º┘å┘è╪⌐ ┘à╪¬┘é╪»┘à╪⌐ ┘ê╪¬╪╡╪»┘è╪▒ PDF ┘ê┘à╪ñ╪┤╪▒╪º╪¬ ╪ú╪»╪º╪í KPIs", color: "success", highlight: "╪¬╪╡╪»┘è╪▒ PDF" },
  { icon: FileText, title: "╪╣╪▒┘ê╪╢ ┘ê╪╕┘è┘ü┘è╪⌐ ╪▒┘é┘à┘è╪⌐", description: "╪Ñ┘å╪┤╪º╪í ┘ê╪Ñ╪▒╪│╪º┘ä ╪╣╪▒┘ê╪╢ ┘ê╪╕┘è┘ü┘è╪⌐ ╪º╪¡╪¬╪▒╪º┘ü┘è╪⌐ ┘à╪╣ ╪¬┘ê┘é┘è╪╣ ╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è ┘ê╪¬╪¬╪¿╪╣ ╪º┘ä╪º╪│╪¬╪¼╪º╪¿╪⌐", color: "info", highlight: "╪¬┘ê┘é┘è╪╣ ╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è" },
  { icon: Shield, title: "╪ú┘à╪º┘å ┘ê╪╡┘ä╪º╪¡┘è╪º╪¬ ┘à╪¬┘é╪»┘à╪⌐", description: "┘å╪╕╪º┘à ╪ú╪»┘ê╪º╪▒ ┘à╪¬╪╣╪»╪» ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬ ┘à╪╣ ╪╡┘ä╪º╪¡┘è╪º╪¬ ╪»┘é┘è┘é╪⌐ ┘ê╪»╪╣┘ê╪º╪¬ ┘ü╪▒┘è┘é ╪ó┘à┘å╪⌐", color: "destructive", highlight: "RLS + ╪¬╪┤┘ü┘è╪▒" },
];

const colorMap: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  destructive: "bg-destructive/10 text-destructive",
};

const defaultStats = [
  { value: 50, suffix: "+", label: "╪»┘ê┘ä╪⌐ ┘à╪»╪╣┘ê┘à╪⌐", icon: Globe },
  { value: 0, suffix: "", label: "┘ê╪╕┘è┘ü╪⌐ ┘å╪┤╪╖╪⌐", icon: Briefcase },
  { value: 0, suffix: "", label: "┘à╪▒╪┤╪¡ ┘à╪│╪¼┘ä", icon: Users },
  { value: 99.9, suffix: "%", label: "┘ê┘é╪¬ ╪º┘ä╪¬╪┤╪║┘è┘ä", icon: Zap },
];

const steps = [
  { num: "01", title: "╪ú┘å╪┤╪ª ┘ê╪╕┘è┘ü╪⌐", description: "╪¡╪»╪» ╪º┘ä┘à╪¬╪╖┘ä╪¿╪º╪¬ ┘ê╪º┘ä┘à┘ç╪º╪▒╪º╪¬ ╪¿╪º╪│╪¬╪«╪»╪º┘à ┘é┘ê╪º┘ä╪¿ ╪¼╪º┘ç╪▓╪⌐ ╪ú┘ê ╪ú┘å╪┤╪ª ┘ê╪╕┘è┘ü╪⌐ ┘à╪«╪╡╪╡╪⌐", icon: Briefcase },
  { num: "02", title: "╪º╪│╪¬┘é╪¿┘ä ╪º┘ä┘à╪¬┘é╪»┘à┘è┘å", description: "╪┤╪º╪▒┘â ╪▒╪º╪¿╪╖ ╪º┘ä╪¬┘é╪»┘è┘à ╪º┘ä┘à╪¿╪º╪┤╪▒ ┘ê╪º╪│╪¬┘é╪¿┘ä ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ┘à┘å ╪¼┘à┘è╪╣ ╪ú┘å╪¡╪º╪í ╪º┘ä╪╣╪º┘ä┘à", icon: Globe },
  { num: "03", title: "┘ü┘ä╪¬╪▒╪⌐ ╪░┘â┘è╪⌐ ╪¿╪º┘ä┘Ç AI", description: "╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è ┘è╪¡┘ä┘ä ╪º┘ä╪│┘è╪▒ ╪º┘ä╪░╪º╪¬┘è╪⌐ ┘ê┘è╪▒╪¬╪¿ ╪º┘ä┘à╪▒╪┤╪¡┘è┘å ╪¡╪│╪¿ ╪º┘ä╪¬╪╖╪º╪¿┘é", icon: Bot },
  { num: "04", title: "┘é╪º╪¿┘ä ┘ê┘ê╪╕┘æ┘ü", description: "╪¼╪»┘ê┘ä ┘à┘é╪º╪¿┘ä╪º╪¬ ╪ú┘ê┘å┘ä╪º┘è┘å╪î ┘é┘è┘æ┘à ╪º┘ä┘à╪▒╪┤╪¡┘è┘å╪î ┘ê╪ú╪▒╪│┘ä ╪º┘ä╪╣╪▒┘ê╪╢ ╪º┘ä┘ê╪╕┘è┘ü┘è╪⌐ ╪¿┘å┘é╪▒╪º╪¬", icon: Award },
];

const testimonials = [
  { name: "╪ú╪¡┘à╪» ┘à╪¡┘à╪»", role: "┘à╪»┘è╪▒ ╪º┘ä┘à┘ê╪º╪▒╪» ╪º┘ä╪¿╪┤╪▒┘è╪⌐", company: "╪¬┘è┘â ╪Ñ┘å┘ê┘ü┘è╪┤┘å", content: "╪║┘è╪▒╪¬ ┘ç╪░┘ç ╪º┘ä┘à┘å╪╡╪⌐ ╪╖╪▒┘è┘é╪⌐ ╪╣┘à┘ä┘å╪º ┘ü┘è ╪º┘ä╪¬┘ê╪╕┘è┘ü. ╪¬┘ê┘ü┘è╪▒ ┘ü┘è ╪º┘ä┘ê┘é╪¬ ┘ê╪º┘ä╪¼┘ç╪» ╪¿┘å╪│╪¿╪⌐ 80%. ╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è ┘è┘ê┘ü╪▒ ╪¬┘é┘è┘è┘à╪º╪¬ ╪»┘é┘è┘é╪⌐ ┘ä┘ä┘à╪▒╪┤╪¡┘è┘å.", rating: 5 },
  { name: "╪│╪º╪▒╪⌐ ╪ú╪¡┘à╪»", role: "┘à╪»┘è╪▒╪⌐ ╪º┘ä╪¬┘ê╪╕┘è┘ü", company: "╪│┘à╪º╪▒╪¬ ╪│┘ê┘ä┘ê╪┤┘å╪▓", content: "╪ú┘ü╪╢┘ä ┘à┘å╪╡╪⌐ ╪¬┘ê╪╕┘è┘ü ╪º╪│╪¬╪«╪»┘à╪¬┘ç╪º. ╪º┘ä┘à┘é╪º╪¿┘ä╪º╪¬ ╪º┘ä╪ú┘ê┘å┘ä╪º┘è┘å ╪º┘ä┘à╪»┘à╪¼╪⌐ ┘ê╪º┘ä┘å╪│╪« ╪º┘ä┘å╪╡┘è ╪º┘ä╪¬┘ä┘é╪º╪ª┘è ┘ê┘ü┘æ╪▒╪º ╪╣┘ä┘è┘å╪º ╪│╪º╪╣╪º╪¬ ┘à┘å ╪º┘ä╪╣┘à┘ä ╪º┘ä┘è┘ê┘à┘è.", rating: 5 },
  { name: "┘à╪¡┘à╪» ╪╣┘ä┘è", role: "CEO", company: "╪»┘è╪¼┘è╪¬╪º┘ä ┘ê┘è┘ü", content: "╪º╪│╪¬╪╖╪╣┘å╪º ╪º┘ä╪╣╪½┘ê╪▒ ╪╣┘ä┘ë ╪ú┘ü╪╢┘ä ╪º┘ä┘à┘ê╪º┘ç╪¿ ┘ü┘è ┘ê┘é╪¬ ┘é┘è╪º╪│┘è. ╪º┘ä╪¬┘é╪º╪▒┘è╪▒ ╪º┘ä╪¬┘ü╪╡┘è┘ä┘è╪⌐ ╪│╪º╪╣╪»╪¬┘å╪º ╪╣┘ä┘ë ╪º╪¬╪«╪º╪░ ┘é╪▒╪º╪▒╪º╪¬ ╪¬┘ê╪╕┘è┘ü ╪ú┘ü╪╢┘ä.", rating: 5 },
  { name: "┘å┘ê╪▒╪⌐ ╪º┘ä╪¡╪▒╪¿┘è", role: "╪▒╪ª┘è╪│╪⌐ ┘é╪│┘à ╪º┘ä╪¬┘ê╪╕┘è┘ü", company: "┘â┘ä╪º╪│┘è╪▒╪º ┘ä┘ä╪¬╪╣┘ä┘è┘à", content: "╪º┘ä┘à┘å╪╡╪⌐ ╪│┘ç┘ä╪¬ ╪╣┘ä┘è┘å╪º ╪Ñ╪»╪º╪▒╪⌐ ╪ú┘â╪½╪▒ ┘à┘å 200 ╪╖┘ä╪¿ ╪¬┘ê╪╕┘è┘ü ╪┤┘ç╪▒┘è╪º┘ï. ┘å╪╕╪º┘à ╪º┘ä╪¬╪¬╪¿╪╣ ┘ê╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä┘ü┘ê╪▒┘è╪⌐ ┘ä╪º ┘è┘Å┘é╪»┘æ╪▒ ╪¿╪½┘à┘å.", rating: 5 },
  { name: "╪«╪º┘ä╪» ╪º┘ä╪╣╪¬┘è╪¿┘è", role: "┘à╪»┘è╪▒ ╪º┘ä╪╣┘à┘ä┘è╪º╪¬", company: "┘å┘è┘ê┘à ╪¬┘â┘å┘ê┘ä┘ê╪¼┘è", content: "╪º┘ä╪╣╪▒┘ê╪╢ ╪º┘ä┘ê╪╕┘è┘ü┘è╪⌐ ╪º┘ä╪▒┘é┘à┘è╪⌐ ┘à╪╣ ╪º┘ä╪¬┘ê┘é┘è╪╣ ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è ╪ú┘å┘ç╪¬ ┘à╪┤┘â┘ä╪⌐ ╪º┘ä╪¬╪ú╪«┘è╪▒ ┘ü┘è ╪Ñ╪¬┘à╪º┘à ╪╣┘à┘ä┘è╪º╪¬ ╪º┘ä╪¬┘ê╪╕┘è┘ü ╪¬┘à╪º┘à╪º┘ï.", rating: 5 },
  { name: "╪▒┘è┘à ╪º┘ä┘é╪¡╪╖╪º┘å┘è", role: "HR Manager", company: "┘ü┘è┘ê╪¬╪┤╪▒ ╪¿┘è┘ä╪»", content: "╪º┘ä╪▒╪¿╪╖ ┘à╪╣ Zapier ┘ê n8n ┘ê┘ü┘æ╪▒ ╪╣┘ä┘è┘å╪º ╪│╪º╪╣╪º╪¬ ┘à┘å ╪º┘ä╪╣┘à┘ä ╪º┘ä┘è╪»┘ê┘è. ╪º┘ä╪ú╪¬┘à╪¬╪⌐ ┘ü┘è ┘ç╪░┘ç ╪º┘ä┘à┘å╪╡╪⌐ ╪º╪│╪¬╪½┘å╪º╪ª┘è╪⌐.", rating: 4 },
];

const capabilities = [
  "┘é┘ê╪º┘ä╪¿ ┘ê╪╕┘è┘ü┘è╪⌐ ╪¼╪º┘ç╪▓╪⌐", "╪¬┘é┘è┘è┘à AI ╪¬┘ä┘é╪º╪ª┘è", "Kanban Board ┘à╪¬┘é╪»┘à", "┘à┘é╪º╪¿┘ä╪º╪¬ ┘ü┘è╪»┘è┘ê ┘à╪»┘à╪¼╪⌐",
  "╪¬╪│╪¼┘è┘ä ┘ê┘å╪│╪« ┘å╪╡┘è", "╪╣╪▒┘ê╪╢ ┘ê╪╕┘è┘ü┘è╪⌐ ╪▒┘é┘à┘è╪⌐", "╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘ü┘ê╪▒┘è╪⌐", "╪¬┘é╪º╪▒┘è╪▒ PDF",
  "Webhooks & API", "┘ê╪╢╪╣ ╪»╪º┘â┘å", "╪¿┘ê╪º╪¿╪⌐ ╪º┘ä┘à╪▒╪┤╪¡", "╪¡╪¼╪▓ ┘à┘é╪º╪¿┘ä╪º╪¬ ╪░╪º╪¬┘è",
];

/* ΓöÇΓöÇΓöÇ Interactive Demo ΓöÇΓöÇΓöÇ */
const demoTabs = [
  { id: "dashboard", label: "┘ä┘ê╪¡╪⌐ ╪º┘ä╪¬╪¡┘â┘à", icon: Layout },
  { id: "candidates", label: "╪º┘ä┘à╪▒╪┤╪¡┘è┘å", icon: Users },
  { id: "ai", label: "╪¬┘é┘è┘è┘à AI", icon: Bot },
  { id: "interviews", label: "╪º┘ä┘à┘é╪º╪¿┘ä╪º╪¬", icon: Calendar },
];

const demoCandidates = [
  { name: "╪ú╪¡┘à╪» ┘à╪¡┘à╪»", role: "┘à╪╖┘ê╪▒ React", score: 92, stage: "┘à┘é╪º╪¿┘ä╪⌐", avatar: "╪ú" },
  { name: "╪│╪º╪▒╪⌐ ╪╣┘ä┘è", role: "┘à╪╡┘à┘à╪⌐ UX", score: 88, stage: "╪¬┘é┘è┘è┘à", avatar: "╪│" },
  { name: "╪«╪º┘ä╪» ╪¡╪│┘å", role: "┘à╪»┘è╪▒ ┘à╪┤╪º╪▒┘è╪╣", score: 85, stage: "╪╣╪▒╪╢ ┘ê╪╕┘è┘ü┘è", avatar: "╪«" },
  { name: "┘å┘ê╪▒╪⌐ ╪│╪╣╪»", role: "┘à╪¡┘ä┘ä╪⌐ ╪¿┘è╪º┘å╪º╪¬", score: 79, stage: "┘ü┘ä╪¬╪▒╪⌐", avatar: "┘å" },
];

function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [hoveredCandidate, setHoveredCandidate] = useState<number | null>(null);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [candidatesList, setCandidatesList] = useState(demoCandidates);
  const [transcriptText, setTranscriptText] = useState("");

  useEffect(() => {
    if (!isVideoActive) {
      setTranscriptText("");
      return;
    }
    const sentences = [
      "╪¼╪º╪▒┘è ╪º┘ä╪º╪¬╪╡╪º┘ä ╪¿╪║╪▒┘ü╪⌐ ╪º┘ä┘à┘é╪º╪¿┘ä╪º╪¬ ╪º┘ä╪░┘â┘è╪⌐...",
      "╪│╪º╪▒╪⌐: ╪º┘ä╪│┘ä╪º┘à ╪╣┘ä┘è┘â┘à╪î ╪┤┘â╪▒╪º┘ï ┘ä╪º╪│╪¬╪╢╪º┘ü╪¬┘è ┘ü┘è ┘ç╪░┘ç ╪º┘ä┘à┘é╪º╪¿┘ä╪⌐.",
      "╪º┘ä╪▒┘ê╪¿┘ê╪¬: ┘ê╪╣┘ä┘è┘â┘à ╪º┘ä╪│┘ä╪º┘à ╪│╪º╪▒╪⌐. ┘è╪│╪╣╪»┘å╪º ┘ê╪¼┘ê╪»┘â ┘à╪╣┘å╪º ╪º┘ä┘è┘ê┘à.",
      "╪│╪º╪▒╪⌐: ╪ú┘å╪º ┘à╪¬╪¡┘à╪│╪⌐ ┘ä┘à┘å╪º┘é╪┤╪⌐ ╪«╪¿╪▒╪¬┘è ┘ü┘è React ┘ê TailwindCSS.",
      "╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è: ╪¬┘à ╪¬╪¡┘ä┘è┘ä ╪º┘ä╪¬┘ê╪º┘ü┘é ╪º┘ä┘ä╪║┘ê┘è ┘ê╪º┘ä╪¬┘é┘å┘è ΓÇö ┘å╪│╪¿╪⌐ ┘å╪¼╪º╪¡ ╪╣╪º┘ä┘è╪⌐ 92%."
    ];
    let idx = 0;
    const interval = setInterval(() => {
      setTranscriptText(sentences[idx]);
      idx = (idx + 1) % sentences.length;
    }, 3500);
    setTranscriptText(sentences[0]);
    return () => clearInterval(interval);
  }, [isVideoActive]);

  const cycleCandidateStage = (index: number) => {
    const stages = ["┘ü┘ä╪¬╪▒╪⌐", "╪¬┘é┘è┘è┘à", "┘à┘é╪º╪¿┘ä╪⌐", "╪╣╪▒╪╢ ┘ê╪╕┘è┘ü┘è", "╪¬┘à ╪º┘ä╪¬┘ê╪╕┘è┘ü"];
    setCandidatesList(prev => prev.map((c, idx) => {
      if (idx !== index) return c;
      const currentIdx = stages.indexOf(c.stage);
      const nextIdx = (currentIdx + 1) % stages.length;
      return { ...c, stage: stages[nextIdx] };
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-5xl mx-auto"
    >
      {/* Browser chrome */}
      <div className="glass-card shadow-2xl overflow-hidden relative">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/60 bg-muted/40 backdrop-blur-md">
          <div className="flex gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-destructive/70" />
            <div className="w-3.5 h-3.5 rounded-full bg-warning/70" />
            <div className="w-3.5 h-3.5 rounded-full bg-success/70" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-muted/65 rounded-lg px-4 py-1 text-xs text-muted-foreground font-mono flex items-center gap-2">
              <Shield className="w-3 h-3 text-success" />
              tawzeef-x.app/dashboard
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border bg-muted/10 px-4 gap-1 overflow-x-auto">
          {demoTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                // Auto close video room if switching tabs
                setIsVideoActive(false);
              }}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="demo-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="p-6 min-h-[400px] relative">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "┘ê╪╕╪º╪ª┘ü ┘å╪┤╪╖╪⌐", value: "12", change: "+3", icon: Briefcase, color: "primary" },
                    { label: "┘à╪▒╪┤╪¡┘è┘å ╪¼╪»╪»", value: "48", change: "+15", icon: Users, color: "accent" },
                    { label: "┘à┘é╪º╪¿┘ä╪º╪¬ ╪º┘ä┘è┘ê┘à", value: "5", change: "+2", icon: Video, color: "warning" },
                    { label: "╪╣╪▒┘ê╪╢ ┘à╪▒╪│┘ä╪⌐", value: "8", change: "+4", icon: Send, color: "success" },
                  ].map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.08 }}
                      className="bg-muted/30 border border-border rounded-xl p-4 group hover:border-primary/20 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">{s.label}</span>
                        <s.icon className={`w-4 h-4 text-${s.color}`} />
                      </div>
                      <div className="text-2xl font-bold text-foreground">{s.value}</div>
                      <span className="text-xs text-success font-medium">{s.change} ┘ç╪░╪º ╪º┘ä╪ú╪│╪¿┘ê╪╣</span>
                    </motion.div>
                  ))}
                </div>
                {/* Mini chart simulation */}
                <div className="bg-muted/20 border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-foreground">┘å╪┤╪º╪╖ ╪º┘ä╪¬┘ê╪╕┘è┘ü</span>
                    <span className="text-xs text-muted-foreground">╪ó╪«╪▒ 7 ╪ú┘è╪º┘à</span>
                  </div>
                  <div className="flex items-end gap-2 h-32">
                    {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 rounded-t-lg bg-primary/20 relative overflow-hidden"
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <motion.div
                          className="absolute inset-0 bg-primary/40 rounded-t-lg"
                          initial={{ y: "100%" }}
                          whileHover={{ y: "0%" }}
                          transition={{ duration: 0.2 }}
                        />
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                    {["╪│╪¿╪¬", "╪ú╪¡╪»", "╪Ñ╪½┘å┘è┘å", "╪½┘ä╪º╪½╪º╪í", "╪ú╪▒╪¿╪╣╪º╪í", "╪«┘à┘è╪│", "╪¼┘à╪╣╪⌐"].map((d) => (
                      <span key={d} className="flex-1 text-center">{d}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "candidates" && (
              <motion.div key="candidates" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground mb-1">
                    * ╪º╪╢╪║╪╖ ╪╣┘ä┘ë ╪ú┘è ┘à╪▒╪┤╪¡ ┘ä╪¬╪║┘è┘è╪▒ ┘à╪▒╪¡┘ä╪⌐ ╪º┘ä╪¬┘ê╪╕┘è┘ü ╪º┘ä╪«╪º╪╡╪⌐ ╪¿┘ç ┘ü┘ê╪▒┘è╪º┘ï
                  </div>
                  {candidatesList.map((c, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onMouseEnter={() => setHoveredCandidate(i)}
                      onMouseLeave={() => setHoveredCandidate(null)}
                      onClick={() => cycleCandidateStage(i)}
                      className="flex items-center gap-4 p-4 bg-muted/20 border border-border rounded-xl hover:border-primary/20 transition-all cursor-pointer group"
                    >
                      <motion.div
                        animate={hoveredCandidate === i ? { scale: 1.1, rotate: -5 } : { scale: 1, rotate: 0 }}
                        className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0"
                      >
                        {c.avatar}
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-foreground">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.role}</div>
                      </div>
                      <div className="hidden sm:flex items-center gap-3">
                        <div className="text-center">
                          <div className="text-lg font-bold text-primary">{c.score}%</div>
                          <div className="text-[10px] text-muted-foreground">╪¬╪╖╪º╪¿┘é AI</div>
                        </div>
                        <motion.span
                          animate={hoveredCandidate === i ? { scale: 1.08 } : { scale: 1 }}
                          className="text-xs font-medium bg-accent/10 text-accent px-3 py-1.5 rounded-lg border border-accent/15 min-w-[70px] text-center"
                        >
                          {c.stage}
                        </motion.span>
                      </div>
                      <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={hoveredCandidate === i ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }}
                        className="text-primary"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </motion.div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "ai" && (
              <motion.div key="ai" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <div className="bg-muted/20 border border-border rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground">╪¬┘é┘è┘è┘à ╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è</div>
                      <div className="text-xs text-muted-foreground">╪¬╪¡┘ä┘è┘ä ╪┤╪º┘à┘ä ┘ä┘ä┘à╪▒╪┤╪¡</div>
                    </div>
                  </div>
                  {/* AI analysis simulation */}
                  <div className="space-y-4">
                    {[
                      { label: "╪º┘ä┘à┘ç╪º╪▒╪º╪¬ ╪º┘ä╪¬┘é┘å┘è╪⌐", value: 92 },
                      { label: "╪º┘ä╪«╪¿╪▒╪⌐ ╪º┘ä╪╣┘à┘ä┘è╪⌐", value: 85 },
                      { label: "╪º┘ä╪¬┘ê╪º┘ü┘é ╪º┘ä╪½┘é╪º┘ü┘è", value: 78 },
                      { label: "┘à┘ç╪º╪▒╪º╪¬ ╪º┘ä╪¬┘ê╪º╪╡┘ä", value: 90 },
                    ].map((skill, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-foreground font-medium">{skill.label}</span>
                          <span className="text-primary font-bold">{skill.value}%</span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full gradient-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${skill.value}%` }}
                            transition={{ delay: 0.2 + i * 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="mt-5 p-4 bg-success/5 border border-success/15 rounded-xl"
                  >
                    <div className="flex items-center gap-2 text-success text-sm font-bold mb-1">
                      <CheckCircle2 className="w-4 h-4" />
                      ╪¬┘ê╪╡┘è╪⌐: ┘à╪▒╪┤╪¡ ┘à┘å╪º╪│╪¿ ╪¼╪»╪º┘ï
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      ┘è╪¬┘à╪¬╪╣ ╪º┘ä┘à╪▒╪┤╪¡ ╪¿┘à┘ç╪º╪▒╪º╪¬ ╪¬┘é┘å┘è╪⌐ ╪╣╪º┘ä┘è╪⌐ ┘ê╪«╪¿╪▒╪⌐ ╪╣┘à┘ä┘è╪⌐ ┘à┘à╪¬╪º╪▓╪⌐ ╪¬╪¬┘ê╪º┘ü┘é ┘à╪╣ ┘à╪¬╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘ê╪╕┘è┘ü╪⌐ ╪¿┘å╪│╪¿╪⌐ 92%.
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {activeTab === "interviews" && (
              <motion.div key="interviews" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <div className="space-y-3">
                  {[
                    { name: "╪ú╪¡┘à╪» ┘à╪¡┘à╪»", time: "10:00 ╪╡", type: "┘ü┘è╪»┘è┘ê", status: "┘é╪º╪»┘à╪⌐", color: "primary" },
                    { name: "╪│╪º╪▒╪⌐ ╪╣┘ä┘è", time: "11:30 ╪╡", type: "╪¬┘é┘å┘è", status: "╪º┘ä╪ó┘å", color: "success" },
                    { name: "╪«╪º┘ä╪» ╪¡╪│┘å", time: "02:00 ┘à", type: "┘å┘ç╪º╪ª┘è╪⌐", status: "┘é╪º╪»┘à╪⌐", color: "warning" },
                  ].map((interview, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.12 }}
                      className="flex items-center gap-4 p-4 bg-muted/20 border border-border rounded-xl hover:border-primary/20 transition-all"
                    >
                      <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                        {interview.name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-sm text-foreground">{interview.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {interview.time} ΓÇö ┘à┘é╪º╪¿┘ä╪⌐ {interview.type}
                        </div>
                      </div>
                      <motion.span
                        animate={interview.status === "╪º┘ä╪ó┘å" ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                          interview.status === "╪º┘ä╪ó┘å"
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-muted/30 text-muted-foreground border-border"
                        }`}
                      >
                        {interview.status === "╪º┘ä╪ó┘å" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-success ml-1.5 animate-pulse" />}
                        {interview.status}
                      </motion.span>
                      {interview.status === "╪º┘ä╪ó┘å" && (
                        <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            size="sm"
                            onClick={() => setIsVideoActive(true)}
                            className="gradient-primary border-0 text-primary-foreground text-xs h-8 rounded-lg gap-1 font-bold animate-pulse"
                          >
                            <Video className="w-3 h-3" />
                            ╪º┘å╪╢┘à
                          </Button>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Interactive Video Call Room Overlay */}
          <AnimatePresence>
            {isVideoActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 bg-background/95 backdrop-blur-md rounded-xl p-6 z-30 flex flex-col justify-between"
              >
                {/* Top Bar */}
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
                    <span className="text-[10px] font-bold text-muted-foreground font-mono tracking-wider">LIVE RECORDING & AI TRANSCRIPTION</span>
                  </div>
                  <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                    ┘à┘é╪º╪¿┘ä╪⌐ ╪¬┘é┘å┘è╪⌐ ΓÇö ╪│╪º╪▒╪⌐ ╪╣┘ä┘è
                  </span>
                </div>

                {/* Video Streams Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 flex-1 items-stretch">
                  {/* Candidate Feed */}
                  <div className="bg-muted/30 border border-border/80 rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-6 min-h-[180px] group">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl font-bold text-primary shadow-inner relative z-10">
                      ╪│
                      <span className="absolute inset-0 rounded-full border border-primary/30 animate-ping opacity-75" />
                    </div>
                    <span className="text-sm font-bold mt-3 text-foreground z-10">╪│╪º╪▒╪⌐ ╪╣┘ä┘è (╪º┘ä┘à╪▒╪┤╪¡)</span>
                    <span className="text-xs text-muted-foreground z-10">╪º┘ä╪¿╪½ ╪º┘ä╪╡┘ê╪¬┘è ┘ê╪º┘ä╪¡╪▒╪º╪▒┘è ┘å╪┤╪╖</span>
                    {/* Live transcription subtitles */}
                    <div className="absolute bottom-3 inset-x-3 bg-background/80 backdrop-blur-md border border-border/60 rounded-lg p-2.5 text-center min-h-[46px] flex items-center justify-center">
                      <p className="text-xs text-foreground font-medium leading-relaxed">
                        {transcriptText || "╪¼╪º╪▒┘è ╪¬╪¡┘à┘è┘ä ╪¿╪½ ╪º┘ä┘à┘é╪º╪¿┘ä╪⌐..."}
                      </p>
                    </div>
                  </div>

                  {/* Recruiter Feed */}
                  <div className="bg-muted/30 border border-border/80 rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-6 min-h-[180px]">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground shadow-inner">
                      HR
                    </div>
                    <span className="text-sm font-bold mt-3 text-foreground">╪º┘ä┘à┘é┘è┘æ┘à (╪ú┘å╪¬)</span>
                    <span className="text-xs text-muted-foreground">╪º┘ä┘â╪º┘à┘è╪▒╪º ┘à╪║┘ä┘é╪⌐</span>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between border-t border-border/80 pt-3">
                  <div className="text-xs text-success font-semibold flex items-center gap-1.5">
                    <Bot className="w-4 h-4 animate-bounce" />
                    ╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è ┘è╪¡┘ä┘ä ┘å╪¿╪▒╪⌐ ╪º┘ä╪╡┘ê╪¬ ┘ê╪º┘ä┘à╪¡╪¬┘ê┘ë ╪º┘ä╪¬┘é┘å┘è...
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setIsVideoActive(false)}
                      className="text-xs h-9 px-4 rounded-lg font-bold shadow-md hover:shadow-lg transition-shadow"
                    >
                      ╪Ñ┘å┘ç╪º╪í ╪º┘ä┘à┘é╪º╪¿┘ä╪⌐
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* CTA under demo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="text-center mt-10"
      >
        <Link to="/auth?mode=signup">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Button size="lg" className="gradient-primary border-0 text-primary-foreground h-13 px-8 text-base font-bold rounded-2xl gap-2">
              <MousePointerClick className="w-4 h-4" />
              ╪¼╪▒┘æ╪¿ ╪º┘ä┘à┘å╪╡╪⌐ ╪º┘ä╪ó┘å ┘à╪¼╪º┘å╪º┘ï
            </Button>
          </motion.div>
        </Link>
      </motion.div>
    </motion.div>
  );
}

/* ΓöÇΓöÇΓöÇ Animated Counter ΓöÇΓöÇΓöÇ */
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (inView) motionVal.set(value);
  }, [inView, value, motionVal]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => {
      setDisplay(value % 1 !== 0 ? v.toFixed(1) : Math.round(v).toString());
    });
    return unsub;
  }, [spring, value]);

  return <span ref={ref}>{display}{suffix}</span>;
}

/* ΓöÇΓöÇΓöÇ Stagger container ΓöÇΓöÇΓöÇ */
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30, filter: "blur(4px)" },
  visible: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1, scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

/* ΓöÇΓöÇΓöÇ 3D Tilt Card ΓöÇΓöÇΓöÇ */
function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), { stiffness: 200, damping: 20 });
  const glareX = useTransform(mouseX, [-0.5, 0.5], [0, 100]);
  const glareY = useTransform(mouseY, [-0.5, 0.5], [0, 100]);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, hsl(var(--primary) / 0.06), transparent 60%)`;

  const handleMouse = useCallback((e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [mouseX, mouseY]);

  const handleLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      className={`relative ${className}`}
    >
      <motion.div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: glareBackground }} />
      {children}
    </motion.div>
  );
}

/* ΓöÇΓöÇΓöÇ Glow Border Card ΓöÇΓöÇΓöÇ */
function GlowCard({ children, className = "", glowColor = "hsl(var(--primary) / 0.15)" }: { children: React.ReactNode; className?: string; glowColor?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  }, [mouseX, mouseY]);

  const background = useMotionTemplate`radial-gradient(350px circle at ${mouseX}px ${mouseY}px, ${glowColor}, transparent 80%)`;

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`group relative rounded-2xl bg-border/40 p-[1px] transition-all duration-300 hover:bg-border/10 hover:shadow-2xl ${className}`}
    >
      {/* Dynamic glowing border layer */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background }}
      />
      {/* Inner card container */}
      <div className="relative rounded-2xl bg-card h-full w-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}

/* ΓöÇΓöÇΓöÇ Parallax Section ΓöÇΓöÇΓöÇ */
function useParallax(offset = 80) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
  return { ref, y };
}

/* ΓöÇΓöÇΓöÇ Parallax Background Blob ΓöÇΓöÇΓöÇ */
function ParallaxBlob({ position, size, color, offset = 80 }: { position: string; size: number; color: "primary" | "accent"; offset?: number }) {
  const { ref, y } = useParallax(offset);
  return (
    <motion.div
      ref={ref}
      style={{ y, width: size, height: size, background: `hsl(var(--${color}))` }}
      className={`absolute ${position} rounded-full opacity-[0.04] blur-[120px] pointer-events-none`}
    />
  );
}

/* ΓöÇΓöÇΓöÇ Typewriter Effect ΓöÇΓöÇΓöÇ */
function TypewriterText({ text, className = "", delay = 0.5 }: { text: string; className?: string; delay?: number }) {
  const words = text.split(" ");
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
          transition={{
            duration: 0.8,
            delay: delay + i * 0.12,
            ease: [0.16, 1, 0.3, 1]
          }}
          className="inline-block ml-3 last:ml-0"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

/* ΓöÇΓöÇΓöÇ Hero Background ΓöÇΓöÇΓöÇ */
function HeroBackground() {
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 0.3], [0, -100]);
  const y2 = useTransform(scrollYProgress, [0, 0.3], [0, 60]);
  const y3 = useTransform(scrollYProgress, [0, 0.3], [0, -40]);
  const opacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  return (
    <motion.div className="absolute inset-0 overflow-hidden" style={{ opacity }}>
      {/* Deep teal orb ΓÇö top right */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 900,
          height: 900,
          top: "-25%",
          right: "-20%",
          y: y1,
          background: "radial-gradient(circle, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.02) 70%, transparent 100%)",
        }}
      />
      {/* Soft emerald orb ΓÇö bottom left */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 700,
          height: 700,
          bottom: "-15%",
          left: "-10%",
          y: y2,
          background: "radial-gradient(circle, hsl(var(--accent) / 0.08), hsl(var(--accent) / 0.01) 60%, transparent 100%)",
        }}
      />
      {/* Grid Pattern overlay */}
      <motion.div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          y: y3,
          backgroundImage: "radial-gradient(hsl(var(--primary) / 0.4) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
    </motion.div>
  );
}

/* ΓöÇΓöÇΓöÇ Section Header ΓöÇΓöÇΓöÇ */
function SectionHeader({ badge, badgeColor = "primary", title, highlight, description }: {
  badge: string; badgeColor?: string; title: string; highlight: string; description: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={staggerContainer}
      className="text-center mb-16"
    >
      <motion.span
        variants={fadeUp}
        className={`inline-flex items-center gap-2 text-${badgeColor} text-sm font-semibold tracking-wide bg-${badgeColor}/8 px-4 py-1.5 rounded-full border border-${badgeColor}/15`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        {badge}
      </motion.span>
      <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold mt-5 leading-tight">
        {title} <span className={`text-${badgeColor}`}>{highlight}</span>
      </motion.h2>
      <motion.p variants={fadeUp} className="text-muted-foreground mt-4 max-w-xl mx-auto text-base leading-relaxed">
        {description}
      </motion.p>
    </motion.div>
  );
}


/* ΓöÇΓöÇΓöÇ Hero Dashboard Mockup ΓöÇΓöÇΓöÇ */
function HeroDashboardMockup() {
  const [activeCandidateIndex, setActiveCandidateIndex] = useState(0);
  const candidates = [
    { name: "╪│╪º╪▒╪⌐ ╪╣╪¿╪» ╪º┘ä╪▒╪¡┘à┘å", role: "┘à╪╖┘ê╪▒ ┘ê╪º╪¼┘ç╪º╪¬ React", score: 96, match: "╪¬╪╖╪º╪¿┘é ┘à┘à╪¬╪º╪▓", skills: ["React", "TailwindCSS", "TypeScript"] },
    { name: "╪ú╪¡┘à╪» ╪╣┘ä┘è ╪º┘ä╪╖┘è╪º╪▒", role: "┘à┘ç┘å╪»╪│ ╪¿┘è╪º┘å╪º╪¬ ╪│╪¡╪º╪¿┘è╪⌐", score: 88, match: "╪¬╪╖╪º╪¿┘é ┘é┘ê┘è", skills: ["Python", "SQL", "Docker"] },
    { name: "╪«╪º┘ä╪» ╪¿┘å ╪º┘ä┘ê┘ä┘è╪»", role: "┘à╪»┘è╪▒ ┘à╪┤╪º╪▒┘è╪╣ ╪¬┘é┘å┘è╪⌐", score: 79, match: "╪¬╪╖╪º╪¿┘é ╪¼┘è╪»", skills: ["Agile", "Jira", "Scrum"] }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCandidateIndex((prev) => (prev + 1) % candidates.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const activeCandidate = candidates[activeCandidateIndex];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card-premium relative overflow-hidden p-6 rounded-3xl border border-white/10 dark:border-white/5 shadow-2xl w-full max-w-md mx-auto"
    >
      {/* Decorative scanner line */}
      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
      
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-border/50 mb-5">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive/60" />
          <div className="w-3 h-3 rounded-full bg-warning/60" />
          <div className="w-3 h-3 rounded-full bg-success/60" />
        </div>
        <div className="text-[11px] font-bold text-muted-foreground bg-muted/40 px-3 py-1 rounded-full flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping" />
          AI ┘à┘Å╪╖╪º╪¿┘é ╪º┘ä╪│┘è╪▒ ╪º┘ä╪░╪º╪¬┘è╪⌐ ┘å╪┤╪╖
        </div>
      </div>

      {/* Main Candidate Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCandidateIndex}
          initial={{ opacity: 0, x: -10, y: 5 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 10, y: -5 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center font-bold text-primary text-base">
                {activeCandidate.name[0]}
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground text-right">{activeCandidate.name}</h4>
                <p className="text-xs text-muted-foreground text-right mt-0.5">{activeCandidate.role}</p>
              </div>
            </div>
            
            {/* Score Ring */}
            <div className="text-left">
              <div className="text-2xl font-black text-primary leading-none">{activeCandidate.score}%</div>
              <div className="text-[9px] font-bold text-muted-foreground mt-1">{activeCandidate.match}</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>╪»╪▒╪¼╪⌐ ╪º┘ä┘à┘ä╪º╪í┘à╪⌐</span>
              <span className="font-bold text-foreground">{activeCandidate.score}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${activeCandidate.score}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
              />
            </div>
          </div>

          {/* Skills Badges */}
          <div className="pt-2">
            <p className="text-[10px] font-bold text-muted-foreground text-right mb-2">╪º┘ä┘à┘ç╪º╪▒╪º╪¬ ╪º┘ä┘à┘â╪¬╪┤┘ü╪⌐ ╪¿╪º┘ä┘Ç AI:</p>
            <div className="flex flex-wrap gap-1.5 justify-end">
              {activeCandidate.skills.map((skill) => (
                <span
                  key={skill}
                  className="text-[10px] font-semibold bg-primary/5 text-primary border border-primary/10 px-2.5 py-1 rounded-md"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Decorative details grid at the bottom */}
      <div className="mt-5 pt-4 border-t border-border/50 grid grid-cols-3 gap-3 text-center text-xs">
        <div className="bg-muted/20 p-2.5 rounded-xl border border-border/30">
          <div className="text-[10px] text-muted-foreground">╪º┘ä┘à╪╖╪º╪¿┘é╪⌐</div>
          <div className="font-bold text-foreground mt-1">╪¬┘ä┘é╪º╪ª┘è╪⌐</div>
        </div>
        <div className="bg-muted/20 p-2.5 rounded-xl border border-border/30">
          <div className="text-[10px] text-muted-foreground">╪│╪▒╪╣╪⌐ ╪º┘ä╪¬╪¡┘ä┘è┘ä</div>
          <div className="font-bold text-success mt-1">1.8s</div>
        </div>
        <div className="bg-muted/20 p-2.5 rounded-xl border border-border/30">
          <div className="text-[10px] text-muted-foreground">╪º┘ä╪ú┘à╪º┘å</div>
          <div className="font-bold text-primary mt-1">E2E ┘å╪┤╪╖</div>
        </div>
      </div>
    </motion.div>
  );
}

/* ΓöÇΓöÇΓöÇ AI Resume Parser Playground ΓöÇΓöÇΓöÇ */
const sampleResumes = [
  {
    id: "dev",
    title: "┘à╪╖┘ê╪▒ ┘ê╪º╪¼┘ç╪º╪¬ (React)",
    name: "╪│┘ä┘è┘à ╪º┘ä┘ê┘ç┘è╪¿┘è",
    experience: "3 ╪│┘å┘ê╪º╪¬",
    skills: ["React", "TypeScript", "TailwindCSS", "Next.js", "REST APIs"],
    score: 94,
    fit: "┘à╪╖╪º╪¿┘é ╪¬┘à╪º┘à╪º┘ï",
    summary: "┘à╪╖┘ê╪▒ ┘ê╪º╪¼┘ç╪º╪¬ ╪░┘ê ╪«╪¿╪▒╪⌐ ┘é┘ê┘è╪⌐ ┘ü┘è ╪¿┘å╪º╪í ╪¬╪╖╪¿┘è┘é╪º╪¬ ╪º┘ä┘ê┘è╪¿ ╪º┘ä╪¬┘ü╪º╪╣┘ä┘è╪⌐ ┘ê╪º┘ä┘à╪¡╪│┘æ┘å╪⌐. ┘è┘à╪¬┘ä┘â ╪«╪¿╪▒╪⌐ ╪╣┘à┘ä┘è╪⌐ ╪¿┘à┘â╪¬╪¿╪º╪¬ ╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä╪¡╪º┘ä╪⌐ ┘ê╪ú╪»╪º╪í ╪¬╪╖╪¿┘è┘é╪º╪¬ React.",
  },
  {
    id: "designer",
    title: "┘à╪╡┘à┘à ┘ê╪º╪¼┘ç╪º╪¬ UX/UI",
    name: "┘à╪▒┘ê╪⌐ ╪º┘ä╪╣╪¿╪»╪º┘ä┘ä┘ç",
    experience: "5 ╪│┘å┘ê╪º╪¬",
    skills: ["Figma", "Design Systems", "Prototyping", "User Research", "Wireframing"],
    score: 89,
    fit: "┘à┘å╪º╪│╪¿ ╪¼╪»╪º┘ï",
    summary: "┘à╪╡┘à┘à╪⌐ ╪¬╪¼╪▒╪¿╪⌐ ┘à╪│╪¬╪«╪»┘à ╪┤╪║┘ê┘ü╪⌐ ╪¿╪¬╪¿╪│┘è╪╖ ╪º┘ä╪╣┘à┘ä┘è╪º╪¬ ╪º┘ä┘à╪╣┘é╪»╪⌐. ┘é╪º╪»╪¬ ╪¿┘å╪¼╪º╪¡ ╪╣┘à┘ä┘è╪⌐ ╪¿┘å╪º╪í ┘ê╪¬╪╖┘ê┘è╪▒ ╪ú┘å╪╕┘à╪⌐ ╪º┘ä╪¬╪╡┘à┘è┘à ┘ä┘Ç 3 ┘à┘å╪¬╪¼╪º╪¬ ╪¬┘é┘å┘è╪⌐.",
  },
  {
    id: "sales",
    title: "┘à╪│╪ñ┘ê┘ä ┘à╪¿┘è╪╣╪º╪¬ ┘ê╪¬╪╖┘ê┘è╪▒ ╪ú╪╣┘à╪º┘ä",
    name: "╪«╪º┘ä╪» ╪¿┘å ╪º┘ä┘ê┘ä┘è╪»",
    experience: "╪│┘å╪¬╪º┘å",
    skills: ["B2B Sales", "Negotiation", "CRM", "Lead Generation", "Public Speaking"],
    score: 76,
    fit: "┘è╪¡╪¬╪º╪¼ ┘à┘é╪º╪¿┘ä╪⌐",
    summary: "╪ú╪«╪╡╪º╪ª┘è ┘à╪¿┘è╪╣╪º╪¬ ┘è╪¬┘à┘è╪▓ ╪¿┘à┘ç╪º╪▒╪º╪¬ ╪¬┘ê╪º╪╡┘ä ╪╣╪º┘ä┘è╪⌐ ┘ê╪Ñ┘é┘å╪º╪╣. ╪¡┘é┘é ┘å┘à┘ê╪º┘ï ╪¿┘å╪│╪¿╪⌐ 120% ┘ü┘è ╪º┘ä╪▒╪¿╪╣ ╪º┘ä╪ú╪«┘è╪▒ ┘ä┘ä╪┤╪▒┘â╪⌐ ╪º┘ä╪│╪º╪¿┘é╪⌐.",
  },
];

function AiResumeParserPlayground() {
  const [selectedCv, setSelectedCv] = useState(sampleResumes[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [showResult, setShowResult] = useState(true);

  const handleSelectCv = (cv: typeof sampleResumes[0]) => {
    if (isScanning) return;
    setIsScanning(true);
    setShowResult(false);
    setTimeout(() => {
      setSelectedCv(cv);
      setIsScanning(false);
      setShowResult(true);
    }, 2000);
  };

  return (
    <div className="bg-muted/15 border border-border/80 rounded-3xl p-6 md:p-10 max-w-5xl mx-auto shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Selector Panel */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground">╪º╪«╪¬╪▒ ╪│┘è╪▒╪⌐ ╪░╪º╪¬┘è╪⌐ ┘ä╪¬╪¼╪▒╪¿╪⌐ ╪º┘ä┘ü╪▒╪▓ ╪º┘ä╪¬┘ä┘é╪º╪ª┘è:</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              ╪º╪«╪¬╪▒ ╪ú╪¡╪» ╪º┘ä┘å┘à╪º╪░╪¼ ╪º┘ä╪¼╪º┘ç╪▓╪⌐ ╪ú╪»┘å╪º┘ç ┘ä╪¬╪▒┘ë ┘â┘è┘ü ┘è┘é┘ê┘à ╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è ╪¿╪¬╪¡┘ä┘è┘ä┘ç╪º ┘ê╪º╪│╪¬╪«╪▒╪º╪¼ ╪º┘ä╪¿┘è╪º┘å╪º╪¬ ╪¿╪»┘é╪⌐ ┘à╪¬┘å╪º┘ç┘è╪⌐ ┘ê┘ü┘è ╪½┘ê╪º┘å┘ì ┘à╪╣╪»┘ê╪»╪⌐.
            </p>
            <div className="space-y-3 pt-2">
              {sampleResumes.map((cv) => (
                <button
                  key={cv.id}
                  onClick={() => handleSelectCv(cv)}
                  disabled={isScanning}
                  className={`w-full text-right p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    selectedCv.id === cv.id
                      ? "bg-primary/8 border-primary text-primary font-bold shadow-sm"
                      : "bg-card border-border hover:border-primary/30 text-foreground hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      selectedCv.id === cv.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {cv.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{cv.name}</div>
                      <div className="text-xs text-muted-foreground font-medium mt-0.5">{cv.title}</div>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${selectedCv.id === cv.id ? "rotate-90 text-primary" : "-rotate-90 text-muted-foreground"}`} />
                </button>
              ))}
            </div>
          </div>
          
          <div className="pt-6 border-t border-border/60 mt-6 lg:mt-0 flex items-center gap-3 text-xs text-muted-foreground bg-muted/20 p-4 rounded-2xl">
            <Sparkles className="w-4 h-4 text-primary shrink-0 animate-pulse" />
            <span>┘è┘à┘â┘å ┘ä┘ä╪¿╪º╪¡╪½┘è┘å ╪╣┘å ╪╣┘à┘ä ╪¬╪¡┘à┘è┘ä ┘à┘ä┘ü PDF ┘à╪¿╪º╪┤╪▒╪⌐ ┘ê╪│┘è╪¬┘ê┘ä┘ë ╪º┘ä┘Ç AI ╪º┘ä╪¿╪º┘é┘è.</span>
          </div>
        </div>

        {/* Scanner and Results Panel */}
        <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-6 relative overflow-hidden flex flex-col justify-center min-h-[380px]">
          
          {/* Laser Scanner animation */}
          {isScanning && (
            <div className="absolute inset-0 z-10 bg-background/40 backdrop-blur-[2px] flex flex-col items-center justify-center">
              <motion.div
                initial={{ top: "0%" }}
                animate={{ top: "100%" }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_15px_4px_rgba(59,130,246,0.6)]"
              />
              <Bot className="w-12 h-12 text-primary animate-bounce mb-3" />
              <span className="text-xs font-bold text-foreground animate-pulse font-mono">AI IS PARSING RESUME...</span>
            </div>
          )}

          {/* Results view */}
          <AnimatePresence mode="wait">
            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Header info */}
                <div className="flex items-start justify-between border-b border-border/60 pb-4">
                  <div>
                    <h4 className="text-lg font-bold text-foreground">{selectedCv.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedCv.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">╪º┘ä╪«╪¿╪▒╪⌐: {selectedCv.experience}</p>
                  </div>
                  <div className="text-left">
                    <div className={`text-3xl font-black ${
                      selectedCv.score >= 90 ? "text-green-600 dark:text-green-400" :
                      selectedCv.score >= 80 ? "text-primary" : "text-amber-600 dark:text-amber-400"
                    }`}>
                      {selectedCv.score}%
                    </div>
                    <div className="text-[10px] text-muted-foreground font-bold mt-1">╪¬╪╖╪º╪¿┘é ╪º┘ä┘à┘ç╪º╪▒╪º╪¬</div>
                  </div>
                </div>

                {/* Summary */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground">╪º┘ä┘à┘ä╪«╪╡ ╪º┘ä┘à╪│╪¬╪«┘ä╪╡ ╪¿╪º┘ä┘Ç AI:</span>
                  <p className="text-xs text-foreground/90 leading-relaxed bg-muted/30 p-3.5 rounded-xl border border-border/40 font-medium">
                    {selectedCv.summary}
                  </p>
                </div>

                {/* Skills Grid */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground">╪º┘ä┘à┘ç╪º╪▒╪º╪¬ ╪º┘ä┘à┘â╪¬╪┤┘ü╪⌐:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCv.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-bold bg-primary/6 text-primary border border-primary/10 px-3 py-1.5 rounded-lg"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Match evaluation status */}
                <div className="flex items-center justify-between pt-4 border-t border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-success live-breathing-indicator" />
                    <span className="text-xs text-muted-foreground font-semibold">╪¡╪º┘ä╪⌐ ╪º┘ä┘à╪╖╪º╪¿┘é╪⌐:</span>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                    selectedCv.fit === "┘à╪╖╪º╪¿┘é ╪¬┘à╪º┘à╪º┘ï" ? "bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-500/20" :
                    selectedCv.fit === "┘à┘å╪º╪│╪¿ ╪¼╪»╪º┘ï" ? "bg-primary/10 text-primary border-primary/20" :
                    "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-500/20"
                  }`}>
                    {selectedCv.fit}
                  </span>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>
    </div>
  );
}

/* ΓöÇΓöÇΓöÇ Branded Career Page Previewer ΓöÇΓöÇΓöÇ */
function BrandedCareerPagePreviewer() {
  const [companyName, setCompanyName] = useState("╪º┘ä╪¬┘é┘å┘è╪⌐ ╪º┘ä╪▒┘é┘à┘è╪⌐");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [accentColor, setAccentColor] = useState("#10b981");

  return (
    <div className="bg-muted/15 border border-border/80 rounded-3xl p-6 md:p-10 max-w-5xl mx-auto shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Editor controls */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground">╪┤╪º┘ç╪» ┘â┘è┘ü ╪│╪¬╪╕┘ç╪▒ ╪╡┘ü╪¡╪⌐ ╪º┘ä╪¬┘ê╪╕┘è┘ü ╪¿┘ç┘ê┘è╪¬┘â:</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              ┘é┘à ╪¿╪¬╪╣╪»┘è┘ä ╪º┘ä╪º╪│┘à ┘ê╪º┘ä╪ú┘ä┘ê╪º┘å ╪ú╪»┘å╪º┘ç ┘ä╪¬╪┤╪º┘ç╪» ┘à╪╣╪º┘è┘å╪⌐ ┘ü┘ê╪▒┘è╪⌐ ┘ä╪╡┘ü╪¡╪⌐ ╪º┘ä╪¬┘ê╪╕┘è┘ü ╪º┘ä┘à┘ç┘å┘è╪⌐ ╪º┘ä╪«╪º╪╡╪⌐ ╪¿╪┤╪▒┘â╪¬┘â (White-Label Careers Page).
            </p>
            
            <div className="space-y-4 pt-2">
              {/* Company Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">╪º╪│┘à ╪º┘ä╪┤╪▒┘â╪⌐:</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                  placeholder="╪ú╪»╪«┘ä ╪º╪│┘à ╪┤╪▒┘â╪¬┘â"
                />
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">╪º┘ä┘ä┘ê┘å ╪º┘ä╪ú╪│╪º╪│┘è:</label>
                  <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-8 h-8 rounded-lg border-0 cursor-pointer overflow-hidden bg-transparent"
                    />
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">{primaryColor}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">╪º┘ä┘ä┘ê┘å ╪º┘ä┘ü╪▒╪╣┘è:</label>
                  <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-8 h-8 rounded-lg border-0 cursor-pointer overflow-hidden bg-transparent"
                    />
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">{accentColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-xs text-muted-foreground flex items-start gap-2.5">
            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <span>┘è┘à┘â┘å┘â ╪▒╪¿╪╖ ╪╡┘ü╪¡╪⌐ ╪º┘ä╪¬┘ê╪╕┘è┘ü ╪¿┘å╪╖╪º┘é ┘à╪«╪╡╪╡ (Custom Domain) ┘à╪½┘ä careers.yourcompany.com.</span>
          </div>
        </div>

        {/* Live Mock View */}
        <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-6 relative overflow-hidden flex flex-col min-h-[380px] shadow-inner">
          {/* Header of Mock Portal */}
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: primaryColor }}>
                {companyName[0] || "╪┤"}
              </div>
              <span className="text-xs font-bold text-foreground">{companyName || "╪º╪│┘à ╪┤╪▒┘â╪¬┘â"}</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-semibold">╪¿┘ê╪º╪¿╪⌐ ╪º┘ä╪¬┘ê╪╕┘è┘ü</span>
          </div>

          {/* Job Card Hero Preview */}
          <div className="rounded-xl p-5 mb-5 flex flex-col justify-center items-center text-center relative overflow-hidden" style={{ backgroundColor: `${primaryColor}0c`, border: `1px solid ${primaryColor}22` }}>
            <h4 className="text-sm font-black text-foreground mb-1">╪º┘å╪╢┘à ╪Ñ┘ä┘ë ┘ü╪▒┘è┘é {companyName}</h4>
            <p className="text-[10px] text-muted-foreground">╪º╪│╪¬┘â╪┤┘ü ╪º┘ä┘ü╪▒╪╡ ╪º┘ä┘ê╪╕┘è┘ü┘è╪⌐ ╪º┘ä┘à╪¬╪º╪¡╪⌐ ┘ê╪º╪¿╪»╪ú ┘à╪│┘è╪▒╪¬┘â ┘à╪╣┘å╪º</p>
          </div>

          {/* Job Card */}
          <div className="border border-border/80 rounded-xl p-4 bg-muted/10 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h5 className="text-xs font-bold text-foreground">╪ú╪«╪╡╪º╪ª┘è ╪¬╪╖┘ê┘è╪▒ ╪¿╪▒┘à╪¼┘è╪º╪¬</h5>
                <p className="text-[10px] text-muted-foreground mt-0.5">┘é╪│┘à ┘ç┘å╪»╪│╪⌐ ╪º┘ä╪¿╪▒┘à╪¼┘è╪º╪¬ ΓÇó ╪º┘ä╪▒┘è╪º╪╢</p>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border" style={{ color: accentColor, backgroundColor: `${accentColor}11`, borderColor: `${accentColor}33` }}>
                ╪»┘ê╪º┘à ┘â╪º┘à┘ä
              </span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <span className="text-[9px] text-muted-foreground">╪«╪¿╪▒╪⌐ 3+ ╪│┘å┘ê╪º╪¬</span>
              <button className="text-[10px] font-bold px-4 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90" style={{ backgroundColor: primaryColor }}>
                ┘é╪»┘æ┘à ╪º┘ä╪ó┘å
              </button>
            </div>
          </div>

          {/* Footer watermark */}
          <div className="mt-auto pt-4 border-t border-border/40 flex justify-between items-center text-[9px] text-muted-foreground">
            <span>╪¼┘à┘è╪╣ ╪º┘ä╪¡┘é┘ê┘é ┘à╪¡┘ü┘ê╪╕╪⌐ ┬⌐ {companyName}</span>
            <span className="font-mono">Powered by Tawzeef-X</span>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ΓöÇΓöÇΓöÇ Recruitment ROI Calculator ΓöÇΓöÇΓöÇ */
function RecruitmentRoiCalculator() {
  const [hiresCount, setHiresCount] = useState(5);
  const [resumesPerJob, setResumesPerJob] = useState(100);
  const [hourlyRate, setHourlyRate] = useState(100);

  // Calculations
  const totalResumes = hiresCount * resumesPerJob;
  // Manual hours spent: assuming 5 mins (0.08 hours) per CV manually
  const manualHours = Math.round(totalResumes * 0.08);
  // Time saved with AI (80%)
  const hoursSaved = Math.round(manualHours * 0.8);
  // Money saved monthly: hours saved * recruiter hourly rate
  const moneySaved = hoursSaved * hourlyRate;

  return (
    <div className="bg-muted/15 border border-border/80 rounded-3xl p-6 md:p-10 max-w-5xl mx-auto shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Sliders Input Panel */}
        <div className="lg:col-span-5 space-y-6">
          <h3 className="text-xl font-bold text-foreground">╪º╪¡╪│╪¿ ╪º┘ä╪╣╪º╪ª╪» ┘ê╪º┘ä╪¬┘ê┘ü┘è╪▒ ┘ä╪┤╪▒┘â╪¬┘â:</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            ┘é┘à ╪¿╪¬╪¡╪▒┘è┘â ╪º┘ä┘à╪ñ╪┤╪▒╪º╪¬ ╪ú╪»┘å╪º┘ç ╪¿┘å╪º╪í┘ï ╪╣┘ä┘ë ╪¡╪¼┘à ╪º┘ä╪¬┘ê╪╕┘è┘ü ╪º┘ä╪¡╪º┘ä┘è ┘ä╪»┘è┘â ┘ä╪¡╪│╪º╪¿ ╪º┘ä┘ê┘é╪¬ ┘ê╪º┘ä╪ú┘à┘ê╪º┘ä ╪º┘ä╪¬┘è ╪│╪¬┘ê┘ü╪▒┘ç╪º ╪º┘ä┘à┘å╪╡╪⌐ ┘ä┘â ╪┤┘ç╪▒┘è╪º┘ï.
          </p>

          <div className="space-y-5 pt-2">
            {/* Hires per month */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-foreground">
                <span>╪º┘ä╪¬┘ê╪╕┘è┘ü╪º╪¬ ╪º┘ä╪┤┘ç╪▒┘è╪⌐:</span>
                <span className="text-primary">{hiresCount} ┘à┘ê╪╕┘ü┘è┘å</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={hiresCount}
                onChange={(e) => setHiresCount(Number(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Resumes per job */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-foreground">
                <span>╪º┘ä╪│┘è╪▒ ╪º┘ä╪░╪º╪¬┘è╪⌐ ┘ä┘â┘ä ┘ê╪╕┘è┘ü╪⌐:</span>
                <span className="text-primary">{resumesPerJob} ╪│┘è╪▒╪⌐</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={resumesPerJob}
                onChange={(e) => setResumesPerJob(Number(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Recruiter Hourly Rate */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-foreground">
                <span>╪¬┘â┘ä┘ü╪⌐ ╪│╪º╪╣╪⌐ ╪º┘ä╪¬┘ê╪╕┘è┘ü (╪▒┘è╪º┘ä):</span>
                <span className="text-primary">{hourlyRate} ╪▒.╪│ / ╪│╪º╪╣╪⌐</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="10"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-6 md:p-8 flex flex-col justify-between">
          <div className="space-y-6">
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">┘à╪ñ╪┤╪▒╪º╪¬ ╪º┘ä╪¬┘ê┘ü┘è╪▒ ╪º┘ä┘à╪¬┘ê┘é╪╣╪⌐:</h4>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Hours Saved */}
              <div className="bg-muted/20 border border-border/40 p-4 rounded-2xl text-right">
                <div className="text-xs text-muted-foreground">╪│╪º╪╣╪º╪¬ ╪º┘ä╪╣┘à┘ä ╪º┘ä┘à┘ê┘ü╪▒╪⌐</div>
                <div className="text-3xl font-black text-primary mt-1">{hoursSaved} <span className="text-xs font-bold">╪│╪º╪╣╪⌐</span></div>
                <p className="text-[10px] text-muted-foreground mt-1">╪¬┘ê┘ü┘è╪▒ 80% ┘à┘å ┘ê┘é╪¬ ╪º┘ä┘ü╪▒╪▓</p>
              </div>

              {/* Hiring Speed */}
              <div className="bg-muted/20 border border-border/40 p-4 rounded-2xl text-right">
                <div className="text-xs text-muted-foreground">╪│╪▒╪╣╪⌐ ╪Ñ╪¬┘à╪º┘à ╪º┘ä╪¬┘ê╪╕┘è┘ü</div>
                <div className="text-3xl font-black text-success mt-1">5x <span className="text-xs font-bold">╪ú╪│╪▒╪╣</span></div>
                <p className="text-[10px] text-muted-foreground mt-1">┘ü┘ä╪¬╪▒╪⌐ ┘ü┘ê╪▒┘è╪⌐ ┘ê╪¬╪╡┘å┘è┘ü ╪░┘â┘è</p>
              </div>
            </div>

            {/* Total Money Saved Monthly */}
            <div className="bg-primary/5 border border-primary/10 p-5 rounded-2xl text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-primary/5 blur-xl pointer-events-none" />
              <div className="text-xs text-muted-foreground font-bold">╪º┘ä╪¬┘ê┘ü┘è╪▒ ╪º┘ä┘à╪º┘ä┘è ╪º┘ä╪┤┘ç╪▒┘è ╪º┘ä╪¬┘é╪▒┘è╪¿┘è</div>
              <div className="text-4xl md:text-5xl font-black text-gradient mt-2 tabular-nums">
                {moneySaved.toLocaleString()} <span className="text-sm font-black text-foreground">╪▒┘è╪º┘ä ╪│╪╣┘ê╪»┘è</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                ╪¬┘é┘ä┘è┘ä ╪º┘ä╪¬┘â╪º┘ä┘è┘ü ╪º┘ä╪Ñ╪»╪º╪▒┘è╪⌐ ╪╣╪¿╪▒ ╪ú╪¬┘à╪¬╪⌐ ╪º┘ä┘ü╪▒╪▓ ┘ê╪º┘ä┘à┘é╪º╪¿┘ä╪º╪¬ ┘ê╪¬┘ê╪½┘è┘é ╪º┘ä┘à╪│╪¬┘å╪»╪º╪¬ ╪▒┘é┘à┘è╪º┘ï.
              </p>
            </div>
          </div>

          <div className="text-[10px] text-center text-muted-foreground mt-6 pt-4 border-t border-border/40">
            * ╪º┘ä╪¡╪│╪º╪¿╪º╪¬ ╪¬┘é╪▒┘è╪¿┘è╪⌐ ╪¿┘å╪º╪í┘ï ╪╣┘ä┘ë ┘à╪¬┘ê╪│╪╖ ╪Ñ┘å╪¬╪º╪¼┘è╪⌐ ┘à┘ê╪╕┘ü┘è ╪º┘ä┘à┘ê╪º╪▒╪» ╪º┘ä╪¿╪┤╪▒┘è╪⌐ ┘ê┘à╪╣╪»┘ä ╪»┘é╪⌐ ╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è ╪¿╪º┘ä┘à┘å╪╡╪⌐.
          </div>
        </div>

      </div>
    </div>
  );
}

/* ΓöÇΓöÇΓöÇ Interactive FAQ Accordion ΓöÇΓöÇΓöÇ */
const faqItems = [
  {
    q: "┘â┘è┘ü ┘è┘é┘ê┘à ╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è ╪¿┘ü┘ä╪¬╪▒╪⌐ ╪º┘ä╪│┘è╪▒ ╪º┘ä╪░╪º╪¬┘è╪⌐ ┘ê╪¬╪╡┘å┘è┘ü┘ç╪º╪ƒ",
    a: "┘è┘é┘ê┘à ┘à╪¡╪▒┘â ╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è ╪¿╪¬╪¡┘ä┘è┘ä ╪º┘ä┘å╪╡┘ê╪╡ ┘ê╪º╪│╪¬╪«╪▒╪º╪¼ ╪º┘ä┘à┘ç╪º╪▒╪º╪¬ ┘ê╪º┘ä╪«╪¿╪▒╪º╪¬ ╪¿╪»┘é╪⌐╪î ╪½┘à ┘è╪╖╪º╪¿┘é┘ç╪º ╪¿┘à╪¬╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘ê╪╕┘è┘ü╪⌐ ┘ê┘å┘é╪º╪╖ ╪º┘ä╪¬┘é┘è┘è┘à ╪º┘ä┘à╪¡╪»╪»╪⌐ ┘ä┘è╪╣╪╖┘è┘â ╪»╪▒╪¼╪⌐ ╪¬┘ê╪º┘ü┘é ╪¬┘ü╪╡┘è┘ä┘è╪⌐ ┘à╪╣ ┘à┘ä╪«╪╡ ╪¬┘å┘ü┘è╪░┘è ┘ê┘å┘é╪º╪╖ ╪º┘ä┘é┘ê╪⌐ ┘ê╪º┘ä╪╢╪╣┘ü ┘ä┘â┘ä ┘à╪▒╪┤╪¡.",
  },
  {
    q: "┘ç┘ä ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä┘à╪▒╪┤╪¡┘è┘å ┘ê╪º┘ä╪┤╪▒┘â╪º╪¬ ╪ó┘à┘å╪⌐ ┘ê┘à╪¡┘à┘è╪⌐╪ƒ",
    a: "┘å╪╣┘à╪î ┘å╪╖╪¿┘é ┘å╪╕╪º┘à ╪¡┘à╪º┘è╪⌐ ╪╡╪º╪▒┘à ╪╣┘ä┘ë ┘à╪│╪¬┘ê┘ë ┘é╪º╪╣╪»╪⌐ ╪º┘ä╪¿┘è╪º┘å╪º╪¬ (Row-Level Security) ┘à╪╣ ╪¬╪┤┘ü┘è╪▒ ╪¬╪º┘à ┘ä┘ä┘à┘ä┘ü╪º╪¬ ╪º┘ä╪¡╪│╪º╪│╪⌐ ┘ê╪º┘ä╪│┘è╪▒ ╪º┘ä╪░╪º╪¬┘è╪⌐ ┘ü┘è ┘ê╪¡╪»╪º╪¬ ╪¬╪«╪▓┘è┘å ┘à╪╣╪▓┘ê┘ä╪⌐ ┘ä┘â┘ä ╪┤╪▒┘â╪⌐ ┘ä╪╢┘à╪º┘å ╪│╪▒┘è╪⌐ ╪º┘ä╪¿┘è╪º┘å╪º╪¬ ╪¿╪º┘ä┘â╪º┘à┘ä.",
  },
  {
    q: "┘ç┘ä ┘è┘à┘â┘å┘å┘è ╪¬╪«╪╡┘è╪╡ ╪º┘ä┘ç┘ê┘è╪⌐ ┘ê┘à╪▒╪º╪¡┘ä ╪º┘ä╪¬┘ê╪╕┘è┘ü ╪º┘ä╪«╪º╪╡╪⌐ ╪¿╪╡┘ü╪¡╪⌐ ╪┤╪▒┘â╪¬┘è╪ƒ",
    a: "╪¿╪º┘ä╪¬╪ú┘â┘è╪»! ┘è┘à┘â┘å┘â ╪▒┘ü╪╣ ╪┤╪╣╪º╪▒ ╪┤╪▒┘â╪¬┘â╪î ╪¬╪¡╪»┘è╪» ╪ú┘ä┘ê╪º┘å ╪º┘ä┘ç┘ê┘è╪⌐ ╪º┘ä╪«╪º╪╡╪⌐ ╪¿┘â╪î ┘ê╪¬╪╣╪»┘è┘ä ┘à╪▒╪º╪¡┘ä ╪º┘ä╪¬┘ê╪╕┘è┘ü (┘à╪½┘ä: ╪¬┘é╪»┘è┘à ╪º┘ä╪╖┘ä╪¿╪î ╪º┘ä╪¬┘é┘è┘è┘à ╪º┘ä╪¬┘é┘å┘è╪î ┘à┘é╪º╪¿┘ä╪⌐ ╪º┘ä┘ü┘è╪»┘è┘ê╪î ╪º┘ä╪╣╪▒╪╢ ╪º┘ä┘ê╪╕┘è┘ü┘è) ┘ä╪¬┘å╪º╪│╪¿ ┘ç┘è┘â┘ä ╪º┘ä╪¬┘ê╪╕┘è┘ü ╪º┘ä╪«╪º╪╡ ╪¿┘â ╪¬┘à╪º┘à╪º┘ï.",
  },
  {
    q: "┘ç┘ä ╪¬╪»╪╣┘à ╪º┘ä┘à┘å╪╡╪⌐ ╪▒╪¿╪╖ ╪º┘ä╪¿┘è╪º┘å╪º╪¬ ┘à╪╣ ╪º┘ä╪ú┘å╪╕┘à╪⌐ ╪º┘ä╪«╪º╪▒╪¼┘è╪⌐╪ƒ",
    a: "┘å╪╣┘à╪î ╪¬╪»╪╣┘à ╪º┘ä┘à┘å╪╡╪⌐ ╪º╪│╪¬╪«╪»╪º┘à ╪º┘ä┘ê┘è╪¿ ┘ç┘ê┘â╪│ (Webhooks) ┘ä╪Ñ╪▒╪│╪º┘ä ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘ü┘ê╪▒┘è╪⌐ ┘ä╪ú┘å╪╕┘à╪¬┘â ╪º┘ä╪«╪º╪▒╪¼┘è╪⌐ ┘ê╪¬┘â╪º┘à┘ä╪º╪¬ ┘à┘à╪¬╪º╪▓╪⌐ ┘à╪╣ Zapier ┘ê n8n ┘ä╪ú╪¬┘à╪¬╪⌐ ╪│┘è╪▒ ╪º┘ä╪╣┘à┘ä ╪¿╪º┘ä┘â╪º┘à┘ä.",
  },
  {
    q: "┘ç┘ä ┘ç┘å╪º┘â ┘ü╪¬╪▒╪⌐ ╪¬╪¼╪▒┘è╪¿┘è╪⌐ ┘à╪¼╪º┘å┘è╪⌐ ┘ä┘ä┘à┘å╪╡╪⌐╪ƒ",
    a: "┘å╪╣┘à╪î ┘è┘à┘â┘å┘â ╪º┘ä╪¿╪»╪í ┘à╪¼╪º┘å╪º┘ï ┘ê╪º┘ä╪¡╪╡┘ê┘ä ╪╣┘ä┘ë ╪╡┘ä╪º╪¡┘è╪⌐ ┘â╪º┘à┘ä╪⌐ ┘ä╪¬╪¼╪▒╪¿╪⌐ ╪º┘ä┘ü╪▒╪▓ ╪º┘ä╪░┘â┘è ┘ê┘å╪┤╪▒ ╪º┘ä┘ê╪╕╪º╪ª┘ü ┘ê╪º╪│╪¬┘â╪┤╪º┘ü ┘ä┘ê╪¡╪⌐ ╪º┘ä╪¬╪¡┘â┘à ╪»┘ê┘å ╪º┘ä╪¡╪º╪¼╪⌐ ┘ä╪Ñ╪»╪«╪º┘ä ╪ú┘è ╪¿┘è╪º┘å╪º╪¬ ╪»┘ü╪╣.",
  },
];

function InteractiveFaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleIndex = (idx: number) => {
    setOpenIndex(prev => (prev === idx ? null : idx));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-3.5">
      {faqItems.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={idx}
            className="bg-card border border-border/80 rounded-2xl overflow-hidden transition-all duration-300 hover:border-primary/20"
          >
            <button
              onClick={() => toggleIndex(idx)}
              className="w-full text-right p-5 flex items-center justify-between gap-4 focus:outline-none"
            >
              <span className="text-sm font-bold text-foreground leading-relaxed">{item.q}</span>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="text-muted-foreground shrink-0"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="px-5 pb-5 pt-1 text-xs text-muted-foreground leading-[1.8] border-t border-border/40 font-medium">
                    {item.a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const heroRef = useRef<HTMLElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  const [stats, setStats] = useState(defaultStats);
  useEffect(() => {
    (async () => {
      try {
        const [jobsRes, candidatesRes] = await Promise.all([
          supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "┘å╪┤╪╖╪⌐"),
          supabase.from("candidates").select("id", { count: "exact", head: true }),
        ]);
        setStats([
          { value: 50, suffix: "+", label: "╪»┘ê┘ä╪⌐ ┘à╪»╪╣┘ê┘à╪⌐", icon: Globe },
          { value: jobsRes.count || 0, suffix: "", label: "┘ê╪╕┘è┘ü╪⌐ ┘å╪┤╪╖╪⌐", icon: Briefcase },
          { value: candidatesRes.count || 0, suffix: "", label: "┘à╪▒╪┤╪¡ ┘à╪│╪¼┘ä", icon: Users },
          { value: 99.9, suffix: "%", label: "┘ê┘é╪¬ ╪º┘ä╪¬╪┤╪║┘è┘ä", icon: Zap },
        ]);
      } catch {}
    })();
  }, []);

  const [currentPage, setCurrentPage] = useState(0);
  const testimonialsPerPage = 3;
  const totalPages = Math.ceil(testimonials.length / testimonialsPerPage);

  useEffect(() => {
    const interval = setInterval(() => setCurrentPage((p) => (p + 1) % totalPages), 6000);
    return () => clearInterval(interval);
  }, [totalPages]);

  const currentTestimonials = testimonials.slice(
    currentPage * testimonialsPerPage,
    (currentPage + 1) * testimonialsPerPage
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Navbar */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 inset-x-0 z-50 pt-5"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="bg-background/40 backdrop-blur-2xl border border-white/10 dark:border-white/5 rounded-full px-6 h-16 flex items-center justify-between shadow-[0_8px_32px_0_rgba(0,0,0,0.03)] hover:border-primary/20 transition-all duration-300">
            <motion.div className="flex items-center gap-2.5" whileHover={{ scale: 1.01 }}>
              <img src={tawzeefLogo} alt="Tawzeef-X" className="w-7 h-7 object-contain" />
              <span className="text-base font-black text-foreground">
                Tawzeef-<span className="text-primary">X</span>
              </span>
            </motion.div>
            <div className="hidden md:flex items-center gap-7 text-[13px] text-muted-foreground font-bold">
              {[
                { href: "#features", label: "╪º┘ä┘à┘à┘è╪▓╪º╪¬" },
                { href: "#how-it-works", label: "┘â┘è┘ü ╪¬╪╣┘à┘ä" },
                { href: "#testimonials", label: "╪ó╪▒╪º╪í ╪º┘ä╪╣┘à┘ä╪º╪í" },
              ].map(link => (
                <a key={link.href} href={link.href} className="relative hover:text-foreground transition-colors group py-1">
                  {link.label}
                  <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-primary rounded-full group-hover:w-full transition-all duration-300" />
                </a>
              ))}
              <Link to="/portal" className="hover:text-foreground transition-colors">╪¿┘ê╪º╪¿╪⌐ ╪º┘ä┘à╪▒╪┤╪¡</Link>
              <Link to="/install" className="hover:text-foreground transition-colors">╪¬╪½╪¿┘è╪¬ ╪º┘ä╪¬╪╖╪¿┘è┘é</Link>
            </div>
            <div className="hidden md:flex items-center gap-2">
              {/* Desktop Theme Switcher */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-9 h-9 rounded-full border border-border/70 bg-background/45 backdrop-blur-md hover:bg-muted transition-colors flex items-center justify-center text-foreground mr-1"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-4 h-4 text-warning" /> : <Moon className="w-4 h-4" />}
              </button>

              <Link to="/auth?mode=login">
                <Button variant="ghost" size="sm" className="text-xs font-bold h-9 px-4 rounded-full hover:bg-muted/40 text-muted-foreground hover:text-foreground">╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä</Button>
              </Link>
              <Link to="/auth?mode=signup">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button size="sm" className="text-xs font-bold h-9 px-5 gradient-primary border-0 text-primary-foreground rounded-full shadow-sm hover:shadow-md transition-all duration-300">╪º╪¿╪»╪ú ┘à╪¼╪º┘å╪º┘ï</Button>
                </motion.div>
              </Link>
            </div>
            
            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex md:hidden items-center justify-center w-9 h-9 rounded-full border border-border/70 bg-background/45 backdrop-blur-md hover:bg-muted transition-colors"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4 text-foreground" /> : <Menu className="w-4 h-4 text-foreground" />}
            </button>
          </div>
        </div>
      </motion.nav>
 
      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-24 inset-x-4 z-40 md:hidden"
          >
            <div className="bg-background/90 backdrop-blur-2xl border border-border/80 rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
              <div className="flex flex-col gap-4 text-right">
                {[
                  { href: "#features", label: "╪º┘ä┘à┘à┘è╪▓╪º╪¬" },
                  { href: "#how-it-works", label: "┘â┘è┘ü ╪¬╪╣┘à┘ä" },
                  { href: "#testimonials", label: "╪ó╪▒╪º╪í ╪º┘ä╪╣┘à┘ä╪º╪í" },
                ].map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-foreground hover:text-primary text-base font-bold transition-colors py-2.5 border-b border-border/40 last:border-b-0"
                  >
                    {link.label}
                  </a>
                ))}
                <Link to="/portal" onClick={() => setIsMobileMenuOpen(false)} className="text-foreground hover:text-primary text-base font-bold transition-colors py-2.5 border-b border-border/40">╪¿┘ê╪º╪¿╪⌐ ╪º┘ä┘à╪▒╪┤╪¡</Link>
                <Link to="/install" onClick={() => setIsMobileMenuOpen(false)} className="text-foreground hover:text-primary text-base font-bold transition-colors py-2.5 border-b border-border/40">╪¬╪½╪¿┘è╪¬ ╪º┘ä╪¬╪╖╪¿┘è┘é</Link>
                {/* Mobile Theme Toggle */}
                <button
                  onClick={() => {
                    setTheme(theme === "dark" ? "light" : "dark");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between text-foreground hover:text-primary text-base font-bold transition-colors py-2.5"
                >
                  <span>{theme === "dark" ? "╪º┘ä┘ê╪╢╪╣ ╪º┘ä┘à╪╢┘è╪í" : "╪º┘ä┘ê╪╢╪╣ ╪º┘ä╪»╪º┘â┘å"}</span>
                  {theme === "dark" ? <Sun className="w-4 h-4 text-warning" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex flex-col gap-3 pt-3 border-t border-border">
                <Link to="/auth?mode=login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full text-sm h-11 rounded-xl">╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä</Button>
                </Link>
                <Link to="/auth?mode=signup" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full text-sm h-11 gradient-primary border-0 text-primary-foreground rounded-xl shadow-md">╪º╪¿╪»╪ú ┘à╪¼╪º┘å╪º┘ï</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <section ref={heroRef} className="relative pt-32 lg:pt-40 overflow-hidden min-h-[95vh] flex items-center bg-gradient-to-b from-background via-background/95 to-background/50">
        <HeroBackground />
        
        {/* Glowing abstract background lights */}
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: "8s" }} />

        <motion.div style={{ opacity: heroOpacity, y: heroY, scale: heroScale }} className="relative container mx-auto px-6 py-12 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Right Column: Copy text & CTAs */}
            <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-right order-1 lg:order-2">
              {/* Premium Badge */}
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 text-xs font-bold mb-8 border border-primary/20 bg-primary/8 text-primary shadow-sm"
              >
                <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                  <Sparkles className="w-3.5 h-3.5" />
                </motion.div>
                ┘à┘å╪╡╪⌐ ╪¬┘ê╪╕┘è┘ü ┘à╪¬┘â╪º┘à┘ä╪⌐ ┘à╪»╪╣┘ê┘à╪⌐ ╪¿╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è
                <span className="w-1.5 h-1.5 rounded-full bg-success live-breathing-indicator" />
              </motion.div>

              {/* Title */}
              <div className="space-y-4">
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="text-4xl md:text-6xl lg:text-7xl font-black leading-[1.25] text-foreground tracking-normal"
                >
                  ┘ê╪╕┘æ┘ü ╪ú┘ü╪╢┘ä ╪º┘ä┘â┘ü╪º╪í╪º╪¬
                </motion.h1>
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="text-4xl md:text-6xl lg:text-7xl font-black leading-[1.25] tracking-normal"
                >
                  <span className="text-gradient">╪¿╪░┘â╪º╪í ┘ê╪│╪▒╪╣╪⌐ ┘ü╪º╪ª┘é╪⌐</span>
                </motion.h1>
              </div>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="text-base md:text-lg text-muted-foreground mt-6 max-w-xl leading-relaxed font-medium"
              >
                ┘ü┘ä╪¬╪▒╪⌐ ╪░┘â┘è╪⌐ ┘ê┘à╪ñ╪¬┘à╪¬╪⌐ ┘ä┘ä╪│┘è╪▒ ╪º┘ä╪░╪º╪¬┘è╪⌐ ╪¿╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è╪î ┘à┘é╪º╪¿┘ä╪º╪¬ ┘ü┘è╪»┘è┘ê ┘à╪»┘à╪¼╪⌐ ╪¿┘å╪│╪« ╪¬┘ä┘é╪º╪ª┘è╪î ┘ê╪Ñ╪»╪º╪▒╪⌐ ┘â╪º┘à┘ä╪⌐ ┘ä┘ä╪╣╪▒┘ê╪╢ ╪º┘ä┘ê╪╕┘è┘ü┘è╪⌐ ┘à╪╣ ╪¬╪┤┘ü┘è╪▒ ╪¬╪º┘à ┘ä┘ä╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪¡╪│╪º╪│╪⌐.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="flex flex-col sm:flex-row gap-3 mt-10 w-full sm:w-auto"
              >
                <Link to="/auth?mode=signup" className="w-full sm:w-auto">
                  <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
                    <Button size="lg" className="border-0 text-primary-foreground px-8 h-14 text-sm font-bold w-full rounded-2xl relative overflow-hidden group bg-gradient-to-r from-primary via-primary/95 to-accent hover:from-primary/95 hover:to-accent/95 shadow-md shadow-primary/10">
                      <motion.div
                        className="absolute inset-0"
                        style={{ background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.1), transparent)" }}
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                      />
                      <span className="relative flex items-center justify-center gap-2">
                        ╪º╪¿╪»╪ú ╪º┘ä╪ó┘å ┘à╪¼╪º┘å╪º┘ï
                        <ArrowLeft className="w-4 h-4" />
                      </span>
                    </Button>
                  </motion.div>
                </Link>
                <Link to="/careers" className="w-full sm:w-auto">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button variant="outline" size="lg" className="h-14 text-sm px-7 w-full gap-2 rounded-2xl border border-border/80 hover:bg-muted/50 backdrop-blur-md">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      ╪¬╪╡┘ü╪¡ ╪¿┘ê╪º╪¿╪⌐ ╪º┘ä┘ê╪╕╪º╪ª┘ü
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>

              {/* Social proof */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="flex flex-col sm:flex-row items-center gap-4 mt-12"
              >
                <div className="flex -space-x-2 space-x-reverse">
                  {["╪ú", "┘à", "╪│", "╪«", "┘å"].map((l, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7 + i * 0.05, type: "spring", stiffness: 200 }}
                      className="w-8 h-8 rounded-full gradient-primary border-2 border-background flex items-center justify-center text-[10px] text-primary-foreground font-bold shadow-sm"
                    >
                      {l}
                    </motion.div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-warning text-warning" />
                    ))}
                  </div>
                  <span className="text-foreground text-xs font-bold">4.9/5</span>
                  <span className="text-muted-foreground text-xs font-medium">┘à┘é┘è┘æ┘à ┘à┘å ╪ú╪╡╪¡╪º╪¿ ╪º┘ä╪╣┘à┘ä</span>
                </div>
              </motion.div>
            </div>

            {/* Left Column: Premium Interactive AI Mockup */}
            <div className="lg:col-span-5 flex justify-center order-2 lg:order-1 w-full">
              <HeroDashboardMockup />
            </div>

          </div>
        </motion.div>
      </section>

      {/* AI Resume Parser Playground Section */}
      <section className="py-24 bg-background relative overflow-hidden">
        <div className="container mx-auto px-6">
          <SectionHeader
            badge="╪¬╪¼╪▒╪¿╪⌐ ╪¡┘è╪⌐"
            badgeColor="primary"
            title="╪¼╪▒┘æ╪¿ ╪º┘ä┘ü╪▒╪▓ ╪¿╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è"
            highlight="┘ü┘è ╪½┘ê╪º┘å┘ì"
            description="╪┤╪º┘ç╪» ┘â┘è┘ü ┘è┘é┘ê┘à ╪º┘ä┘å╪╕╪º┘à ╪¿╪¬╪¡┘ä┘è┘ä ╪º┘ä╪│┘è╪▒ ╪º┘ä╪░╪º╪¬┘è╪⌐ ┘ê┘à╪╖╪º╪¿┘é╪¬┘ç╪º ┘ä┘ä┘à╪¬╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘ê╪╕┘è┘ü┘è╪⌐ ┘ü┘ê╪▒╪º┘ï"
          />
          <AiResumeParserPlayground />
        </div>
      </section>

      {/* Stats with parallax */}
      <section className="py-20 border-y border-border relative overflow-hidden bg-muted/10 backdrop-blur-sm">
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--primary) / 0.4) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Soft theme-aware decorative glow orbs */}
        <div className="absolute -left-1/4 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
        <div className="absolute -right-1/4 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

        <div className="container mx-auto px-6 relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, i) => (
              <motion.div key={i} variants={fadeUp} className="text-center group">
                <motion.div
                  whileHover={{ scale: 1.12, rotate: -3, backgroundColor: "hsl(var(--primary) / 0.12)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-4 border border-primary/10 transition-colors duration-200"
                >
                  <stat.icon className="w-7 h-7 text-primary" />
                </motion.div>
                <div className="text-4xl md:text-5xl font-black text-foreground tabular-nums tracking-tight">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-muted-foreground text-sm mt-2 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="features" className="py-28 container mx-auto px-6 relative">
        {/* Parallax background blobs */}
        <ParallaxBlob position="top-20 right-0" size={500} color="accent" />
        <ParallaxBlob position="bottom-20 left-0" size={400} color="primary" offset={-60} />
        <SectionHeader
          badge="╪º┘ä┘à┘à┘è╪▓╪º╪¬"
          title="┘â┘ä ┘à╪º ╪¬╪¡╪¬╪º╪¼┘ç ┘ü┘è"
          highlight="┘à┘å╪╡╪⌐ ┘ê╪º╪¡╪»╪⌐"
          description="╪ú╪»┘ê╪º╪¬ ╪º╪¡╪¬╪▒╪º┘ü┘è╪⌐ ┘à╪¬┘â╪º┘à┘ä╪⌐ ┘ä╪Ñ╪»╪º╪▒╪⌐ ╪»┘ê╪▒╪⌐ ╪º┘ä╪¬┘ê╪╕┘è┘ü ╪¿╪º┘ä┘â╪º┘à┘ä ΓÇö ┘à┘å ┘å╪┤╪▒ ╪º┘ä┘ê╪╕┘è┘ü╪⌐ ╪¡╪¬┘ë ╪º┘ä╪¬╪╣┘è┘è┘å"
        />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((f, i) => (
            <motion.div key={i} variants={fadeUp}>
              <GlowCard glowColor={`hsl(var(--${f.color}) / 0.18)`} className="h-full">
                <div className="p-7 h-full group relative overflow-hidden flex flex-col justify-between">
                  {/* Top accent line */}
                  <motion.div
                    className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, hsl(var(--${f.color}) / 0.3), transparent)` }}
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.4 }}
                  />
                  {/* Corner glow on hover */}
                  <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                  <div className="relative flex items-start gap-4">
                    <motion.div
                      whileHover={{ scale: 1.12, rotate: -8 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className={`w-13 h-13 rounded-2xl ${colorMap[f.color]} flex items-center justify-center shrink-0 border border-current/10`}
                    >
                      <f.icon className="w-6 h-6" />
                    </motion.div>
                    <div className="flex-1">
                      <h3 className="font-bold text-[17px] mb-2 text-foreground group-hover:text-primary transition-colors">{f.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
                      <motion.span
                        className={`inline-flex items-center gap-1.5 mt-4 text-[11px] font-bold text-${f.color} bg-${f.color}/8 px-3 py-1.5 rounded-lg`}
                        whileHover={{ scale: 1.05 }}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {f.highlight}
                      </motion.span>
                    </div>
                  </div>
                </div>
              </GlowCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Capabilities marquee */}
      <section className="py-8 border-y border-border overflow-hidden" style={{ background: "linear-gradient(90deg, hsl(var(--primary) / 0.04), hsl(var(--accent) / 0.03), hsl(var(--primary) / 0.04))" }}>
        <div className="flex animate-[marquee_35s_linear_infinite] gap-3 w-max">
          {[...capabilities, ...capabilities].map((cap, i) => (
            <motion.span
              key={i}
              whileHover={{ scale: 1.05, borderColor: "hsl(var(--primary) / 0.3)" }}
              className="flex items-center gap-2 bg-card border border-border/70 rounded-xl px-4 py-2.5 text-sm text-foreground whitespace-nowrap transition-colors font-medium"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              {cap}
            </motion.span>
          ))}
        </div>
      </section>

      {/* How it works ΓÇö with parallax cards */}
      <section id="how-it-works" className="py-28 relative overflow-hidden" style={{ background: "linear-gradient(180deg, hsl(var(--primary) / 0.02) 0%, hsl(var(--background)) 50%, hsl(var(--accent) / 0.015) 100%)" }}>
        <ParallaxBlob position="top-10 left-1/4" size={600} color="primary" offset={60} />
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.15), hsl(var(--accent) / 0.1), transparent)" }} />
        <div className="container mx-auto px-6 relative">
          <SectionHeader
            badge="╪ó┘ä┘è╪⌐ ╪º┘ä╪╣┘à┘ä"
            badgeColor="accent"
            title="╪ú╪▒╪¿╪╣ ╪«╪╖┘ê╪º╪¬ ┘å╪¡┘ê"
            highlight="╪º┘ä╪¬┘ê╪╕┘è┘ü ╪º┘ä┘à╪½╪º┘ä┘è"
            description="╪╣┘à┘ä┘è╪⌐ ┘à╪¿╪│╪╖╪⌐ ┘ê┘ü╪╣┘æ╪º┘ä╪⌐ ┘ä╪¬┘ê╪╕┘è┘ü ╪ú┘ü╪╢┘ä ╪º┘ä┘â┘ü╪º╪í╪º╪¬"
          />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto relative"
          >
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 right-[12.5%] left-[12.5%] h-px">
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="h-full origin-right"
                style={{ background: "linear-gradient(90deg, hsl(var(--primary) / 0.3), hsl(var(--accent) / 0.3))" }}
              />
            </div>
            {steps.map((step, i) => (
              <motion.div key={i} variants={fadeUp} className="relative">
                <GlowCard glowColor="hsl(var(--accent) / 0.15)" className="h-full">
                  <div className="p-7 text-center group relative overflow-hidden h-full flex flex-col justify-between items-center">
                    {/* Step number background */}
                    <div className="absolute top-3 left-3 text-[60px] font-black text-primary/[0.04] leading-none select-none">{step.num}</div>
                    
                    <div>
                      <motion.div
                        whileHover={{ scale: 1.12, rotate: -8 }}
                        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center mx-auto mb-5 group-hover:shadow-lg group-hover:shadow-primary/10 transition-shadow border border-primary/10"
                      >
                        <step.icon className="w-7 h-7 text-primary" />
                      </motion.div>
                      <span className="text-xs font-black text-primary/40 tracking-widest">{step.num}</span>
                      <h3 className="font-bold text-lg mt-2 mb-3 text-foreground">{step.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Branded Career Page Previewer Section */}
      <section className="py-24 bg-muted/5 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <SectionHeader
            badge="┘ç┘ê┘è╪⌐ ┘à╪«╪╡╪╡╪⌐"
            badgeColor="primary"
            title="╪╡┘ü╪¡╪⌐ ╪¬┘ê╪╕┘è┘ü ╪¬╪¡┘à┘ä"
            highlight="┘ç┘ê┘è╪⌐ ╪┤╪▒┘â╪¬┘â"
            description="╪ú┘å╪┤╪ª ╪¿┘ê╪º╪¿╪⌐ ╪¬┘ê╪╕┘è┘ü ┘â╪º┘à┘ä╪⌐ ┘à╪¬┘ê╪º┘ü┘é╪⌐ ┘à╪╣ ╪ú┘ä┘ê╪º┘å ┘ê╪¬╪╡┘à┘è┘à ╪╣┘ä╪º┘à╪¬┘â ╪º┘ä╪¬╪¼╪º╪▒┘è╪⌐ ╪¿╪«╪╖┘ê╪º╪¬ ╪¿╪│┘è╪╖╪⌐"
          />
          <BrandedCareerPagePreviewer />
        </div>
      </section>

      {/* Recruitment ROI Calculator Section */}
      <section className="py-24 bg-background relative overflow-hidden">
        <div className="container mx-auto px-6">
          <SectionHeader
            badge="╪¡╪º╪│╪¿╪⌐ ╪º┘ä╪¬┘ê┘ü┘è╪▒"
            badgeColor="accent"
            title="╪º╪¡╪│╪¿ ╪¡╪¼┘à"
            highlight="╪º┘ä┘ê┘é╪¬ ┘ê╪º┘ä┘à╪º┘ä ╪º┘ä┘à┘ê┘ü╪▒┘è┘å"
            description="╪º┘â╪¬╪┤┘ü ┘à╪»┘ë ╪º┘ä┘â┘ü╪º╪í╪⌐ ╪º┘ä╪¬┘è ╪│╪¬╪╢┘è┘ü┘ç╪º ┘à┘å╪╡╪⌐ Tawzeef-X ┘ä╪┤╪▒┘â╪¬┘â"
          />
          <RecruitmentRoiCalculator />
        </div>
      </section>

      {/* Interactive Demo */}
      <section id="demo" className="py-28 container mx-auto px-6">
        <SectionHeader
          badge="╪┤╪º┘ç╪» ╪¿┘å┘ü╪│┘â"
          badgeColor="accent"
          title="╪¬╪¼╪▒╪¿╪⌐ ╪¬┘ü╪º╪╣┘ä┘è╪⌐"
          highlight="┘ä┘ä┘à┘å╪╡╪⌐"
          description="╪º┘â╪¬╪┤┘ü ┘â┘è┘ü ╪¬╪╣┘à┘ä ╪º┘ä┘à┘å╪╡╪⌐ ┘à┘å ╪«┘ä╪º┘ä ╪╣╪▒╪╢ ╪¬┘ü╪º╪╣┘ä┘è ╪¡┘è ┘ä╪ú┘ç┘à ╪º┘ä╪┤╪º╪┤╪º╪¬"
        />
        <InteractiveDemo />
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-28 container mx-auto px-6 relative">
        <ParallaxBlob position="top-0 right-1/4" size={500} color="primary" offset={50} />
        <ParallaxBlob position="bottom-10 left-10" size={400} color="accent" offset={-40} />
        <SectionHeader
          badge="╪ó╪▒╪º╪í ╪º┘ä╪╣┘à┘ä╪º╪í"
          title="┘à╪º╪░╪º ┘è┘é┘ê┘ä"
          highlight="╪╣┘à┘ä╪º╪ñ┘å╪º"
          description="╪ó┘ä╪º┘ü ╪º┘ä╪┤╪▒┘â╪º╪¬ ╪¬╪╣╪¬┘à╪» ╪╣┘ä┘ë Tawzeef-X ┘ü┘è ╪╣┘à┘ä┘è╪º╪¬ ╪º┘ä╪¬┘ê╪╕┘è┘ü"
        />
        
        <div className="max-w-5xl mx-auto relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 50, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -50, filter: "blur(4px)" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="grid md:grid-cols-3 gap-5"
            >
              {currentTestimonials.map((t, i) => (
                <motion.div
                  key={`${currentPage}-${i}`}
                  initial={{ opacity: 0, y: 24, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.45 }}
                >
                  <GlowCard glowColor="hsl(var(--primary) / 0.1)" className="h-full">
                    <div className="p-7 relative overflow-hidden h-full flex flex-col justify-between min-h-[260px] group">
                      <div>
                        {/* Quote mark */}
                        <div className="absolute top-4 left-4 text-5xl font-serif text-primary/[0.06] leading-none select-none">"</div>
                        
                        <div className="flex items-center gap-0.5 mb-5">
                          {[...Array(t.rating)].map((_, j) => (
                            <Star key={j} className="w-4 h-4 fill-warning text-warning" />
                          ))}
                        </div>
                        <blockquote className="text-foreground text-sm leading-[1.8] mb-6 relative">
                          "{t.content}"
                        </blockquote>
                      </div>
                      <div className="flex items-center gap-3 pt-5 border-t border-border">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm"
                        >
                          {t.name[0]}
                        </motion.div>
                        <div>
                          <p className="font-bold text-sm text-foreground">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.role} ΓÇö {t.company}</p>
                        </div>
                      </div>
                    </div>
                  </GlowCard>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center mt-10 gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className="relative h-2.5 focus:outline-none"
                aria-label={`Go to slide ${i + 1}`}
              >
                <motion.div
                  animate={{
                    width: i === currentPage ? 32 : 10,
                    backgroundColor: i === currentPage ? "hsl(var(--primary))" : "hsl(var(--border))"
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className="h-full rounded-full"
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-muted/5 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <SectionHeader
            badge="╪º┘ä╪ú╪│╪ª┘ä╪⌐ ╪º┘ä╪┤╪º╪ª╪╣╪⌐"
            badgeColor="primary"
            title="╪º┘ä╪ú╪│╪ª┘ä╪⌐ ╪º┘ä╪ú┘â╪½╪▒"
            highlight="╪┤┘è┘ê╪╣╪º┘ï"
            description="╪Ñ╪¼╪º╪¿╪º╪¬ ╪¬┘ü╪╡┘è┘ä┘è╪⌐ ╪╣┘ä┘ë ┘â┘ä ╪¬╪│╪º╪ñ┘ä╪º╪¬┘â ╪¡┘ê┘ä ┘à┘å╪╡╪⌐ Tawzeef-X"
          />
          <InteractiveFaqAccordion />
        </div>
      </section>

      {/* CTA */}
      <section className="py-28">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl p-14 md:p-20 text-center text-primary-foreground relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
          >
            {/* Animated rings */}
            <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 120, repeat: Infinity, ease: "linear" }}>
              <div className="absolute top-10 right-20 w-48 h-48 rounded-full border border-white/10" />
              <div className="absolute bottom-10 left-10 w-72 h-72 rounded-full border border-white/5" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-white/[0.03]" />
            </motion.div>
            {/* Floating sparkles */}
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-white/20"
                style={{ left: `${20 + i * 20}%`, top: `${15 + i * 15}%` }}
                animate={{ y: [0, -20, 0], opacity: [0.2, 0.8, 0.2] }}
                transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
              />
            ))}
            <div className="relative">
              <motion.h2
                className="text-4xl md:text-6xl font-black mb-5 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                ╪¼╪º┘ç╪▓ ┘ä╪¬╪¡┘ê┘æ┘ä ╪╣┘à┘ä┘è╪⌐ ╪º┘ä╪¬┘ê╪╕┘è┘ü╪ƒ
              </motion.h2>
              <motion.p
                className="text-primary-foreground/75 text-lg mb-10 max-w-2xl mx-auto"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                ╪º┘å╪╢┘à ┘ä╪ú┘â╪½╪▒ ┘à┘å 10,000 ╪┤╪▒┘â╪⌐ ╪¬╪│╪¬╪«╪»┘à Tawzeef-X ┘ä╪Ñ┘è╪¼╪º╪» ┘ê╪¬┘ê╪╕┘è┘ü ╪ú┘ü╪╢┘ä ╪º┘ä┘à┘ê╪º┘ç╪¿ ╪¿╪░┘â╪º╪í ┘ê┘â┘ü╪º╪í╪⌐
              </motion.p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth?mode=signup">
                  <motion.div whileHover={{ scale: 1.06, y: -3 }} whileTap={{ scale: 0.97 }}>
                    <Button size="lg" className="bg-background text-foreground hover:bg-background/90 h-14 px-10 text-base font-bold w-full sm:w-auto rounded-2xl shadow-xl">
                      ╪º╪¿╪»╪ú ╪º┘ä╪ó┘å ┘à╪¼╪º┘å╪º┘ï
                      <ArrowLeft className="w-4 h-4 mr-2" />
                    </Button>
                  </motion.div>
                </Link>
                <Link to="/portal">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button size="lg" variant="outline" className="border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 h-14 px-10 text-base w-full sm:w-auto rounded-2xl">
                      ╪¿┘ê╪º╪¿╪⌐ ╪º┘ä┘à╪▒╪┤╪¡┘è┘å
                    </Button>
                  </motion.div>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-16" style={{ background: "linear-gradient(180deg, hsl(var(--primary) / 0.02), hsl(var(--background)))" }}>
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-10 items-start">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
                <span className="font-bold text-lg text-foreground">Tawzeef-X <span className="text-primary">┘à┘å╪╡╪⌐ ╪º┘ä╪¬┘ê╪╕┘è┘ü</span></span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                ┘à┘å╪╡╪⌐ ╪º┘ä╪¬┘ê╪╕┘è┘ü ╪º┘ä╪░┘â┘è╪⌐ ╪º┘ä┘à╪»╪╣┘ê┘à╪⌐ ╪¿╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è. ┘å╪│╪º╪╣╪» ╪º┘ä╪┤╪▒┘â╪º╪¬ ╪╣┘ä┘ë ╪Ñ┘è╪¼╪º╪» ╪ú┘ü╪╢┘ä ╪º┘ä┘à┘ê╪º┘ç╪¿ ╪¿╪│╪▒╪╣╪⌐ ┘ê┘â┘ü╪º╪í╪⌐.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground mb-4">╪▒┘ê╪º╪¿╪╖ ╪│╪▒┘è╪╣╪⌐</h4>
              <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                <Link to="/portal" className="hover:text-foreground transition-colors">╪¿┘ê╪º╪¿╪⌐ ╪º┘ä┘à╪▒╪┤╪¡</Link>
                <a href="#features" className="hover:text-foreground transition-colors">╪º┘ä┘à┘à┘è╪▓╪º╪¬</a>
                <a href="#how-it-works" className="hover:text-foreground transition-colors">┘â┘è┘ü ╪¬╪╣┘à┘ä</a>
                <a href="#testimonials" className="hover:text-foreground transition-colors">╪ó╪▒╪º╪í ╪º┘ä╪╣┘à┘ä╪º╪í</a>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground mb-4">╪¬┘ê╪º╪╡┘ä ┘à╪╣┘å╪º</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>support@tawzeef-x.com</p>
                <p>+966 50 XXX XXXX</p>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">╪¼┘à┘è╪╣ ╪º┘ä╪¡┘é┘ê┘é ┘à╪¡┘ü┘ê╪╕╪⌐ ┬⌐ {new Date().getFullYear()} Tawzeef-X</p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link to="#" className="hover:text-foreground transition-colors">╪º┘ä╪«╪╡┘ê╪╡┘è╪⌐</Link>
              <Link to="#" className="hover:text-foreground transition-colors">╪º┘ä╪┤╪▒┘ê╪╖</Link>
              <Link to="#" className="hover:text-foreground transition-colors">╪º┘ä╪»╪╣┘à</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
