import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/Table";
import { Reveal } from "@/components/ui/Reveal";

export default async function PageAudit() {
  await exigerRole(["ADMIN"]);
  const entrees = await prisma.audit.findMany({
    include: { utilisateur: true },
    orderBy: { dateHeure: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader title="Audit" description="Journal des actions sensibles, tracées à l'identité de l'auteur" />
      <Reveal>
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
