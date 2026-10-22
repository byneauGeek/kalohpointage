import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMinutes } from "@/lib/heureUtils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/Table";
import { Reveal } from "@/components/ui/Reveal";
import FormulaireImport from "./ImportForm";

const JOURS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default async function PageEmploiDuTemps() {
  const session = await exigerRole(["ADMIN", "COMPTABLE"]);

  const [professeurs, matieres, emplois] = await Promise.all([
    prisma.professeur.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
    prisma.matiere.findMany({ where: { actif: true }, orderBy: { libelle: "asc" } }),
    prisma.emploiDuTemps.findMany({
      where: { actif: true },
      include: { professeur: true, classe: true, matiere: true },
      orderBy: [{ jourSemaine: "asc" }, { heureDebutMin: "asc" }],
      take: 200,
    }),
  ]);

  return (
    <div>
      <PageHeader title="Emploi du temps" description="Créneaux récurrents, import Excel par professeur" />

      {session.role === "ADMIN" && (
        <Reveal>
          <FormulaireImport
            professeurs={professeurs.map((p) => ({ id: p.id, label: `${p.nom} ${p.prenom} (${p.matricule})` }))}
            matieres={matieres.map((m) => ({ id: m.id, label: m.libelle }))}
          />
        </Reveal>
      )}

      <Reveal delay={0.08}>
        <Table>
          <Thead>
            <Th>Jour</Th>
            <Th>Horaire</Th>
            <Th>Professeur</Th>
            <Th>Classe</Th>
            <Th>Matière</Th>
          </Thead>
          <tbody>
            {emplois.map((e) => (
              <Tr key={e.id}>
                <Td>{JOURS[e.jourSemaine]}</Td>
                <Td className="font-mono text-xs">{formatMinutes(e.heureDebutMin)} - {formatMinutes(e.heureFinMin)}</Td>
                <Td className="font-medium text-[var(--color-navy-900)]">{e.professeur.nom} {e.professeur.prenom}</Td>
                <Td>{e.classe.nomClasse}</Td>
                <Td>{e.matiere.libelle}</Td>
              </Tr>
            ))}
            {emplois.length === 0 && (
              <tr><td colSpan={5}><EmptyState>Aucun créneau importé.</EmptyState></td></tr>
            )}
          </tbody>
        </Table>
      </Reveal>
    </div>
  );
}
