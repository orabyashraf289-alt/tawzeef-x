import { toast } from "@/hooks/use-toast";

export const FILE_LIMITS = {
  resume: {
    maxSize: 5 * 1024 * 1024, // 5MB
    maxSizeLabel: "5 ميجابايت",
    allowedTypes: [".pdf", ".doc", ".docx"],
    allowedMimes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
  image: {
    maxSize: 10 * 1024 * 1024, // 10MB
    maxSizeLabel: "10 ميجابايت",
    allowedTypes: [".jpg", ".jpeg", ".png", ".webp"],
    allowedMimes: ["image/jpeg", "image/png", "image/webp"],
  },
} as const;

export function validateFile(
  file: File,
  type: keyof typeof FILE_LIMITS
): boolean {
  const limits = FILE_LIMITS[type];

  if (file.size > limits.maxSize) {
    toast({
      title: "حجم الملف كبير جداً",
      description: `الحد الأقصى ${limits.maxSizeLabel}`,
      variant: "destructive",
    });
    return false;
  }

  const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
  if (!(limits.allowedTypes as readonly string[]).includes(ext)) {
    toast({
      title: "نوع الملف غير مدعوم",
      description: `الأنواع المدعومة: ${limits.allowedTypes.join(", ")}`,
      variant: "destructive",
    });
    return false;
  }

  return true;
}
