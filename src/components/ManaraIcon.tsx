import React from "react";

export function ManaraBeaconIcon({ className = "w-6 h-6", color = "#FF773B" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 34 35" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="m13.95 18.328.001 1.992H16l-.102 8.095-1.947 1.972-1.946 1.972-2.05 2.076H8.01l-.102-8.096L0 26.319v-1.94l5.972-6.05h7.978zM34 28.325l-6 6.11v-6.11h6zm-28 0v6.11l-6-6.11h6zm10.915 1.625 3.038 2.704v1.732H14.04v-1.732l2.874-2.704zm10.931-11.807 5.972 6.05v1.94l-7.906.021-.103 8.096h-1.946l-2.05-2.076-1.946-1.972-1.946-1.972-.103-8.095h2.05v-1.992h7.978zm5.972-4.073v6.11h-1.67l-2.512-3.065 2.512-3.045h1.67zm-32.225 0 2.589 3.045-2.59 3.065H0v-6.11h1.593zm16.225 2.037v2.036h-2v-2.036h2zM25.81 0l.102 8.095 7.907.022v1.94l-5.972 6.05h-7.978v-1.992h-2.05l.103-8.095 1.946-1.972 1.947-1.972L23.863 0h1.946zM9.956 0l2.049 2.076 1.946 1.972 1.947 1.972.102 8.095h-2.049l-.001 1.992H5.972L0 10.057v-1.94l7.907-.022L8.009 0h1.947zM6 .185v6.11H0l6-6.11zM28 0l6 6.11h-6V0zm-8.138.05v1.647l-3.037 2.42-2.875-2.42V.05h5.912z"
        fill={color}
      />
    </svg>
  );
}

export function ManaraFullLogo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ManaraBeaconIcon className="h-7 w-7 shrink-0" color="#FF773B" />
      <span className="font-black text-lg tracking-tight text-foreground">
        Manara<span className="text-[#FF773B]">.tech</span>
      </span>
    </div>
  );
}
