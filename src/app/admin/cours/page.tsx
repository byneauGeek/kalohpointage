import { RefreshCcw, Trash2 } from "lucide-react";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMinutes } from "@/lib/heureUtils";
import { effectuerRapprochementAction, supprimerCoursAction } from "./actions";
import GenererCoursForm from "./GenererCoursForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { StatutBadge } from "@/components/ui/Badge";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/Table";
import { Reveal } from "@/components/ui/Reveal";

const MESSAGES_ERREUR_SUPPRESSION: Record<string, string> = {
  confirmation: 'Suppression annulée : vous devez taper exactement "CONFIRMER".',
  date: "Dates invalides.",
  ordre: "La date de fin doit être postérieure ou égale à la date de début.",
};

export default async function PageCours({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; erreurSuppression?: string; succesSuppression?: string }>;
}) {
  const session = await exigerRole(["ADMIN", "COMPTABLE"]);
  const { statut, erreurSuppression, succesSuppression } = await searchParams;

  const cours = await prisma.cours.findMany({
    where: statut ? { statut: statut as never } : undefined,
    include: { professeur: true, classe: true, matiere: true },
    orderBy: { dateCours: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader title="Cours" description="Occurrences générées depuis l'emploi du temps" />

      {session.role === "ADMIN" && (
        <Reveal>
          <div className="mb-6 flex flex-wrap gap-4">
            <GenererCoursForm />

            <Card padded className="flex items-end">
              <form action={effectuerRapprochementAction}>
                <Button type="submit" variant="outline">
                  <RefreshCcw size={16} />
                  Rapprochement
                </Button>
              </form>
            </Card>
          </div>
        </Reveal>
      )}

      {session.role === "ADMIN" && (
        <Reveal delay={0.04}>
          <Card padded className="mb-6 max-w-2xl">
            <CardTitle>Supprimer des cours</CardTitle>
            <p className="mb-3 text-sm text-[var(--color-navy-900)]/55">
              Supprime les cours non validés (générés par erreur, doublons, essai) sur une plage de dates. Les cours
              déjà validés (pris en compte dans la paie) ne sont jamais supprimés.
            </p>

            {succesSuppression && (
              <p className="mb-3 rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-sm text-[var(--color-success)]">
                {succesSuppression} cours non validé(s) supprimé(s).
              </p>
            )}
            {erreurSuppression && MESSAGES_ERREUR_SUPPRESSION[erreurSuppression] && (
              <p className="mb-3 rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
                {MESSAGES_ERREUR_SUPPRESSION[erreurSuppression]}
              </p>
            )}

            <form action={supprimerCoursAction} className="flex flex-wrap items-end gap-2">
              <div>
                <Label>Du</Label>
                <Input type="date" name="dateDebut" required />
              </div>
              <div>
                <Label>Au</Label>
                <Input type="date" name="dateFin" required />
              </div>
              <div>
                <Label>Tapez CONFIRMER</Label>
                <Input name="confirmation" placeholder="CONFIRMER" required className="w-40" />
              </div>
              <Button type="submit" variant="outline" size="sm" className="text-[var(--color-danger)]">
                <Trash2 size={14} />
                Supprimer
              </Button>
            </form>
          </Card>
        </Reveal>
      )}

      <Reveal delay={0.08}>
        <Table>
          <Thead>
            <Th>Date</Th>
            <Th>Horaire prévu</Th>
            <Th>Professeur</Th>
            <Th>Classe / Matière</Th>
            <Th>Statut</Th>
            <Th>Durée validée</Th>
          </Thead>
          <tbody>
            {cours.map((c) => (
              <Tr key={c.id}>
                <Td>{c.dateCours.toISOString().slice(0, 10)}</Td>
                <Td className="font-mono text-xs">{formatMinutes(c.heureDebutPrevueMin)} - {formatMinutes(c.heureFinPrevueMin)}</Td>
                <Td className="font-medium text-[var(--color-navy-900)]">{c.professeur.nom} {c.professeur.prenom}</Td>
                <Td>{c.classe.nomClasse} / {c.matiere.libelle}</Td>
                <Td><StatutBadge statut={c.statut} /></Td>
                <Td>{c.dureeValideeMin != null ? `${c.dureeValideeMin} min` : "—"}</Td>
              </Tr>
            ))}
            {cours.length === 0 && (
              <tr><td colSpan={6}><EmptyState>Aucun cours sur ce filtre.</EmptyState></td></tr>
            )}
          </tbody>
        </Table>
      </Reveal>
    </div>
  );
}
