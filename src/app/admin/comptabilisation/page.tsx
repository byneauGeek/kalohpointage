import { AlertTriangle, FileDown } from "lucide-react";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculerComptabilisation } from "@/lib/comptabilisation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/Table";
import { Reveal } from "@/components/ui/Reveal";
import { PeriodeSelector } from "./PeriodeSelector";

export default async function PageComptabilisation({
  searchParams,
}: {
  searchParams: Promise<{ periodeId?: string }>;
}) {
  await exigerRole(["ADMIN", "COMPTABLE"]);
  const { periodeId } = await searchParams;
  const periodes = await prisma.periode.findMany({ orderBy: { dateDebut: "desc" } });
  const periodeChoisie = periodeId ? periodes.find((p) => p.id === Number(periodeId)) : periodes[0];

  const regle = await prisma.regleValidation.findFirst({ where: { actif: true }, orderBy: { dateApplication: "desc" } });
  const taux = periodeChoisie?.tauxHoraireApplique
    ? Number(periodeChoisie.tauxHoraireApplique)
    : Number(regle?.tauxHoraireGeneral ?? 0);

  const lignes = periodeChoisie
    ? await calculerComptabilisation(periodeChoisie.dateDebut, periodeChoisie.dateFin, taux, periodeChoisie.id)
    : [];

  return (
    <div>
      <PageHeader title="Comptabilisation" description="Heures validées et montants par professeur" />

      <Reveal>
        <PeriodeSelector periodes={periodes} valeur={periodeChoisie?.id} />
      </Reveal>

      <Reveal delay={0.08}>
        <Table>
          <Thead>
            <Th>Professeur</Th>
            <Th>Statut</Th>
            <Th>Heures validées</Th>
            <Th>Quota</Th>
            <Th>Heures supp.</Th>
            <Th>Salaire fixe</Th>
            <Th>Montant</Th>
            <Th></Th>
          </Thead>
          <tbody>
            {lignes.map((l) => (
              <Tr key={l.professeurId}>
                <Td className="font-medium text-[var(--color-navy-900)]">{l.nom} {l.prenom} <span className="text-xs text-[var(--color-navy-900)]/40">({l.matricule})</span></Td>
                <Td>
                  <span className="inline-flex items-center gap-1">
                    {l.statut}
                    {l.avertissements.length > 0 && (
                      <AlertTriangle size={13} className="text-[var(--color-warning)]" aria-label={l.avertissements.join(" ")} />
                    )}
                  </span>
                </Td>
                <Td>{(l.minutesValidees / 60).toFixed(2)} h</Td>
                <Td>{l.quotaMin != null ? `${(l.quotaMin / 60).toFixed(2)} h` : "—"}</Td>
                <Td>{(l.minutesSupp / 60).toFixed(2)} h</Td>
                <Td>{l.salaireFixe.toFixed(2)}</Td>
                <Td className="font-semibold text-[var(--color-navy-900)]">{l.montant.toFixed(2)}</Td>
                <Td>
                  {periodeChoisie && (
                    <div className="flex items-center gap-3">
                      <a
                        href={`/api/admin/fiche-paie?professeurId=${l.professeurId}&periodeId=${periodeChoisie.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-navy-800)] hover:underline"
                      >
                        <FileDown size={14} />
                        Word
                      </a>
                      <a
                        href={`/api/admin/fiche-paie?professeurId=${l.professeurId}&periodeId=${periodeChoisie.id}&format=pdf`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-navy-800)] hover:underline"
                      >
                        <FileDown size={14} />
                        PDF
                      </a>
                    </div>
                  )}
                </Td>
              </Tr>
            ))}
            {lignes.length === 0 && (
              <tr><td colSpan={8}><EmptyState>Aucune donnée pour cette période.</EmptyState></td></tr>
            )}
          </tbody>
        </Table>
      </Reveal>
    </div>
  );
}
