import React from 'react';
import { motion } from 'framer-motion';

// Subtle background for hero sections
export const AnimatedHeroBackground = React.forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref} className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 subtle-grid opacity-30" />
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/[0.03] blur-[100px]" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-accent/[0.03] blur-[100px]" />
    </div>
  );
});
AnimatedHeroBackground.displayName = 'AnimatedHeroBackground';

// Dashboard background — warm coral-pink ambient
export const AnimatedDashboardBackground = React.forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref} className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Top-right teal glow */}
      <div className="absolute -top-20 -right-20 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[130px]" />
      {/* Bottom-left coral glow */}
      <div className="absolute -bottom-32 -left-20 w-[500px] h-[500px] rounded-full bg-accent/[0.03] blur-[120px]" />
      {/* Center blend */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-[140px]"
        style={{ background: "radial-gradient(ellipse, hsl(var(--primary) / 0.03) 0%, hsl(var(--accent) / 0.015) 60%, transparent 100%)" }}
      />
    </div>
  );
});
AnimatedDashboardBackground.displayName = 'AnimatedDashboardBackground';

// Particle System — very subtle dots
export const ParticleSystem = React.forwardRef<HTMLDivElement, { count?: number; color?: string }>(
  ({ count = 8 }, ref) => {
    return (
      <div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(count)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -50 - Math.random() * 30],
              opacity: [0, 0.3, 0],
            }}
            transition={{
              duration: 6 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 4,
              ease: "easeOut",
            }}
          />
        ))}
      </div>
    );
  }
);
ParticleSystem.displayName = 'ParticleSystem';

// Card with subtle hover
export function HologramCard({
  children,
  className = "",
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <motion.div
      className={`bg-card border border-border rounded-xl relative overflow-hidden ${className}`}
      whileHover={{ y: -2, boxShadow: "0 8px 25px hsl(222 20% 14% / 0.08)" }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Button
export function NeonButton({
  children,
  variant = "primary",
  className = "",
  onClick,
  ...props
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "accent";
  className?: string;
  onClick?: () => void;
  [key: string]: any;
}) {
  const styles = {
    primary: "gradient-primary text-primary-foreground shadow-sm hover:shadow-md",
    secondary: "bg-secondary border border-border text-secondary-foreground hover:bg-muted",
    accent: "bg-accent text-accent-foreground shadow-sm hover:shadow-md",
  };

  return (
    <motion.button
      className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${styles[variant]} ${className}`}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// Text wrapper
export function GlitchText({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: string;
}) {
  return <div className={className}>{children}</div>;
}

// Loading Spinner
export function CyberpunkLoader({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = { sm: "w-8 h-8", md: "w-12 h-12", lg: "w-16 h-16" };
  return (
    <div className={`relative ${s[size]}`}>
      <motion.div
        className={`absolute inset-0 border-2 border-primary/20 border-t-primary rounded-full ${s[size]}`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
