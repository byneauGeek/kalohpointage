"use client";
import { motion } from "framer-motion";

export function StatCard({
  label,
  value,
  icon,
  tone = "navy",
  delay = 0,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone?: "navy" | "gold" | "warning";
  delay?: number;
}) {
  const toneClasses = {
    navy: "bg-[var(--color-navy-900)]/5 text-[var(--color-navy-900)]",
    gold: "bg-[var(--color-gold-300)]/25 text-[var(--color-gold-600)]",
    warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className="rounded-2xl border border-[var(--color-navy-900)]/8 bg-white p-5 shadow-[0_1px_2px_rgba(16,23,42,0.04),0_8px_24px_-12px_rgba(16,23,42,0.1)]"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-navy-900)]/55">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClasses}`}>{icon}</div>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold text-[var(--color-navy-900)]">{value}</p>
    </motion.div>
  );
}
