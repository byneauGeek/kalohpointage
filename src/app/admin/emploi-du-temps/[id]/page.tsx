import { notFound } from "next/navigation";
import { Save } from "lucide-react";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMinutes } from "@/lib/heureUtils";
import { modifierCreneau } from "../actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input, Select, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const JOURS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const MESSAGES_ERREUR: Record<string, string> = {
  invalide: "Champs obligatoires manquants ou invalides.",
  ordre_heures: "L'heure de fin doit être postérieure à l'heure de début.",
  classe_inconnue: "Cette classe n'existe pas dans la base.",
  chevauchement: "Ce créneau chevauche un autre créneau actif du même professeur.",
};

export default async function PageModifierCreneau({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  await exigerRole(["ADMIN"]);
  const { id } = await params;
  const { erreur } = await searchParams;

  const [creneau, matieres] = await Promise.all([
    prisma.emploiDuTemps.findUnique({ where: { id: Number(id) }, include: { professeur: true, classe: true, matiere: true } }),
    prisma.matiere.findMany({ where: { actif: true }, orderBy: { libelle: "asc" } }),
  ]);
  if (!creneau) notFound();

  const modifierAvecId = modifierCreneau.bind(null, creneau.id);

  return (
    <div>
      <PageHeader
        title={`Modifier le créneau — ${creneau.professeur.nom} ${creneau.professeur.prenom}`}
        description={`Importé le ${creneau.dateImport ? new Date(creneau.dateImport).toLocaleDateString("fr-FR") : "—"}`}
      />
      <Card className="max-w-2xl">
        {erreur && MESSAGES_ERREUR[erreur] && (
          <p className="mb-4 rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
            {MESSAGES_ERREUR[erreur]}
          </p>
        )}
        <form action={modifierAvecId} className="grid grid-cols-2 gap-3">
          <div>
            <Label>Jour</Label>
            <Select name="jourSemaine" defaultValue={creneau.jourSemaine}>
              {JOURS.slice(1).map((j, i) => (
                <option key={j} value={i + 1}>{j}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Matière</Label>
            <Select name="matiereId" defaultValue={creneau.matiereId}>
              {matieres.map((m) => (
                <option key={m.id} value={m.id}>{m.libelle}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Heure début</Label>
            <Input name="heureDebut" type="time" defaultValue={formatMinutes(creneau.heureDebutMin).replace("h", ":")} required />
          </div>
          <div>
            <Label>Heure fin</Label>
            <Input name="heureFin" type="time" defaultValue={formatMinutes(creneau.heureFinMin).replace("h", ":")} required />
          </div>
          <div className="col-span-2">
            <Label>Classe</Label>
            <Input name="classe" defaultValue={creneau.classe.nomClasse} required />
          </div>
          <div className="col-span-2 flex items-end gap-2">
            <Button type="submit">
              <Save size={16} />
              Enregistrer les modifications
            </Button>
            <a href="/admin/emploi-du-temps" className="text-sm text-[var(--color-navy-900)]/50 hover:underline">
              Annuler
            </a>
          </div>
        </form>
      </Card>
    </div>
  );
}
