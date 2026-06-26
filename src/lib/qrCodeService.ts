import { supabase } from "@/integrations/supabase/client";
import { getApplyUrl } from "@/lib/getPublicUrl";
import { loadBrandSettings, type PosterBrandSettings } from "@/lib/posterBrandSettings";

interface QRGenParams {
  jobId: string;
  jobTitle: string;
  brand?: PosterBrandSettings;
}

/**
 * Generates a branded QR code PNG (data URL) for a job application link.
 * Always uses the real apply URL (`/apply/<jobId>`) so the QR is valid the moment the job is saved.
 */
export async function generateJobQRCode(params: QRGenParams): Promise<string> {
  const { jobId, jobTitle } = params;
  const brand = params.brand ?? loadBrandSettings();
  const applyUrl = getApplyUrl(jobId);

  const QRCode = (await import("qrcode")).default;
  const qrDataUrl = await QRCode.toDataURL(applyUrl, {
    width: 400,
    margin: 2,
    color: { dark: brand.qrForeground, light: "#ffffff" },
    errorCorrectionLevel: "H",
  });

  // Compose a branded card using canvas
  const canvas = document.createElement("canvas");
  canvas.width = 500;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");
  if (!ctx) return qrDataUrl;

  // Background gradient: primary → accent
  const grad = ctx.createLinearGradient(0, 0, 500, 600);
  grad.addColorStop(0, brand.primaryColor);
  grad.addColorStop(1, brand.accentColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 500, 600);

  // Inner white card with rounded corners
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

  // Draw QR + branded labels
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 100, 60, 300, 300);

      // Title
      ctx.fillStyle = "#1e293b";
      ctx.font = `bold 22px ${brand.fontFamily}`;
      ctx.textAlign = "center";
      const truncated = jobTitle.length > 30 ? jobTitle.slice(0, 30) + "…" : jobTitle;
      ctx.fillText(truncated, 250, 410);

      // Subtitle
      ctx.fillStyle = "#64748b";
      ctx.font = `16px ${brand.fontFamily}`;
      ctx.fillText("امسح الرمز للتقديم", 250, 445);

      // Brand accent line
      ctx.fillStyle = brand.primaryColor;
      ctx.fillRect(150, 475, 200, 3);

      // Footer / company name
      ctx.fillStyle = "#94a3b8";
      ctx.font = `13px ${brand.fontFamily}`;
      ctx.fillText(brand.companyName || "Tawzeef-X", 250, 520);

      resolve();
    };
    img.src = qrDataUrl;
  });

  return canvas.toDataURL("image/png");
}

/**
 * Generates a standalone QR-only SVG string (no branding card) suitable for vector download / print.
 */
export async function generateJobQRSvg(params: QRGenParams): Promise<string> {
  const { jobId } = params;
  const brand = params.brand ?? loadBrandSettings();
  const applyUrl = getApplyUrl(jobId);
  const QRCode = (await import("qrcode")).default;
  return await QRCode.toString(applyUrl, {
    type: "svg",
    margin: 2,
    color: { dark: brand.qrForeground, light: "#ffffff" },
    errorCorrectionLevel: "H",
    width: 512,
  });
}

/**
 * Generates a QR PNG and uploads it to Supabase Storage (resumes bucket under qr-codes/).
 * Returns the public URL or null if upload fails.
 */
export async function generateAndStoreJobQR(params: {
  jobId: string;
  jobTitle: string;
  userId: string;
  brand?: PosterBrandSettings;
}): Promise<string | null> {
  try {
    const dataUrl = await generateJobQRCode({
      jobId: params.jobId,
      jobTitle: params.jobTitle,
      brand: params.brand,
    });
    const blob = await (await fetch(dataUrl)).blob();
    const path = `qr-codes/${params.userId}/${params.jobId}.png`;

    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(path, blob, { contentType: "image/png", upsert: true });
    if (uploadError) {
      console.error("QR upload failed:", uploadError);
      return null;
    }

    const { data } = supabase.storage.from("resumes").getPublicUrl(path);
    // Bust CDN cache so the regenerated QR shows immediately
    const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

    await supabase
      .from("jobs")
      .update({ qr_code_url: publicUrl } as any)
      .eq("id", params.jobId);

    return publicUrl;
  } catch (e) {
    console.error("generateAndStoreJobQR error:", e);
    return null;
  }
}

/** Triggers a download of the branded QR PNG */
export async function downloadJobQR(jobId: string, jobTitle: string) {
  const dataUrl = await generateJobQRCode({ jobId, jobTitle });
  triggerDownload(
    dataUrl,
    `qr-${sanitizeName(jobTitle)}.png`,
  );
}

/** Triggers a download of the QR as a vector SVG file */
export async function downloadJobQRSvg(jobId: string, jobTitle: string) {
  const svg = await generateJobQRSvg({ jobId, jobTitle });
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `qr-${sanitizeName(jobTitle)}.svg`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sanitizeName(name: string) {
  return name.replace(/[^\w\u0600-\u06FF]+/g, "-").slice(0, 50);
}

function triggerDownload(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
