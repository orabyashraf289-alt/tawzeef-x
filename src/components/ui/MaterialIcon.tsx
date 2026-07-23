import React from "react";
import { cn } from "@/lib/utils";

export interface MaterialIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Name of the Material Symbol (e.g. "search", "work", "person", "settings", "analytics", "verified") */
  name: string;
  /** Style variant of the icon */
  variant?: "outlined" | "rounded" | "sharp";
  /** Filled icon state (true for filled, false for outlined) */
  filled?: boolean;
  /** Font weight (100 - 700) */
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  /** Grade (-25 to 200) */
  grade?: -25 | 0 | 200;
  /** Optical size (20, 24, 40, 48) */
  opticalSize?: 20 | 24 | 40 | 48;
  /** Custom pixel or CSS size (e.g. 20, 24, "1.5rem") */
  size?: number | string;
  className?: string;
}

/**
 * Google Material Icon & Symbol Component for Tawzeef-X
 * Easily render Google Material Symbols (Outlined, Rounded, Sharp) anywhere with variable font weights, sizes, and filled states!
 */
export const MaterialIcon: React.FC<MaterialIconProps> = ({
  name,
  variant = "outlined",
  filled = false,
  weight = 400,
  grade = 0,
  opticalSize = 24,
  size,
  className,
  style,
  ...props
}) => {
  const variantClass =
    variant === "rounded"
      ? "material-symbols-rounded"
      : variant === "sharp"
      ? "material-symbols-sharp"
      : "material-symbols-outlined";

  const fontVariationSettings = `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`;

  return (
    <span
      className={cn(
        variantClass,
        "select-none inline-flex items-center justify-center shrink-0 align-middle leading-none transition-all duration-200",
        className
      )}
      style={{
        fontVariationSettings,
        fontSize: size ? (typeof size === "number" ? `${size}px` : size) : undefined,
        ...style,
      }}
      {...props}
    >
      {name}
    </span>
  );
};

export default MaterialIcon;
