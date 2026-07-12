import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { useState, useRef, useEffect } from "react";
import { X, Download, Copy, CheckCircle, Share2, Linkedin, QrCode, Link2, ExternalLink, Loader2, Image as ImageIcon, RefreshCw, FileCode2, Megaphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getApplyUrl, getOgApplyUrl } from "@/lib/getPublicUrl";
import { useI18n } from "@/contexts/I18nContext";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateAndStoreJobQR, downloadJobQRSvg } from "@/lib/qrCodeService";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { useQueryClient } from "@tanstack/react-query";

interface ShareJobDialogProps {
  open: boolean;
  onClose: () => void;
  jobTitle: string;
  jobId: string;
  isNewJob?: boolean;
}

export default function ShareJobDialog({ open, onClose, jobTitle, jobId, isNewJob = false }: ShareJobDialogProps) {
  const { t, dir } = useI18n();
  const { user } = useAuth();
  const { brand } = useBrandSettings();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [linkedInShared, setLinkedInShared] = useState(false);
  const [storedQrUrl, setStoredQrUrl] = useState<string | null>(null);
  const [loadingStored, setLoadingStored] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [downloadingSvg, setDownloadingSvg] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // LinkedIn Direct Posting States
  const [isLinkedInConnected, setIsLinkedInConnected] = useState(false);
  const [linkedinProfileName, setLinkedinProfileName] = useState<string | null>(null);
  const [postingToLinkedIn, setPostingToLinkedIn] = useState(false);
  const [directPosted, setDirectPosted] = useState(false);

  const applyUrl = getApplyUrl(jobId);
  const ogUrl = getOgApplyUrl(jobId);

  // Check LinkedIn connection on open
  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from("linkedin_settings" as any)
      .select("access_token, linkedin_urn, linkedin_name")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data && data.access_token && data.linkedin_urn) {
          setIsLinkedInConnected(true);
          setLinkedinProfileName(data.linkedin_name || null);
        } else {
          setIsLinkedInConnected(false);
          setLinkedinProfileName(null);
        }
      });
  }, [open, user]);

  // Fetch stored QR when dialog opens
  useEffect(() => {
    if (!open || !jobId) return;
    setLoadingStored(true);
    supabase.from("jobs").select("qr_code_url").eq("id", jobId).maybeSingle().then(({ data }) => {
      setStoredQrUrl((data as any)?.qr_code_url || null);
      setLoadingStored(false);
    });
  }, [open, jobId]);

  if (!open) return null;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(applyUrl);
    setCopied(true);
    toast({ title: t("share.linkCopied") });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLinkedIn = () => {
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(ogUrl)}`;
    const w = window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
    if (!w) {
      navigator.clipboard.writeText(applyUrl);
      toast({ title: t("share.linkedInBlocked") });
    } else {
      setLinkedInShared(true);
      toast({ title: t("share.linkedInOpened") });
    }
  };

  // Direct Publish Action via API Function
  const handleDirectPublishLinkedIn = async () => {
    if (!jobId) return;
    setPostingToLinkedIn(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) throw new Error("Authentication token not found. Please log in.");

      const response = await fetch("https://rlfewneisuezsamhosct.supabase.co/functions/v1/linkedin-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ job_id: jobId })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to post to LinkedIn");
      }

      setDirectPosted(true);
      toast({
        title: "🎉 تم النشر بنجاح!",
        description: "تمت مشاركة الوظيفة مباشرة على صفحتك المهنية في LinkedIn."
      });
    } catch (err: any) {
      toast({
        title: "❌ فشل النشر المباشر",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setPostingToLinkedIn(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`🚀 *${jobTitle}*\n\n${t("share.applyFor") || "تقدّم للوظيفة الآن:"} ${jobTitle}\n\n${applyUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareTelegram = () => {
    const text = encodeURIComponent(`🚀 ${jobTitle}\n\n${t("share.applyFor") || "تقدّم للوظيفة الآن:"} ${jobTitle}\n\n${applyUrl}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(applyUrl)}&text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(`${t("share.twitterText")} ${jobTitle}`);
    const url = encodeURIComponent(ogUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  const handleNativeShare = async () => {
    // Build a richer message that includes the job announcement text + apply link
    const text = `🚀 ${jobTitle}\n\n${t("share.applyFor")} ${jobTitle}\n\n${applyUrl}`;
    if (navigator.share) {
      try {
        // Try sharing with the stored poster image as a file (when supported)
        if (storedQrUrl && (navigator as any).canShare) {
          const blob = await (await fetch(storedQrUrl)).blob();
          const file = new File([blob], `poster-${jobTitle}.png`, { type: "image/png" });
          if ((navigator as any).canShare({ files: [file] })) {
            await navigator.share({ title: jobTitle, text, url: applyUrl, files: [file] } as any);
            return;
          }
        }
        await navigator.share({ title: jobTitle, text, url: applyUrl });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: t("share.linkCopied") });
    }
  };

  const handleDownloadSvg = async () => {
    setDownloadingSvg(true);
    try {
      await downloadJobQRSvg(jobId, jobTitle);
      toast({ title: "تم تحميل SVG ✅" });
    } catch (e: any) {
      toast({ title: "فشل التحميل", description: e?.message, variant: "destructive" });
    } finally {
      setDownloadingSvg(false);
    }
  };

  // One-click download — prefers stored branded QR, falls back to live render
  const handleDownloadQR = async () => {
    if (storedQrUrl) {
      try {
        const resp = await fetch(storedQrUrl);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `qr-${jobTitle}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "تم التحميل ✅" });
        return;
      } catch {
        // Fall through to local render
      }
    }
    // Local render fallback (branded canvas)
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = 500;
      canvas.height = 600;
      if (ctx) {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, 500, 600);
        ctx.fillStyle = "#ffffff";
        const r = 20;
        ctx.beginPath();
        ctx.moveTo(30 + r, 30); ctx.lineTo(470 - r, 30);
        ctx.quadraticCurveTo(470, 30, 470, 30 + r); ctx.lineTo(470, 570 - r);
        ctx.quadraticCurveTo(470, 570, 470 - r, 570); ctx.lineTo(30 + r, 570);
        ctx.quadraticCurveTo(30, 570, 30, 570 - r); ctx.lineTo(30, 30 + r);
        ctx.quadraticCurveTo(30, 30, 30 + r, 30); ctx.fill();
        ctx.drawImage(img, 100, 60, 300, 300);
        ctx.fillStyle = "#1e293b";
        ctx.font = "bold 22px Cairo, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(jobTitle, 250, 410);
        ctx.fillStyle = "#64748b"; ctx.font = "16px Cairo, sans-serif";
        ctx.fillText(t("share.scanToApply"), 250, 445);
        ctx.fillStyle = "#0d9488"; ctx.fillRect(150, 475, 200, 3);
        ctx.fillStyle = "#94a3b8"; ctx.font = "13px Cairo, sans-serif";
        ctx.fillText("Tawzeef-X", 250, 520);
      }
      const link = document.createElement("a");
      link.download = `qr-${jobTitle}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "تم التحميل ✅" });
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleRegenerateQR = async () => {
    if (!user) return;
    setRegenerating(true);
    try {
      const url = await generateAndStoreJobQR({ jobId, jobTitle, userId: user.id, brand });
      setStoredQrUrl(url);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast({ title: "تم إعادة إنشاء الباركود بهوية شركتك ✅" });
    } catch (e: any) {
      toast({ title: "فشل التحديث", description: e?.message, variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" dir={dir}>
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg mx-4 overflow-hidden rounded-2xl shadow-2xl bg-card max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0d9488]/60 p-6 text-center relative shrink-0">
          <button onClick={onClose} className="absolute top-4 left-4 text-white/50 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain mx-auto" />
          {isNewJob && (
            <div className="inline-flex items-center gap-2 bg-[#0d9488]/20 text-[#5eead4] px-4 py-1.5 rounded-full text-xs font-semibold border border-[#5eead4]/20 mb-2 mt-2">
              <CheckCircle className="w-3.5 h-3.5" />
              {t("share.jobPublished")}
            </div>
          )}
          <h3 className="text-white font-bold text-lg mt-2">{jobTitle}</h3>
          <p className="text-white/60 text-sm mt-1">{t("share.subtitle")}</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="share" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-2 mx-5 mt-4 shrink-0">
            <TabsTrigger value="share" className="gap-1.5"><Share2 className="w-3.5 h-3.5" />مشاركة</TabsTrigger>
            <TabsTrigger value="qr" className="gap-1.5"><QrCode className="w-3.5 h-3.5" />باركود QR</TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto flex-1">
            {/* SHARE TAB */}
            <TabsContent value="share" className="p-5 space-y-4 mt-0">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleShareLinkedIn}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  linkedInShared ? "border-[#0A66C2]/30 bg-[#0A66C2]/5" : "border-[#0A66C2]/20 hover:border-[#0A66C2]/50 hover:bg-[#0A66C2]/5"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-[#0A66C2] flex items-center justify-center shrink-0">
                  <Linkedin className="w-6 h-6 text-white" />
                </div>
                <div className="text-start flex-1">
                  <p className="font-bold text-sm text-foreground">{t("share.shareLinkedIn")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("share.linkedInDesc")}</p>
                </div>
                {linkedInShared ? <CheckCircle className="w-5 h-5 text-[#0A66C2] shrink-0" /> : <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />}
              </motion.button>

              {isLinkedInConnected && (
                <div className="rounded-xl border border-[#0A66C2]/30 bg-[#0A66C2]/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#0A66C2] flex items-center justify-center shrink-0">
                        <Linkedin className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-xs font-bold text-foreground">
                        حساب LinkedIn مرتبط: <span className="text-[#0A66C2]">{linkedinProfileName}</span>
                      </span>
                    </div>
                    <Badge variant="outline" className="border-[#0A66C2]/20 text-[#0A66C2] text-[10px]">مفعّل</Badge>
                  </div>
                  <Button
                    onClick={handleDirectPublishLinkedIn}
                    disabled={postingToLinkedIn || directPosted}
                    className="w-full bg-[#0A66C2] hover:bg-[#0A66C2]/90 text-white gap-2 font-bold text-xs shadow-sm h-10"
                  >
                    {postingToLinkedIn ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري النشر المباشر...
                      </>
                    ) : directPosted ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-white" />
                        تم النشر بنجاح! ✅
                      </>
                    ) : (
                      <>
                        <Megaphone className="w-4 h-4 text-white" />
                        نشر الوظيفة مباشرة على صفحتك الآن
                      </>
                    )}
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-4 gap-2">
                <button onClick={handleShareWhatsApp} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 hover:border-green-500/20 hover:bg-green-500/5 transition-all">
                  <div className="w-9 h-9 rounded-lg bg-[#25D366] flex items-center justify-center">
                    <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 11.966.01c3.178.001 6.169 1.24 8.409 3.485 2.24 2.246 3.476 5.239 3.471 8.42-.013 6.618-5.353 11.956-11.922 11.956-2.01 0-3.992-.511-5.753-1.488L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.579 1.966 14.12 .943 11.96 0.943c-5.448 0-9.879 4.37-9.883 9.8.001 1.97.521 3.902 1.51 5.62l-.993 3.63 3.731-.968L6.648 19.15z"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground">واتساب</span>
                </button>
                <button onClick={handleShareTelegram} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 hover:border-blue-500/20 hover:bg-blue-500/5 transition-all">
                  <div className="w-9 h-9 rounded-lg bg-[#0088cc] flex items-center justify-center">
                    <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.89 1.2-5.32 3.52-.5.34-.96.51-1.37.5-.45-.01-1.32-.26-1.97-.47-.8-.26-1.43-.4-1.38-.85.03-.24.36-.48.99-.72 3.87-1.68 6.46-2.8 7.77-3.34 3.69-1.54 4.46-1.81 4.96-1.82.11 0 .36.03.52.16.14.11.18.26.19.38 0 .09-.01.19-.02.27z"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground">تليجرام</span>
                </button>
                <button onClick={handleShareTwitter} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 hover:border-foreground/20 hover:bg-muted/50 transition-all">
                  <div className="w-9 h-9 rounded-lg bg-foreground flex items-center justify-center">
                    <span className="text-background font-bold text-sm">𝕏</span>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground">{t("share.twitter")}</span>
                </button>
                <button onClick={handleNativeShare} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Share2 className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground">{t("share.more")}</span>
                </button>
              </div>

              <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-2 border border-border/50">
                <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="flex-1 text-xs text-muted-foreground truncate font-mono" dir="ltr">{applyUrl}</span>
                <Button variant="ghost" size="sm" onClick={handleCopyLink} className="shrink-0 h-8 px-3 hover:bg-primary/5 hover:text-primary">
                  {copied ? <CheckCircle className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  <span className="mr-1 text-xs">{copied ? t("share.copied") : t("share.copy")}</span>
                </Button>
              </div>

              <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                <p className="text-xs text-primary/80 text-center">💡 {t("share.ogHint")}</p>
              </div>
            </TabsContent>

            {/* QR TAB */}
            <TabsContent value="qr" className="p-5 mt-0">
              <div className="flex flex-col items-center gap-4">
                {loadingStored ? (
                  <div className="w-[260px] h-[260px] rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : storedQrUrl ? (
                  <div className="relative">
                    <img
                      src={storedQrUrl}
                      alt={`QR ${jobTitle}`}
                      className="w-[260px] h-auto rounded-2xl border border-border/50 shadow-sm bg-white"
                    />
                    <div className="absolute top-2 right-2 inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle className="w-3 h-3" />باركود محفوظ
                    </div>
                  </div>
                ) : (
                  <div ref={qrRef} className="p-5 rounded-2xl border-2 border-border/50 bg-white relative">
                    <QRCodeSVG value={applyUrl} size={220} level="H" bgColor="#ffffff" fgColor="#0f172a" includeMargin={false} />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-border/50">
                        <img src={tawzeefLogo} alt="Tawzeef-X" className="w-9 h-9 object-contain" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <p className="text-xs text-muted-foreground">امسح هذا الباركود للوصول لصفحة التقديم</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono break-all" dir="ltr">{applyUrl}</p>
                </div>

                <div className="flex gap-2 w-full">
                  <Button
                    onClick={handleDownloadQR}
                    className="flex-1 gap-2 bg-gradient-to-l from-primary to-primary/80 hover:opacity-90 text-primary-foreground border-0"
                  >
                    <Download className="w-4 h-4" />
                    تحميل PNG
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadSvg}
                    disabled={downloadingSvg}
                    className="flex-1 gap-2"
                    title="تحميل QR كملف SVG قابل للتكبير"
                  >
                    {downloadingSvg ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode2 className="w-4 h-4" />}
                    تحميل SVG
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRegenerateQR}
                    disabled={regenerating}
                    className="gap-2"
                    title="إعادة إنشاء الباركود بهوية شركتك"
                  >
                    {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                </div>

                {storedQrUrl && (
                  <a
                    href={storedQrUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <ImageIcon className="w-3 h-3" />فتح الصورة الأصلية
                  </a>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </motion.div>
    </div>
  );
}
