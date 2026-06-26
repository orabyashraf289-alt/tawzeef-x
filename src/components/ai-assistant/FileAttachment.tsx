import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, FileText, X, FileImage, FileType } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export interface AttachedFile {
  file: File;
  type: "resume" | "image" | "document";
  preview?: string;
}

interface FileAttachmentProps {
  files: AttachedFile[];
  onAdd: (files: AttachedFile[]) => void;
  onRemove: (idx: number) => void;
  disabled?: boolean;
}

const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function detectType(file: File): AttachedFile["type"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf" || file.name.match(/\.(pdf|doc|docx|txt)$/i)) return "resume";
  return "document";
}

export default function FileAttachment({ files, onAdd, onRemove, disabled }: FileAttachmentProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    if (files.length + selected.length > MAX_FILES) {
      toast({ title: `الحد الأقصى ${MAX_FILES} ملفات`, variant: "destructive" });
      return;
    }

    const newFiles: AttachedFile[] = [];
    for (const file of selected) {
      if (file.size > MAX_SIZE) {
        toast({ title: `${file.name} حجمه كبير جداً (الحد 10MB)`, variant: "destructive" });
        continue;
      }
      const type = detectType(file);
      let preview: string | undefined;
      if (type === "image") {
        preview = URL.createObjectURL(file);
      }
      newFiles.push({ file, type, preview });
    }

    onAdd(newFiles);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input
        type="file"
        ref={inputRef}
        accept=".txt,.pdf,.doc,.docx,image/*"
        className="hidden"
        multiple
        onChange={handleSelect}
        disabled={disabled}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 w-10 h-10 rounded-xl"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        title="إرفاق ملفات (PDF, Word, صور)"
      >
        <Paperclip className="w-4 h-4 text-muted-foreground" />
      </Button>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-1"
          >
            <div className="flex flex-wrap gap-1.5">
              {files.map((af, idx) => {
                const Icon = af.type === "image" ? FileImage : af.type === "resume" ? FileText : FileType;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2.5 py-1.5 rounded-lg max-w-[180px]"
                  >
                    {af.preview ? (
                      <img src={af.preview} alt="" className="w-5 h-5 rounded object-cover" />
                    ) : (
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className="truncate flex-1">{af.file.name}</span>
                    <button
                      type="button"
                      onClick={() => onRemove(idx)}
                      className="hover:text-destructive shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
