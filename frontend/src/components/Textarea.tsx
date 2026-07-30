import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const areaId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={areaId} className="field-label block">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={areaId}
          className={`field-input resize-y min-h-[80px] ${error ? '!border-danger' : ''} ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
