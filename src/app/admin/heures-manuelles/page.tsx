import { Trash2 } from "lucide-react";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { supprimerSaisieManuelle } from "./actions";
import { PeriodeSelector } from "./PeriodeSelector";
import SaisieManuelleForm from "./SaisieManuelleForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/Table";
import { Reveal } from "@/components/ui/Reveal";

const JOURS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function formatHeureHorloge(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}h${String(min % 60).padStart(2, "0")}`;
}

export default async function PageHeuresManuelles({
  searchParams,
}: {
  searchParams: Promise<{ periodeId?: string; succes?: string }>;
}) {
  await exigerRole(["ADMIN"]);
  const { periodeId, succes } = await searchParams;

  const [periodes, professeurs] = await Promise.all([
    prisma.periode.findMany({ orderBy: { dateDebut: "desc" } }),
    prisma.professeur.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
  ]);
  const periodeChoisie = periodeId ? periodes.find((p) => p.id === Number(periodeId)) : periodes[0];

  const saisies = periodeChoisie
    ? await prisma.saisieHeuresManuelle.findMany({
        where: { periodeId: periodeChoisie.id },
        include: { professeur: true, saisiePar: true },
        orderBy: [{ date: "desc" }, { heureArriveeMin: "asc" }],
      })
    : [];

  return (
    <div>
      <PageHeader
        title="Heures manuelles"
        description="Rattrapage d'heures effectuées avant la mise en service du système, ou toute autre régularisation"
      />

      <Reveal>
        <PeriodeSelector periodes={periodes} valeur={periodeChoisie?.id} />
      </Reveal>

      {succes === "supprime" && (
        <p className="mb-4 max-w-3xl rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-sm text-[var(--color-success)]">
          Saisie supprimée.
        </p>
      )}

      {periodeChoisie && (
        <Reveal delay={0.06}>
          <SaisieManuelleForm
            professeurs={professeurs.map((p) => ({ id: p.id, label: `${p.nom} ${p.prenom} (${p.matricule})` }))}
            periodeId={periodeChoisie.id}
          />
        </Reveal>
      )}

      <Reveal delay={0.12}>
        <Table>
          <Thead>
            <Th>Professeur</Th>
            <Th>Date</Th>
            <Th>Arrivée</Th>
            <Th>Départ</Th>
            <Th>Durée</Th>
            <Th>Motif</Th>
            <Th>Saisi par</Th>
            <Th></Th>
          </Thead>
          <tbody>
            {saisies.map((s) => (
              <Tr key={s.id}>
                <Td className="font-medium text-[var(--color-navy-900)]">{s.professeur.nom} {s.professeur.prenom}</Td>
                <Td className="whitespace-nowrap font-mono text-xs">
                  {JOURS[s.date.getUTCDay() === 0 ? 7 : s.date.getUTCDay()]} {s.date.toISOString().slice(0, 10)}
                </Td>
                <Td className="font-mono text-xs">{formatHeureHorloge(s.heureArriveeMin)}</Td>
                <Td className="font-mono text-xs">{formatHeureHorloge(s.heureDepartMin)}</Td>
                <Td className="font-mono text-xs">{(s.dureeMin / 60).toFixed(2)} h</Td>
                <Td className="max-w-xs truncate" title={s.motif}>{s.motif}</Td>
                <Td>{s.saisiePar.nomUtilisateur}</Td>
                <Td>
                  <form action={supprimerSaisieManuelle}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="periodeId" value={s.periodeId} />
                    <Button type="submit" variant="outline" size="sm" className="!px-2 !py-1 text-xs text-[var(--color-danger)]">
                      <Trash2 size={13} />
                    </Button>
                  </form>
                </Td>
              </Tr>
            ))}
            {saisies.length === 0 && (
              <tr><td colSpan={8}><EmptyState>Aucune saisie manuelle pour cette période.</EmptyState></td></tr>
            )}
          </tbody>
        </Table>
      </Reveal>
    </div>
  );
}
