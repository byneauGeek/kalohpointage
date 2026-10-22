import { Crest } from "./Crest";

export function BrandMark({
  size = "md",
  dark = false,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  dark?: boolean;
  className?: string;
}) {
  const dims = { sm: 28, md: 40, lg: 56 }[size];
  const titleClass = { sm: "text-sm", md: "text-lg", lg: "text-2xl" }[size];
  const subClass = { sm: "text-[9px]", md: "text-[11px]", lg: "text-xs" }[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Crest size={dims} />
      <div className="leading-tight">
        <p className={`font-display font-semibold tracking-wide ${titleClass} ${dark ? "text-white" : "text-[var(--color-navy-900)]"}`}>
          Collège Privé Kaloh
        </p>
        <p className={`${subClass} uppercase tracking-[0.2em] ${dark ? "text-[var(--color-gold-300)]" : "text-[var(--color-gold-600)]"}`}>
          Gestion des heures
        </p>
      </div>
    </div>
  );
}
