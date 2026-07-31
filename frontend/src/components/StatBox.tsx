import type { ReactNode } from 'react';

export function StatBox({
  label,
  value,
  suffix,
  icon,
  hint,
  valueClassName = 'text-primary',
}: {
  label: string;
  value: ReactNode;
  suffix?: string;
  icon?: ReactNode;
  hint?: ReactNode;
  /** Cor do valor principal — default dourado; use para destacar bom/ruim (ex. text-success/text-danger). */
  valueClassName?: string;
}) {
  return (
    <div className="card card-gold-top p-5">
      <div className="flex items-center justify-between">
        <span className="field-label">{label}</span>
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={`font-display text-3xl font-extrabold ${valueClassName}`}>{value}</span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
