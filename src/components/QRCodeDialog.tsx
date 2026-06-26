import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { X, Download, Copy, CheckCircle, Share2  } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";

import { getApplyUrl } from "@/lib/getPublicUrl";

interface QRCodeDialogProps {
  open: boolean;
  onClose: () => void;
  jobTitle: string;
  jobId: string;
}

export default function QRCodeDialog({ open, onClose, jobTitle, jobId }: QRCodeDialogProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  const applyUrl = getApplyUrl(jobId);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(applyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: jobTitle, text: `تقدم لوظيفة ${jobTitle}`, url: applyUrl });
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadQR = () => {
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
        // Background
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, 500, 600);
        // Inner white card
        ctx.fillStyle = "#ffffff";
        const r = 20;
        ctx.beginPath();
        ctx.moveTo(30 + r, 30);
        ctx.lineTo(470 - r, 30);
        ctx.quadraticCurveTo(470, 30, 470, 30 + r);
        ctx.lineTo(470, 570 - r);
        ctx.quadraticCurveTo(470, 570, 470 - r, 570);
        ctx.lineTo(30 + r, 570);
        ctx.quadraticCurveTo(30, 570, 30, 570 - r);
        ctx.lineTo(30, 30 + r);
        ctx.quadraticCurveTo(30, 30, 30 + r, 30);
        ctx.fill();
        // QR code
        ctx.drawImage(img, 100, 60, 300, 300);
        // Job title
        ctx.fillStyle = "#1e293b";
        ctx.font = "bold 22px Cairo, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(jobTitle, 250, 410);
        // Subtitle
        ctx.fillStyle = "#64748b";
        ctx.font = "16px Cairo, sans-serif";
        ctx.fillText("امسح الرمز للتقديم", 250, 445);
        // Teal accent line
        ctx.fillStyle = "#0d9488";
        ctx.fillRect(150, 475, 200, 3);
        // Footer
        ctx.fillStyle = "#94a3b8";
        ctx.font = "13px Cairo, sans-serif";
        ctx.fillText("Tawzeef-X", 250, 520);
      }
      const link = document.createElement("a");
      link.download = `qr-${jobTitle}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-[#0f172a]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 animate-fade-up overflow-hidden rounded-3xl shadow-2xl">
        {/* Dark branded header */}
        <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0d9488]/60 p-6 text-center">
          <button onClick={onClose} className="absolute top-4 left-4 text-white/50 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
          <div className="inline-flex items-center gap-2 bg-[#0d9488]/20 text-[#5eead4] px-4 py-1.5 rounded-full text-xs font-semibold border border-[#5eead4]/20">
            <CheckCircle className="w-3.5 h-3.5" />
            تم إنشاء الوظيفة بنجاح
          </div>
          <h3 className="text-white font-bold text-lg mt-3">{jobTitle}</h3>
        </div>

        {/* White content area */}
        <div className="bg-white p-6 flex flex-col items-center gap-5">
          <p className="text-sm text-[#64748b] text-center">
            امسح رمز QR أو شارك الرابط لاستقبال طلبات التوظيف
          </p>

          {/* QR Code with branded border */}
          <div ref={qrRef} className="relative p-5 rounded-2xl border-2 border-[#e2e8f0] bg-white">
            <QRCodeSVG
              value={applyUrl}
              size={200}
              level="H"
              bgColor="#ffffff"
              fgColor="#0f172a"
              includeMargin={false}
            />
            {/* Center logo overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-[#e2e8f0]">
                <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
              </div>
            </div>
          </div>

          {/* Link */}
          <div className="w-full bg-[#f8fafb] rounded-xl p-3 flex items-center gap-2 border border-[#e2e8f0]">
            <span className="flex-1 text-xs text-[#94a3b8] truncate font-mono" dir="ltr">
              {applyUrl}
            </span>
            <Button variant="ghost" size="sm" onClick={handleCopyLink} className="shrink-0 h-8 px-3 hover:bg-[#f0fdfa] hover:text-[#0d9488]">
              {copied ? <CheckCircle className="w-4 h-4 text-[#10b981]" /> : <Copy className="w-4 h-4" />}
              <span className="mr-1 text-xs">{copied ? "تم النسخ" : "نسخ"}</span>
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <Button onClick={handleDownloadQR} variant="outline" className="flex-1 rounded-xl border-[#e2e8f0] hover:border-[#0d9488]/30 hover:bg-[#f0fdfa] hover:text-[#0d9488]">
              <Download className="w-4 h-4 ml-2" />
              تحميل QR
            </Button>
            <Button onClick={handleShare} className="flex-1 rounded-xl bg-gradient-to-l from-[#0d9488] to-[#0f766e] hover:from-[#0f766e] hover:to-[#115e59] text-white border-0">
              <Share2 className="w-4 h-4 ml-2" />
              مشاركة
            </Button>
          </div>

          {/* Footer branding */}
          <div className="flex items-center gap-2 pt-2 border-t border-[#f1f5f9] w-full justify-center">
            <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
            <span className="text-[10px] text-[#cbd5e1]">نظام التوظيف الذكي</span>
          </div>
        </div>
      </div>
    </div>
  );
}
