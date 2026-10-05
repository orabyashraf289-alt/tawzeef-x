import sarSymbolImg from "@/assets/sar-symbol.png";

/**
 * New Saudi Riyal symbol component (SAMA 2022)
 * Renders the official SAR currency symbol as an inline image
 */
export default function SARSymbol({ className = "w-4 h-4 inline-block" }: { className?: string }) {
  return (
    <img
      src={sarSymbolImg}
      alt="SAR"
      className={className}
      style={{ verticalAlign: "middle" }}
    />
  );
}

/** Format salary with the new SAR symbol */
export function formatSAR(amount: number, locale: string = "ar"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US").format(amount);
}
