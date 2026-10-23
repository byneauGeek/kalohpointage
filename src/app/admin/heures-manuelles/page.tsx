import { PlusCircle, Trash2 } from "lucide-react";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ajouterSaisieManuelle, supprimerSaisieManuelle } from "./actions";
import { PeriodeSelector } from "./PeriodeSelector";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Select, Label, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/Table";
import { Reveal } from "@/components/ui/Reveal";

const MESSAGES_ERREUR: Record<string, string> = {
  champs: "Professeur et période obligatoires.",
  heures: "Le nombre d'heures doit être supérieur à 0.",
  motif: "Le motif est obligatoire (justification de la saisie).",
};

export default async function PageHeuresManuelles({
  searchParams,
}: {
  searchParams: Promise<{ periodeId?: string; erreur?: string; succes?: string }>;
}) {
  await exigerRole(["ADMIN"]);
  const { periodeId, erreur, succes } = await searchParams;

  const [periodes, professeurs] = await Promise.all([
    prisma.periode.findMany({ orderBy: { dateDebut: "desc" } }),
    prisma.professeur.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
  ]);
  const periodeChoisie = periodeId ? periodes.find((p) => p.id === Number(periodeId)) : periodes[0];

  const saisies = periodeChoisie
    ? await prisma.saisieHeuresManuelle.findMany({
        where: { periodeId: periodeChoisie.id },
        include: { professeur: true, saisiePar: true },
        orderBy: { dateSaisie: "desc" },
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

      {periodeChoisie && (
        <Reveal delay={0.06}>
          <Card className="mb-6 max-w-2xl">
            <CardTitle>Ajouter une saisie</CardTitle>
            <p className="mb-4 text-sm text-[var(--color-navy-900)]/55">
              Ces heures s&apos;ajoutent aux heures validées automatiquement par le pointage pour le calcul des
              honoraires de la période <strong>{periodeChoisie.libelle}</strong>. Un motif est obligatoire.
            </p>

            {succes === "1" && (
              <p className="mb-4 rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-sm text-[var(--color-success)]">
                Saisie enregistrée.
              </p>
            )}
            {succes === "supprime" && (
              <p className="mb-4 rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-sm text-[var(--color-success)]">
                Saisie supprimée.
              </p>
            )}
            {erreur && MESSAGES_ERREUR[erreur] && (
              <p className="mb-4 rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
                {MESSAGES_ERREUR[erreur]}
              </p>
            )}

            <form action={ajouterSaisieManuelle} className="grid grid-cols-2 gap-3">
              <input type="hidden" name="periodeId" value={periodeChoisie.id} />
              <div className="col-span-2">
                <Label>Professeur</Label>
                <Select name="professeurId" required>
                  <option value="">Professeur…</option>
                  {professeurs.map((p) => (
                    <option key={p.id} value={p.id}>{p.nom} {p.prenom} ({p.matricule})</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Heures (ex. 12,5)</Label>
                <Input name="heures" type="number" step="0.25" min="0.25" required />
              </div>
              <div className="col-span-2">
                <Label>Motif (obligatoire)</Label>
                <Textarea name="motif" rows={2} required placeholder="Ex. : Heures de septembre à octobre, avant la mise en service du système" />
              </div>
              <div className="col-span-2">
                <Button type="submit">
                  <PlusCircle size={16} />
                  Ajouter
                </Button>
              </div>
            </form>
          </Card>
        </Reveal>
      )}

      <Reveal delay={0.12}>
        <Table>
          <Thead>
            <Th>Professeur</Th>
            <Th>Heures</Th>
            <Th>Motif</Th>
            <Th>Saisi par</Th>
            <Th>Date</Th>
            <Th></Th>
          </Thead>
          <tbody>
            {saisies.map((s) => (
              <Tr key={s.id}>
                <Td className="font-medium text-[var(--color-navy-900)]">{s.professeur.nom} {s.professeur.prenom}</Td>
                <Td className="font-mono text-xs">{(s.heuresMin / 60).toFixed(2)} h</Td>
                <Td className="max-w-sm" title={s.motif}>{s.motif}</Td>
                <Td>{s.saisiePar.nomUtilisateur}</Td>
                <Td className="whitespace-nowrap font-mono text-xs">{s.dateSaisie.toLocaleDateString("fr-FR")}</Td>
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
              <tr><td colSpan={6}><EmptyState>Aucune saisie manuelle pour cette période.</EmptyState></td></tr>
            )}
          </tbody>
        </Table>
      </Reveal>
    </div>
  );
}
