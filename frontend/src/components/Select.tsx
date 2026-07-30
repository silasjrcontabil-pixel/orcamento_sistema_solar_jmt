import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, className = '', id, children, ...props }, ref) => {
    const selectId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="field-label block">
            {label}
            {props.required && <span className="text-primary"> *</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`field-select ${error ? '!border-danger' : ''} ${className}`}
          {...props}
        >
          {children}
        </select>
        {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';
