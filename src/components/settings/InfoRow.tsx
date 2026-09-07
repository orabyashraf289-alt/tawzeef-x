import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function InfoRow({ icon: Icon, label, value, badge }: { icon: LucideIcon; label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
      <div className="p-2 rounded-lg bg-primary/8">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        {badge ? (
          <Badge variant="outline" className="text-xs border-green-500/30 text-green-600 mt-0.5">
            <Check className="w-3 h-3 ml-1" />{value}
          </Badge>
        ) : (
          <p className="text-sm font-medium text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}
