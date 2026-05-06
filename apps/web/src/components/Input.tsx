import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <label htmlFor={inputId} className="block">
        {label && (
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-ink-200">
            {label}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          className={cn(
            "w-full rounded-xl border border-ink-600/60 bg-ink-800/70 px-4 py-2.5 text-[15px] text-ink-50 placeholder:text-ink-300 outline-none transition",
            "focus:border-brand-500/60 focus:bg-ink-800 focus:ring-2 focus:ring-brand-600/25",
            error && "border-brand-500/70 focus:border-brand-500 focus:ring-brand-500/30",
            className,
          )}
          {...props}
        />
        {error ? (
          <span className="mt-1.5 block text-xs text-brand-300">{error}</span>
        ) : hint ? (
          <span className="mt-1.5 block text-xs text-ink-300">{hint}</span>
        ) : null}
      </label>
    );
  },
);
Input.displayName = "Input";
