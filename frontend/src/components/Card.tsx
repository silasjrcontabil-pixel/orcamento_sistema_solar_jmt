import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  goldTop?: boolean;
  actions?: ReactNode;
}

export function Card({ title, subtitle, children, className = '', goldTop = true, actions }: CardProps) {
  return (
    <div className={`card ${goldTop ? 'card-gold-top' : ''} ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 px-6 pt-6">
          <div>
            {title && <h3 className="font-display font-bold text-foreground mb-1">{title}</h3>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={title || actions ? 'p-6 pt-4' : 'p-6'}>{children}</div>
    </div>
  );
}
