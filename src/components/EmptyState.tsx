import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center min-h-[300px]",
        "bg-card rounded-xl border shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-primary/10">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <h3 className="mb-2 text-xl font-bold text-foreground">{title}</h3>
      <p className="mb-6 text-sm text-muted-foreground max-w-[400px]">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
