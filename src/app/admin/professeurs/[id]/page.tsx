import { notFound } from "next/navigation";
import { Save } from "lucide-react";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { modifierProfesseur } from "../actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input, Select, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default async function PageModifierProfesseur({ params }: { params: Promise<{ id: string }> }) {
  await exigerRole(["ADMIN"]);
  const { id } = await params;
  const professeur = await prisma.professeur.findUnique({ where: { id: Number(id) } });
  if (!professeur) notFound();

  const modifierAvecId = modifierProfesseur.bind(null, professeur.id);

  return (
    <div>
      <PageHeader title={`Modifier ${professeur.nom} ${professeur.prenom}`} description={`Matricule ${professeur.matricule} (non modifiable)`} />
      <Card className="max-w-4xl">
        <form action={modifierAvecId} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <Label>Nom</Label>
            <Input name="nom" defaultValue={professeur.nom} required />
          </div>
          <div>
            <Label>Prénom</Label>
            <Input name="prenom" defaultValue={professeur.prenom} required />
          </div>
          <div>
            <Label>Statut</Label>
            <Select name="statut" defaultValue={professeur.statut}>
              <option value="VACATAIRE">Vacataire</option>
              <option value="PERMANENT">Permanent</option>
            </Select>
          </div>
          <div>
            <Label>Téléphone</Label>
            <Input name="telephone" defaultValue={professeur.telephone ?? ""} />
          </div>
          <div>
            <Label>Email</Label>
            <Input name="email" type="email" defaultValue={professeur.email ?? ""} />
          </div>
          <div>
            <Label>Taux horaire spécifique</Label>
            <Input name="tauxHoraireSpecifique" type="number" step="0.01" defaultValue={professeur.tauxHoraireSpecifique ? Number(professeur.tauxHoraireSpecifique) : undefined} />
          </div>
          <div>
            <Label>Salaire fixe mensuel</Label>
            <Input name="salaireFixeMensuel" type="number" step="0.01" defaultValue={professeur.salaireFixeMensuel ? Number(professeur.salaireFixeMensuel) : undefined} placeholder="Si Permanent" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label>Quota (heures/mois)</Label>
            <Input name="quotaHeuresMensuel" type="number" step="0.5" defaultValue={professeur.quotaHeuresMensuelMin ? professeur.quotaHeuresMensuelMin / 60 : undefined} placeholder="Si Permanent" />
          </div>
          <div className="col-span-2 flex items-end gap-2 sm:col-span-4">
            <Button type="submit">
              <Save size={16} />
              Enregistrer les modifications
            </Button>
            <a href="/admin/professeurs" className="text-sm text-[var(--color-navy-900)]/50 hover:underline">
              Annuler
            </a>
          </div>
        </form>
      </Card>
    </div>
  );
}
