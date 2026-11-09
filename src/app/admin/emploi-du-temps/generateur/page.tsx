import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import PeriodesEviteesForm from "./PeriodesEviteesForm";
import GenerateurPanel from "./GenerateurPanel";
import { enregistrerReglesGenerateur } from "./actions";
import { CLE_MAX_SEANCES_JOUR, CLE_MAX_PERIODES_JOUR_PROF } from "@/lib/parametresGenerateur";

export default async function PageGenerateur() {
  await exigerRole(["ADMIN"]);

  const [periodes, affectations, professeursAvecIndispo, matieres, periodesEvitees, paramMaxSeances, paramMaxPeriodes] =
    await Promise.all([
      prisma.periodeGrille.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } }),
      prisma.affectationEnseignement.count({ where: { actif: true } }),
      prisma.indisponibiliteProfesseur.findMany({ distinct: ["professeurId"], select: { professeurId: true } }),
      prisma.matiere.findMany({ where: { actif: true }, orderBy: { libelle: "asc" } }),
      prisma.matierePeriodeEvitee.findMany(),
      prisma.parametre.findUnique({ where: { cle: CLE_MAX_SEANCES_JOUR } }),
      prisma.parametre.findUnique({ where: { cle: CLE_MAX_PERIODES_JOUR_PROF } }),
    ]);

  const eviteesParMatiere: Record<number, number[]> = {};
  for (const pe of periodesEvitees) {
    (eviteesParMatiere[pe.matiereId] ??= []).push(pe.periodeGrilleId);
  }

  return (
    <div>
      <PageHeader
        title="Générateur automatique"
        description="Place automatiquement les séances de chaque affectation dans la semaine, sans conflit de professeur ni de classe."
      />

      <Reveal>
        <Card className="mb-6 max-w-2xl">
          <CardTitle>État des prérequis</CardTitle>
          <ul className="text-sm text-[var(--color-navy-900)]/70">
            <li>{periodes.length} période(s) de grille horaire active(s)</li>
            <li>{affectations} affectation(s) enseignement active(s)</li>
            <li>{professeursAvecIndispo.length} professeur(s) avec des indisponibilités déclarées</li>
          </ul>
          {(periodes.length === 0 || affectations === 0) && (
            <p className="mt-3 rounded-lg bg-[var(--color-warning-bg)] px-3 py-2 text-sm text-[var(--color-warning)]">
              Configurez d&apos;abord la grille horaire et les affectations avant de générer.
            </p>
          )}
        </Card>
      </Reveal>

      <Reveal delay={0.06}>
        <Card className="mb-6 max-w-2xl">
          <CardTitle>Règles de placement</CardTitle>
          <form action={enregistrerReglesGenerateur} className="mb-6 flex flex-wrap items-end gap-3">
            <div>
              <Label>Max séances identiques / jour (par classe)</Label>
              <Input name="maxSeancesJour" type="number" min={1} max={9} defaultValue={paramMaxSeances?.valeur ?? "2"} className="w-40" />
            </div>
            <div>
              <Label>Max périodes / jour (par professeur)</Label>
              <Input name="maxPeriodesJour" type="number" min={1} max={9} defaultValue={paramMaxPeriodes?.valeur ?? "6"} className="w-40" />
            </div>
            <Button type="submit" size="sm">Enregistrer</Button>
          </form>

          <PeriodesEviteesForm
            matieres={matieres.map((m) => ({ id: m.id, label: m.libelle }))}
            periodes={periodes.map((p) => ({ id: p.id, libelle: p.libelle }))}
            eviteesParMatiere={eviteesParMatiere}
          />
        </Card>
      </Reveal>

      <Reveal delay={0.12}>
        <Card className="max-w-5xl">
          <CardTitle>Génération</CardTitle>
          <p className="mb-4 text-sm text-[var(--color-navy-900)]/55">
            Le résultat s&apos;affiche d&apos;abord en aperçu, à valider avant d&apos;écrire quoi que ce soit dans
            l&apos;emploi du temps réel.
          </p>
          <GenerateurPanel periodes={periodes.map((p) => ({ id: p.id, ordre: p.ordre, libelle: p.libelle }))} />
        </Card>
      </Reveal>
    </div>
  );
}
