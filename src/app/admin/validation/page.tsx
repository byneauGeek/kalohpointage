import { ShieldCheck } from "lucide-react";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMinutes } from "@/lib/heureUtils";
import { appliquerReglesAction, resoudreAnomalieAction } from "./actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

const MESSAGES_ERREUR: Record<string, string> = {
  pas_de_regle: "Aucune règle de validation active - configurez les paramètres d'abord.",
  motif: "Le motif est obligatoire.",
};

export default async function PageValidation({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; succes?: string }>;
}) {
  await exigerRole(["ADMIN"]);
  const { erreur, succes } = await searchParams;
  const [nbValides, nbAControler] = succes && succes.includes("-") ? succes.split("-").map(Number) : [null, null];

  const aControler = await prisma.cours.findMany({
    where: { statut: "A_CONTROLER" },
    include: { professeur: true, classe: true },
    orderBy: { dateCours: "asc" },
  });

  return (
    <div>
      <PageHeader title="Validation" description="Application des règles et traitement des anomalies" />

      {nbValides !== null && (
        <p className="mb-4 max-w-3xl rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-sm text-[var(--color-success)]">
          Règles appliquées : {nbValides} cours validé(s), {nbAControler} à contrôler.
        </p>
      )}
      {succes === "anomalie_traitee" && (
        <p className="mb-4 max-w-3xl rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-sm text-[var(--color-success)]">
          Anomalie traitée.
        </p>
      )}
      {erreur && MESSAGES_ERREUR[erreur] && (
        <p className="mb-4 max-w-3xl rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {MESSAGES_ERREUR[erreur]}
        </p>
      )}

      <Reveal>
        <form action={appliquerReglesAction} className="mb-8">
          <Button type="submit">
            <ShieldCheck size={16} />
            Appliquer les règles de validation
          </Button>
        </form>
      </Reveal>

      <h2 className="mb-3 text-sm font-semibold text-[var(--color-navy-900)]">
        Anomalies à traiter ({aControler.length})
      </h2>
      <div className="flex max-w-3xl flex-col gap-3">
        {aControler.map((c, i) => (
          <Reveal key={c.id} delay={i * 0.03}>
            <Card>
              <form action={resoudreAnomalieAction}>
                <input type="hidden" name="coursId" value={c.id} />
                <p className="mb-3 text-sm text-[var(--color-navy-900)]/80">
                  {c.dateCours.toISOString().slice(0, 10)} — <span className="font-medium">{c.professeur.nom} {c.professeur.prenom}</span> — {c.classe.nomClasse} —
                  prévu {formatMinutes(c.heureDebutPrevueMin)}-{formatMinutes(c.heureFinPrevueMin)}
                  {" — "}écart arrivée {c.ecartArriveeMin ?? "?"} min, écart départ {c.ecartDepartMin ?? "?"} min
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Select name="decision" className="w-auto">
                    <option value="VALIDER">Valider</option>
                    <option value="REJETER">Rejeter (non validé)</option>
                  </Select>
                  <Input name="dureeValideeMin" type="number" placeholder="Durée validée (min)" className="w-44" />
                  <Input name="motif" required placeholder="Motif (obligatoire)" className="flex-1 min-w-[160px]" />
                  <Button type="submit" variant="outline" size="sm">Enregistrer</Button>
                </div>
              </form>
            </Card>
          </Reveal>
        ))}
        {aControler.length === 0 && (
          <p className="text-sm text-[var(--color-navy-900)]/40">Aucune anomalie en attente.</p>
        )}
      </div>
    </div>
  );
}
