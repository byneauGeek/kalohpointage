"use client";
import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/** Limite d'erreur globale (segment racine) - capte aussi les erreurs qui
 * surviennent dans un layout (ex. base de donnees injoignable dans
 * admin/layout.tsx), que la limite plus ciblee admin/error.tsx ne peut pas
 * intercepter puisqu'elle est rendue SOUS ce layout. */
export default function ErreurGlobale({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[var(--background)] p-6">
      <Card className="w-full max-w-md !p-8 text-center">
        <div className="mb-6 flex justify-center">
          <BrandMark size="md" />
        </div>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-danger-bg)]">
          <AlertTriangle size={22} className="text-[var(--color-danger)]" />
        </div>
        <h1 className="mb-2 text-base font-semibold text-[var(--color-navy-900)]">Une erreur est survenue</h1>
        <p className="mb-6 text-sm text-[var(--color-navy-900)]/60">
          Quelque chose s&apos;est mal passé de notre côté. Si le problème persiste, contactez l&apos;administrateur
          système en précisant l&apos;heure de l&apos;incident.
        </p>
        <Button onClick={reset} variant="gold" className="w-full">
          <RotateCcw size={16} />
          Réessayer
        </Button>
      </Card>
    </div>
  );
}
