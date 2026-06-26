import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
  descriptionEn: string;
}

export function useKeyboardShortcuts(enabled = true) {
  const navigate = useNavigate();

  const shortcuts: ShortcutConfig[] = [
    // Navigation shortcuts (Alt + Key)
    { key: "d", alt: true, action: () => navigate("/dashboard"), description: "الذهاب للوحة التحكم", descriptionEn: "Go to Dashboard" },
    { key: "j", alt: true, action: () => navigate("/jobs"), description: "الذهاب للوظائف", descriptionEn: "Go to Jobs" },
    { key: "c", alt: true, action: () => navigate("/candidates"), description: "الذهاب للمرشحين", descriptionEn: "Go to Candidates" },
    { key: "i", alt: true, action: () => navigate("/interviews"), description: "الذهاب للمقابلات", descriptionEn: "Go to Interviews" },
    { key: "o", alt: true, action: () => navigate("/offers"), description: "الذهاب للعروض", descriptionEn: "Go to Offers" },
    { key: "r", alt: true, action: () => navigate("/reports"), description: "الذهاب للتقارير", descriptionEn: "Go to Reports" },
    { key: "n", alt: true, action: () => navigate("/notifications"), description: "الذهاب للإشعارات", descriptionEn: "Go to Notifications" },
    { key: "s", alt: true, action: () => navigate("/settings"), description: "الذهاب للإعدادات", descriptionEn: "Go to Settings" },
    { key: "a", alt: true, action: () => navigate("/ai-assistant"), description: "المساعد الذكي", descriptionEn: "AI Assistant" },
    // Quick action shortcuts (Alt + Shift + Key)
    { key: "p", alt: true, action: () => navigate("/pipeline"), description: "الذهاب لمراحل التوظيف", descriptionEn: "Go to Pipeline" },
    { key: "t", alt: true, action: () => navigate("/talent-pool"), description: "مجمع المواهب", descriptionEn: "Talent Pool" },
    { key: "q", alt: true, action: () => navigate("/question-bank"), description: "بنك الأسئلة", descriptionEn: "Question Bank" },
    { key: "w", alt: true, action: () => navigate("/workflow"), description: "سير العمل", descriptionEn: "Workflow Editor" },
    { key: "h", alt: true, action: () => navigate("/hiring-plan"), description: "خطة التوظيف", descriptionEn: "Hiring Plan" },
  ];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : true;
        const altMatch = shortcut.alt ? e.altKey : true;
        const shiftMatch = shortcut.shift ? e.shiftKey : true;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [enabled, shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
}
