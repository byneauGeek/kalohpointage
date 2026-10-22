export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--color-navy-900)]/8 bg-white shadow-[0_1px_2px_rgba(16,23,42,0.04),0_8px_24px_-12px_rgba(16,23,42,0.12)] ${padded ? "p-5" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`mb-3 text-sm font-semibold text-[var(--color-navy-900)] ${className}`}>{children}</h2>;
}
