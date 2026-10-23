import { Download, Trash2 } from "lucide-react";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { purgerAuditAnterieur } from "./actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/Table";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

const MESSAGES_ERREUR: Record<string, string> = {
  confirmation: 'Purge annulée : vous devez taper exactement "SUPPRIMER" pour confirmer.',
  date: "Date limite invalide.",
  date_future: "La date limite doit être dans le passé.",
};

export default async function PageAudit({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; succes?: string }>;
}) {
  await exigerRole(["ADMIN"]);
  const { erreur, succes } = await searchParams;
  const entrees = await prisma.audit.findMany({
    include: { utilisateur: true },
    orderBy: { dateHeure: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader title="Audit" description="Journal des actions sensibles, tracées à l'identité de l'auteur" />

      <Reveal>
        <Card className="mb-6 max-w-2xl">
          <CardTitle>Export et purge</CardTitle>
          <p className="mb-4 text-sm text-[var(--color-navy-900)]/55">
            L&apos;historique n&apos;est jamais purgé automatiquement. Téléchargez l&apos;export complet avant toute
            purge si vous souhaitez en conserver une trace hors base.
          </p>

          {succes === "purge" && (
            <p className="mb-4 rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-sm text-[var(--color-success)]">
              Purge effectuée avec succès.
            </p>
          )}
          {erreur && MESSAGES_ERREUR[erreur] && (
            <p className="mb-4 rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
              {MESSAGES_ERREUR[erreur]}
            </p>
          )}

          <a
            href="/api/admin/audit-export"
            className="mb-5 inline-flex items-center gap-2 rounded-lg bg-[var(--color-navy-900)]/5 px-3 py-2 text-sm font-medium text-[var(--color-navy-900)] hover:bg-[var(--color-navy-900)]/10"
          >
            <Download size={14} />
            Exporter tout l&apos;historique (CSV)
          </a>

          <form action={purgerAuditAnterieur} className="flex flex-wrap items-end gap-2 border-t border-[var(--color-navy-900)]/8 pt-4">
            <div>
              <Label>Supprimer les entrées antérieures au</Label>
              <Input name="dateLimite" type="date" required />
            </div>
            <div>
              <Label>Tapez SUPPRIMER pour confirmer</Label>
              <Input name="confirmation" placeholder="SUPPRIMER" required className="w-40" />
            </div>
            <Button type="submit" variant="outline" size="sm" className="text-[var(--color-danger)]">
              <Trash2 size={14} />
              Purger
            </Button>
          </form>
        </Card>
      </Reveal>

      <Reveal delay={0.08}>
        <Table>
          <Thead>
            <Th>Date/heure</Th>
            <Th>Utilisateur</Th>
            <Th>Action</Th>
            <Th>Détail</Th>
            <Th>Motif</Th>
          </Thead>
          <tbody>
            {entrees.map((a) => (
              <Tr key={a.id}>
                <Td className="whitespace-nowrap font-mono text-xs">{a.dateHeure.toLocaleString("fr-FR")}</Td>
                <Td>{a.utilisateur.nomUtilisateur ?? `#${a.utilisateurId}`}</Td>
                <Td><span className="rounded bg-[var(--color-navy-900)]/5 px-2 py-0.5 text-xs font-medium">{a.action}</span></Td>
                <Td className="max-w-xs truncate" title={a.nouvelleValeur ?? ""}>{a.nouvelleValeur}</Td>
                <Td className="max-w-xs truncate" title={a.motif ?? ""}>{a.motif}</Td>
              </Tr>
            ))}
            {entrees.length === 0 && (
              <tr><td colSpan={5}><EmptyState>Aucune action enregistrée.</EmptyState></td></tr>
            )}
          </tbody>
        </Table>
      </Reveal>
    </div>
  );
}
