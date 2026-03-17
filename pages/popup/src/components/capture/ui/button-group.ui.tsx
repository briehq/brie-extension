import { cn } from '@extension/ui';

interface Option<T extends string> {
  value: T;
  label: string;
}
interface ButtonGroupProps<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (next: T) => void;
  ariaLabel: string;
  className?: string;
}

export const ButtonGroup = <T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: ButtonGroupProps<T>) => {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('bg-muted/80 inline-flex items-center rounded-lg p-1', className)}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-7 select-none rounded-md px-4 text-xs transition-colors',
              'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              active
                ? 'bg-background text-foreground ring-border/70 shadow-sm ring-1'
                : 'text-muted-foreground hover:text-foreground',
            )}>
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
