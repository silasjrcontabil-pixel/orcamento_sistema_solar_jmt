import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suffix?: ReactNode;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, suffix, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="field-label block">
            {label}
            {props.required && <span className="text-primary"> *</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={`field-input ${suffix ? 'pr-12' : ''} ${error ? '!border-danger' : ''} ${className}`}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
