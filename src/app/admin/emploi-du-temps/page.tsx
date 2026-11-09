import { Pencil, Wand2, CalendarRange, Users, Ban } from "lucide-react";
import Link from "next/link";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMinutes } from "@/lib/heureUtils";
import { desactiverCreneau } from "./actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import FormulaireImport from "./ImportForm";
import ProfesseurSelector from "./ProfesseurSelector";

const JOURS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const MESSAGES_SUCCES: Record<string, string> = {
  modifie: "Créneau modifié avec succès.",
  desactive: "Créneau désactivé.",
};

export default async function PageEmploiDuTemps({
  searchParams,
}: {
  searchParams: Promise<{ succes?: string }>;
}) {
  const session = await exigerRole(["ADMIN", "COMPTABLE"]);
  const { succes } = await searchParams;

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

      {succes && MESSAGES_SUCCES[succes] && (
        <p className="mb-4 rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-sm text-[var(--color-success)]">
          {MESSAGES_SUCCES[succes]}
        </p>
      )}

      {session.role === "ADMIN" && (
        <Reveal>
          <Card className="mb-6 max-w-xl">
            <CardTitle>Modifier l&apos;emploi du temps d&apos;un professeur</CardTitle>
            <p className="mb-3 text-sm text-[var(--color-navy-900)]/55">
              Tous les créneaux d&apos;un professeur sur un seul écran, modifiables en une fois.
            </p>
            <ProfesseurSelector professeurs={professeurs.map((p) => ({ id: p.id, label: `${p.nom} ${p.prenom} (${p.matricule})` }))} />
          </Card>
        </Reveal>
      )}

      {session.role === "ADMIN" && (
        <Reveal delay={0.02}>
          <Card className="mb-6 max-w-2xl">
            <CardTitle>Générateur automatique</CardTitle>
            <p className="mb-3 text-sm text-[var(--color-navy-900)]/55">
              Configure qui enseigne quoi, les indisponibilités et la grille horaire, puis génère l&apos;emploi du
              temps sans conflit.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/emploi-du-temps/grille-horaire" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-navy-900)]/15 px-3 py-1.5 text-sm font-medium text-[var(--color-navy-800)] hover:bg-[var(--color-navy-900)]/5">
                <CalendarRange size={15} />
                Grille horaire
              </Link>
              <Link href="/admin/emploi-du-temps/affectations" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-navy-900)]/15 px-3 py-1.5 text-sm font-medium text-[var(--color-navy-800)] hover:bg-[var(--color-navy-900)]/5">
                <Users size={15} />
                Affectations
              </Link>
              <Link href="/admin/emploi-du-temps/indisponibilites" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-navy-900)]/15 px-3 py-1.5 text-sm font-medium text-[var(--color-navy-800)] hover:bg-[var(--color-navy-900)]/5">
                <Ban size={15} />
                Indisponibilités
              </Link>
              <Link href="/admin/emploi-du-temps/generateur" className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-navy-800)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-navy-700)]">
                <Wand2 size={15} />
                Générer
              </Link>
            </div>
          </Card>
        </Reveal>
      )}

      {session.role === "ADMIN" && (
        <Reveal delay={0.04}>
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
            {session.role === "ADMIN" && <Th></Th>}
          </Thead>
          <tbody>
            {emplois.map((e) => (
              <Tr key={e.id}>
                <Td>{JOURS[e.jourSemaine]}</Td>
                <Td className="font-mono text-xs">{formatMinutes(e.heureDebutMin)} - {formatMinutes(e.heureFinMin)}</Td>
                <Td className="font-medium text-[var(--color-navy-900)]">{e.professeur.nom} {e.professeur.prenom}</Td>
                <Td>{e.classe.nomClasse}</Td>
                <Td>{e.matiere.libelle}</Td>
                {session.role === "ADMIN" && (
                  <Td>
                    <div className="flex items-center gap-2">
                      <a href={`/admin/emploi-du-temps/professeur/${e.professeurId}`} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-navy-800)] hover:underline">
                        <Pencil size={13} />
                        Modifier
                      </a>
                      <form action={desactiverCreneau}>
                        <input type="hidden" name="creneauId" value={e.id} />
                        <Button type="submit" variant="outline" size="sm" className="!px-2 !py-1 text-xs text-[var(--color-danger)]">
                          Désactiver
                        </Button>
                      </form>
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
            {emplois.length === 0 && (
              <tr><td colSpan={session.role === "ADMIN" ? 6 : 5}><EmptyState>Aucun créneau importé.</EmptyState></td></tr>
            )}
          </tbody>
        </Table>
      </Reveal>
    </div>
  );
}
