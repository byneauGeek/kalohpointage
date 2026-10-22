"use client";
import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

type Variant = "primary" | "gold" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-[var(--color-navy-800)] text-white hover:bg-[var(--color-navy-700)] shadow-sm",
  gold: "bg-[var(--color-gold-500)] text-[var(--color-navy-950)] hover:bg-[var(--color-gold-400)] shadow-sm font-semibold",
  outline: "border border-[var(--color-navy-700)]/30 text-[var(--color-navy-800)] bg-white hover:bg-[var(--color-navy-900)]/5",
  ghost: "text-[var(--color-navy-800)] hover:bg-[var(--color-navy-900)]/5",
  danger: "bg-[var(--color-danger)] text-white hover:brightness-110 shadow-sm",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-md gap-1.5",
  md: "px-4 py-2.5 text-sm rounded-lg gap-2",
  lg: "px-6 py-3.5 text-base rounded-xl gap-2.5",
};

type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: Variant;
  size?: Size;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={disabled ? undefined : { scale: 1.015 }}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        disabled={disabled}
        className={`inline-flex items-center justify-center font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
