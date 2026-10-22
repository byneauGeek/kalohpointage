import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

const baseInputClass =
  "w-full rounded-lg border border-[var(--color-navy-900)]/15 bg-white px-3 py-2 text-sm text-[var(--color-navy-900)] placeholder:text-[var(--color-navy-900)]/35 transition-shadow focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-400)]/60 focus:border-[var(--color-gold-500)]";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => <input ref={ref} className={`${baseInputClass} ${className}`} {...props} />
);
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", ...props }, ref) => <select ref={ref} className={`${baseInputClass} ${className}`} {...props} />
);
Select.displayName = "Select";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => <textarea ref={ref} className={`${baseInputClass} ${className}`} {...props} />
);
Textarea.displayName = "Textarea";

export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <label className={`mb-1 block text-xs font-medium text-[var(--color-navy-900)]/60 ${className}`}>{children}</label>;
}
