import { Button, cn } from '@extension/ui';

interface StatusBadgeProps {
  state: boolean;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export const StatusBadge = ({ state, icon, label, onClick, className, ariaLabel, disabled }: StatusBadgeProps) => {
  return (
    <Button
      variant="ghost"
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      aria-pressed={state}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium shadow-none transition-colors',
        state
          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50/80'
          : 'bg-rose-50 text-rose-700 hover:bg-rose-50/80',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}>
      <span className="inline-flex h-3.5 w-3.5 items-center justify-center">{icon}</span>
      <span>{label}</span>
    </Button>
  );
};
