const STATUT_STYLES: Record<string, string> = {
  PLANIFIE: "bg-slate-100 text-slate-600",
  ARRIVEE_ENREGISTREE: "bg-sky-50 text-sky-700",
  EN_COURS: "bg-sky-50 text-sky-700",
  FIN_ENREGISTREE: "bg-amber-50 text-amber-700",
  VALIDE: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  A_CONTROLER: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  NON_VALIDE: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
  INCOMPLET: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  ABSENT: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
  CLOTURE: "bg-slate-100 text-slate-500",
  OUVERTE: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  CLOTUREE: "bg-slate-100 text-slate-500",
  OFFICIEL: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  REMPLACE: "bg-slate-100 text-slate-500",
};

const STATUT_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  ARRIVEE_ENREGISTREE: "Arrivée enregistrée",
  EN_COURS: "En cours",
  FIN_ENREGISTREE: "Fin enregistrée",
  VALIDE: "Validé",
  A_CONTROLER: "À contrôler",
  NON_VALIDE: "Non validé",
  INCOMPLET: "Incomplet",
  ABSENT: "Absent",
  CLOTURE: "Clôturé",
  OUVERTE: "Ouverte",
  CLOTUREE: "Clôturée",
  OFFICIEL: "Officiel",
  REMPLACE: "Remplacé",
};

export function StatutBadge({ statut }: { statut: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUT_STYLES[statut] ?? "bg-slate-100 text-slate-600"}`}>
      {STATUT_LABELS[statut] ?? statut}
    </span>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "gold" | "success" | "danger" }) {
  const styles = {
    neutral: "bg-slate-100 text-slate-600",
    gold: "bg-[var(--color-gold-300)]/30 text-[var(--color-gold-600)]",
    success: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
    danger: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>{children}</span>;
}
