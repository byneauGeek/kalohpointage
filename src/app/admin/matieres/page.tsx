import { BookPlus, Save } from "lucide-react";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { creerMatiere, enregistrerModeComptageSimultane } from "./actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";

const MESSAGES_ERREUR: Record<string, string> = {
  vide: "Saisissez un nom de matière.",
  existe_deja: "Cette matière existe déjà.",
  invalide: "Matière introuvable.",
};
const MESSAGES_SUCCES: Record<string, string> = {
  creee: "Matière créée.",
  mode_enregistre: "Mode de comptage enregistré.",
};

export default async function PageMatieres({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; succes?: string }>;
}) {
  const session = await exigerRole(["ADMIN", "COMPTABLE"]);
  const { erreur, succes } = await searchParams;
  const matieres = await prisma.matiere.findMany({ orderBy: { libelle: "asc" } });

  return (
    <div>
      <PageHeader title="Matières" description="Référentiel des enseignements dispensés" />
      {succes && MESSAGES_SUCCES[succes] && (
        <p className="mb-4 max-w-3xl rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-sm text-[var(--color-success)]">
          {MESSAGES_SUCCES[succes]}
        </p>
      )}
      {erreur && MESSAGES_ERREUR[erreur] && (
        <p className="mb-4 max-w-3xl rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {MESSAGES_ERREUR[erreur]}
        </p>
      )}
      {session.role === "ADMIN" && (
        <Reveal>
          <form action={creerMatiere} className="mb-8 flex max-w-md gap-2">
            <Input name="libelle" placeholder="Nouvelle matière" required />
            <Button type="submit">
              <BookPlus size={16} />
              Ajouter
            </Button>
          </form>
        </Reveal>
      )}
      <Reveal delay={0.08}>
        <Card className="max-w-3xl">
          <p className="mb-4 text-sm text-[var(--color-navy-900)]/55">
            Un professeur peut enseigner cette matière à plusieurs classes en même temps sur un même créneau
            (ex. 3e1, 3e2 et 3e3 en simultané). Choisissez, pour chaque matière, comment compter ces heures
            dans la comptabilisation et la fiche d&apos;émargement.
          </p>
          <div className="flex flex-col divide-y divide-[var(--color-navy-900)]/10">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 pb-2 text-xs font-medium text-[var(--color-navy-900)]/50">
              <span>Matière</span>
              <span>Classes simultanées</span>
              <span></span>
            </div>
            {matieres.map((m) => (
              <form
                key={m.id}
                action={enregistrerModeComptageSimultane}
                className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 py-2"
              >
                <input type="hidden" name="matiereId" value={m.id} />
                <span className="text-sm text-[var(--color-navy-900)]">{m.libelle}</span>
                {session.role === "ADMIN" ? (
                  <Select name="modeComptageSimultane" defaultValue={m.modeComptageSimultane}>
                    <option value="PAR_CLASSE">Par classe (chaque classe compte séparément)</option>
                    <option value="UNE_FOIS_PAR_CRENEAU">Une seule fois par créneau</option>
                  </Select>
                ) : (
                  <span className="text-sm text-[var(--color-navy-900)]/70">
                    {m.modeComptageSimultane === "UNE_FOIS_PAR_CRENEAU" ? "Une seule fois par créneau" : "Par classe"}
                  </span>
                )}
                {session.role === "ADMIN" && (
                  <Button type="submit" variant="outline" size="sm" className="!px-2 !py-1">
                    <Save size={13} />
                  </Button>
                )}
              </form>
            ))}
            {matieres.length === 0 && <p className="py-2 text-sm text-[var(--color-navy-900)]/40">Aucune matière enregistrée.</p>}
          </div>
        </Card>
      </Reveal>
    </div>
  );
}
