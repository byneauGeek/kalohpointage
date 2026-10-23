import { RefreshCcw } from "lucide-react";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMinutes } from "@/lib/heureUtils";
import { effectuerRapprochementAction } from "./actions";
import GenererCoursForm from "./GenererCoursForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatutBadge } from "@/components/ui/Badge";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/Table";
import { Reveal } from "@/components/ui/Reveal";

export default async function PageCours({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const session = await exigerRole(["ADMIN", "COMPTABLE"]);
  const { statut } = await searchParams;

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
