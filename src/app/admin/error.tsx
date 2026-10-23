"use client";
import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/** Limite d'erreur du segment /admin : garde la barre laterale (definie dans
 * le layout parent, qui reste monte) visible pendant qu'une erreur de page
 * est affichee - evite de perdre toute navigation en cas d'incident
 * ponctuel sur un seul ecran. */
export default function ErreurAdmin({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="max-w-md !p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-danger-bg)]">
        <AlertTriangle size={22} className="text-[var(--color-danger)]" />
      </div>
      <h1 className="mb-2 text-base font-semibold text-[var(--color-navy-900)]">Cette page a rencontré une erreur</h1>
      <p className="mb-6 text-sm text-[var(--color-navy-900)]/60">
        Vous pouvez réessayer, ou utiliser le menu à gauche pour aller ailleurs. Si le problème persiste,
        contactez l&apos;administrateur système.
      </p>
      <Button onClick={reset} variant="gold" className="w-full">
        <RotateCcw size={16} />
        Réessayer
      </Button>
    </Card>
  );
}
