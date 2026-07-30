import type { ReactNode } from 'react';

export function StatBox({
  label,
  value,
  suffix,
  icon,
}: {
  label: string;
  value: ReactNode;
  suffix?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="card card-gold-top p-5">
      <div className="flex items-center justify-between">
        <span className="field-label">{label}</span>
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-display text-3xl font-extrabold text-primary">{value}</span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
