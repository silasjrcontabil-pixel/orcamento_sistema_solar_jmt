import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', loading, className = '', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`${VARIANT_CLASS[variant]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
