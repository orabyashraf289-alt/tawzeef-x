import { forwardRef, type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Centralized Typography system.
 * All headings/paragraphs across the app should use these components instead of
 * scattering `text-2xl font-bold leading-tight` classes — this guarantees Arabic
 * diacritics (shadda/fatha/tanwin) never get clipped, and keeps the type scale
 * consistent across StatCard, dashboards, dialogs, and pages.
 *
 * Each variant defines: font-family stack, weight, size, line-height, letter-spacing.
 * RTL safety overrides in src/index.css further protect against tight leading/tracking.
 */

type TypographyVariant = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "lead" | "small" | "muted" | "label";

const VARIANT_CLASSES: Record<TypographyVariant, string> = {
  // Headings — generous leading so Arabic tall glyphs are never cropped.
  h1: "font-display text-3xl md:text-4xl lg:text-5xl font-black [line-height:1.4] tracking-[-0.005em]",
  h2: "font-display text-2xl md:text-3xl font-bold [line-height:1.45]",
  h3: "font-display text-xl md:text-2xl font-bold [line-height:1.5]",
  h4: "font-display text-lg font-bold [line-height:1.55]",
  h5: "font-display text-base font-bold [line-height:1.6]",
  h6: "font-display text-sm font-bold uppercase [line-height:1.6] tracking-wide",
  // Body
  p: "text-base [line-height:1.7]",
  lead: "text-lg text-muted-foreground [line-height:1.7]",
  small: "text-sm [line-height:1.65]",
  muted: "text-sm text-muted-foreground [line-height:1.65]",
  label: "text-sm font-medium [line-height:1.5]",
};

const DEFAULT_TAG: Record<TypographyVariant, ElementType> = {
  h1: "h1", h2: "h2", h3: "h3", h4: "h4", h5: "h5", h6: "h6",
  p: "p", lead: "p", small: "small", muted: "p", label: "span",
};

export interface TypographyProps extends HTMLAttributes<HTMLElement> {
  variant?: TypographyVariant;
  as?: ElementType;
  children?: ReactNode;
}

export const Typography = forwardRef<HTMLElement, TypographyProps>(
  ({ variant = "p", as, className, children, ...rest }, ref) => {
    const Tag = (as ?? DEFAULT_TAG[variant]) as ElementType;
    return (
      <Tag ref={ref as never} className={cn(VARIANT_CLASSES[variant], className)} {...rest}>
        {children}
      </Tag>
    );
  }
);
Typography.displayName = "Typography";

// Convenience aliases — read better at call sites.
export const H1 = (p: Omit<TypographyProps, "variant">) => <Typography variant="h1" {...p} />;
export const H2 = (p: Omit<TypographyProps, "variant">) => <Typography variant="h2" {...p} />;
export const H3 = (p: Omit<TypographyProps, "variant">) => <Typography variant="h3" {...p} />;
export const H4 = (p: Omit<TypographyProps, "variant">) => <Typography variant="h4" {...p} />;
export const H5 = (p: Omit<TypographyProps, "variant">) => <Typography variant="h5" {...p} />;
export const H6 = (p: Omit<TypographyProps, "variant">) => <Typography variant="h6" {...p} />;
export const P = (p: Omit<TypographyProps, "variant">) => <Typography variant="p" {...p} />;
export const Lead = (p: Omit<TypographyProps, "variant">) => <Typography variant="lead" {...p} />;
export const Small = (p: Omit<TypographyProps, "variant">) => <Typography variant="small" {...p} />;
export const Muted = (p: Omit<TypographyProps, "variant">) => <Typography variant="muted" {...p} />;
export const Label = (p: Omit<TypographyProps, "variant">) => <Typography variant="label" {...p} />;
