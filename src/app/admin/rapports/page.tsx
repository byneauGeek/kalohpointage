import { FileCheck, FileDown } from "lucide-react";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { genererRapportAction } from "./actions";
import FormulaireControle from "./ControleForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { StatutBadge } from "@/components/ui/Badge";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/Table";
import { Reveal } from "@/components/ui/Reveal";

export default async function PageRapports() {
  await exigerRole(["ADMIN", "COMPTABLE"]);
  const [periodes, rapports] = await Promise.all([
    prisma.periode.findMany({ orderBy: { dateDebut: "desc" } }),
    prisma.rapport.findMany({ include: { periode: true }, orderBy: { dateGeneration: "desc" }, take: 50 }),
  ]);

  return (
    <div>
      <PageHeader title="Rapports" description="Génération et contrôle d'authenticité" />

      <Reveal>
        <Card className="mb-6 max-w-xl">
          <form action={genererRapportAction} className="flex flex-wrap items-end gap-2">
            <Select name="periodeId" required className="w-auto">
              {periodes.map((p) => (
                <option key={p.id} value={p.id}>{p.libelle}</option>
              ))}
            </Select>
            <Select name="typeRapport" className="w-auto">
              <option value="MENSUEL">Mensuel</option>
              <option value="PAR_PROFESSEUR">Par professeur</option>
              <option value="ANOMALIES">Anomalies</option>
            </Select>
            <Button type="submit">
              <FileCheck size={16} />
              Générer le rapport
            </Button>
          </form>
        </Card>
      </Reveal>

      <Reveal delay={0.06}>
        <FormulaireControle />
      </Reveal>

      <Reveal delay={0.12}>
        <Table>
          <Thead>
            <Th>Numéro</Th>
            <Th>Version</Th>
            <Th>Période</Th>
            <Th>Statut</Th>
            <Th>Montant total</Th>
            <Th>Code de vérification</Th>
            <Th></Th>
          </Thead>
          <tbody>
            {rapports.map((r) => (
              <Tr key={r.id}>
                <Td className="font-mono text-xs">{r.numeroRapport}</Td>
                <Td>v{r.version}</Td>
                <Td>{r.periode.libelle}</Td>
                <Td><StatutBadge statut={r.statut} /></Td>
                <Td>{r.montantTotal ? Number(r.montantTotal).toFixed(2) : "—"}</Td>
                <Td className="font-mono text-xs">{r.codeVerification}</Td>
                <Td>
                  <a
                    href={`/api/admin/rapport-pdf?rapportId=${r.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-navy-800)] hover:underline"
                  >
                    <FileDown size={14} />
                    PDF
                  </a>
                </Td>
              </Tr>
            ))}
            {rapports.length === 0 && (
              <tr><td colSpan={7}><EmptyState>Aucun rapport généré.</EmptyState></td></tr>
            )}
          </tbody>
        </Table>
      </Reveal>
    </div>
  );
}
