export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-navy-900)]/8 bg-white shadow-[0_1px_2px_rgba(16,23,42,0.04)]">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-[var(--color-navy-900)]/8 bg-[var(--color-navy-900)]/[0.03] text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-900)]/50">
        {children}
      </tr>
    </thead>
  );
}

export function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-semibold ${className}`}>{children}</th>;
}

export function Tr({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <tr className={`border-b border-[var(--color-navy-900)]/6 last:border-0 transition-colors hover:bg-[var(--color-navy-900)]/[0.02] ${className}`}>
      {children}
    </tr>
  );
}

export function Td({
  children,
  className = "",
  title,
}: {
  children?: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td className={`px-4 py-3 text-[var(--color-navy-900)]/80 ${className}`} title={title}>
      {children}
    </td>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-[var(--color-navy-900)]/40">{children}</p>;
}
