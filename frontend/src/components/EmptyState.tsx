import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 px-6 text-center">
      <h3 className="font-display font-bold text-foreground">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action}
    </div>
  );
}
