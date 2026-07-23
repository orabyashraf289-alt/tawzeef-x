import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  size?: "sm" | "default" | "lg";
  showIcon?: boolean;
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, size = "default", showIcon = true, ...props }, ref) => {
  const sizeClasses = {
    sm: "h-5 w-9 text-[9px]",
    default: "h-6.5 w-12 text-[10px]",
    lg: "h-8 w-15 text-xs",
  }[size];

  const thumbSizeClasses = {
    sm: "h-4 w-4 data-[state=checked]:translate-x-4 rtl:data-[state=checked]:-translate-x-4",
    default: "h-5.5 w-5.5 data-[state=checked]:translate-x-5.5 rtl:data-[state=checked]:-translate-x-5.5",
    lg: "h-7 w-7 data-[state=checked]:translate-x-7 rtl:data-[state=checked]:-translate-x-7",
  }[size];

  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent p-0.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 hover:scale-[1.04] active:scale-95 shadow-sm group",
        "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-primary data-[state=checked]:via-primary/90 data-[state=checked]:to-emerald-600 data-[state=checked]:shadow-md data-[state=checked]:shadow-primary/25",
        "data-[state=unchecked]:bg-muted/80 data-[state=unchecked]:border-border/60 hover:data-[state=unchecked]:bg-muted hover:data-[state=unchecked]:border-primary/40",
        sizeClasses,
        className
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none flex items-center justify-center rounded-full bg-background shadow-md ring-0 transition-transform duration-300 ease-out data-[state=unchecked]:translate-x-0 group-hover:shadow-lg",
          thumbSizeClasses
        )}
      >
        {showIcon && (
          <>
            <span className="hidden group-data-[state=checked]:flex text-primary font-black animate-in zoom-in-75 duration-200">
              <Check className="w-3 h-3 stroke-[3]" />
            </span>
            <span className="flex group-data-[state=checked]:hidden text-muted-foreground/60 animate-in fade-in-50 duration-200">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
            </span>
          </>
        )}
      </SwitchPrimitives.Thumb>
    </SwitchPrimitives.Root>
  );
});
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
