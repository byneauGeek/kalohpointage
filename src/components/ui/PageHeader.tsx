export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-fade-in-up">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-navy-900)]">{title}</h1>
        {description && <p className="mt-1 text-sm text-[var(--color-navy-900)]/55">{description}</p>}
      </div>
      {action}
    </div>
  );
}
