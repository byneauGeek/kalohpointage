import { UserPlus, Search } from "lucide-react";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { creerProfesseur, desactiverProfesseur, reactiverProfesseur } from "./actions";
import { FormulaireMasse } from "./FormulaireMasse";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Select, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/Table";
import { Reveal } from "@/components/ui/Reveal";

export default async function PageProfesseurs({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await exigerRole(["ADMIN", "COMPTABLE"]);
  const estAdmin = session.role === "ADMIN";
  const { q } = await searchParams;
  const recherche = q?.trim();
  const professeurs = await prisma.professeur.findMany({
    where: recherche
      ? { OR: [{ nom: { contains: recherche, mode: "insensitive" } }, { prenom: { contains: recherche, mode: "insensitive" } }, { matricule: { contains: recherche, mode: "insensitive" } }] }
      : undefined,
    orderBy: [{ nom: "asc" }],
  });

  return (
    <div>
      <PageHeader title="Professeurs" description="Fiches et statut contractuel du corps enseignant" />

      {estAdmin && (
        <>
          <Reveal>
            <FormulaireMasse />
          </Reveal>

          <Reveal delay={0.04}>
            <Card className="mb-8 max-w-4xl">
              <CardTitle>Ajouter un professeur (fiche complète)</CardTitle>
              <form action={creerProfesseur} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <Label>Matricule</Label>
                  <Input name="matricule" required />
                </div>
                <div>
                  <Label>Nom</Label>
                  <Input name="nom" required />
                </div>
                <div>
                  <Label>Prénom</Label>
                  <Input name="prenom" required />
                </div>
                <div>
                  <Label>Statut</Label>
                  <Select name="statut" defaultValue="VACATAIRE">
                    <option value="VACATAIRE">Vacataire</option>
                    <option value="PERMANENT">Permanent</option>
                  </Select>
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input name="telephone" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input name="email" type="email" />
                </div>
                <div>
                  <Label>Taux horaire spécifique</Label>
                  <Input name="tauxHoraireSpecifique" type="number" step="0.01" />
                </div>
                <div>
                  <Label>Salaire fixe mensuel</Label>
                  <Input name="salaireFixeMensuel" type="number" step="0.01" placeholder="Si Permanent" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label>Quota (heures/mois)</Label>
                  <Input name="quotaHeuresMensuel" type="number" step="0.5" placeholder="Si Permanent" />
                </div>
                <div className="col-span-2 flex items-end sm:col-span-4">
                  <Button type="submit" variant="primary">
                    <UserPlus size={16} />
                    Ajouter
                  </Button>
                </div>
              </form>
            </Card>
          </Reveal>
        </>
      )}

      <Reveal delay={0.06}>
        <form className="mb-4 flex max-w-sm items-center gap-2">
          <Input name="q" defaultValue={recherche} placeholder="Rechercher un nom ou un matricule…" />
          <Button type="submit" variant="outline" size="sm"><Search size={14} /></Button>
        </form>
      </Reveal>

      <Reveal delay={0.08}>
        <Table>
          <Thead>
            <Th>Matricule</Th>
            <Th>Nom</Th>
            <Th>Statut</Th>
            <Th>Actif</Th>
            {estAdmin && <Th></Th>}
          </Thead>
          <tbody>
            {professeurs.map((p) => (
              <Tr key={p.id}>
                <Td className="font-mono text-xs">{p.matricule}</Td>
                <Td className="font-medium text-[var(--color-navy-900)]">{p.nom} {p.prenom}</Td>
                <Td><Badge tone={p.statut === "PERMANENT" ? "gold" : "neutral"}>{p.statut}</Badge></Td>
                <Td>{p.actif ? <Badge tone="success">Actif</Badge> : <Badge tone="danger">Inactif</Badge>}</Td>
                {estAdmin && (
                  <Td>
                    <div className="flex items-center gap-3">
                      <a href={`/admin/professeurs/${p.id}`} className="text-xs font-medium text-[var(--color-navy-800)] hover:underline">
                        Modifier
                      </a>
                      {p.actif ? (
                        <form action={desactiverProfesseur.bind(null, p.id)}>
                          <button className="text-xs font-medium text-[var(--color-danger)] hover:underline">Désactiver</button>
                        </form>
                      ) : (
                        <form action={reactiverProfesseur.bind(null, p.id)}>
                          <button className="text-xs font-medium text-[var(--color-success)] hover:underline">Réactiver</button>
                        </form>
                      )}
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
            {professeurs.length === 0 && (
              <tr><td colSpan={estAdmin ? 5 : 4}><EmptyState>Aucun professeur enregistré.</EmptyState></td></tr>
            )}
          </tbody>
        </Table>
      </Reveal>
    </div>
  );
}
