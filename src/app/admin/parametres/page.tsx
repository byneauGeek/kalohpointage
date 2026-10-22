import { Save, Settings } from "lucide-react";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { enregistrerRegleValidation, enregistrerNomEtablissement } from "./actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Select, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export default async function PageParametres() {
  await exigerRole(["ADMIN"]);
  const regle = await prisma.regleValidation.findFirst({ where: { actif: true }, orderBy: { dateApplication: "desc" } });
  const nomEtablissement = await prisma.parametre.findUnique({ where: { cle: "NOM_ETABLISSEMENT" } });

  return (
    <div>
      <PageHeader title="Paramètres" description="Identité de l'établissement et règles de validation" />

      <Reveal>
        <Card className="mb-8 max-w-md">
          <CardTitle>Établissement</CardTitle>
          <form action={enregistrerNomEtablissement} className="flex items-end gap-2">
            <Input name="nomEtablissement" defaultValue={nomEtablissement?.valeur ?? "Collège Privé Kaloh"} className="flex-1" />
            <Button type="submit" size="sm"><Save size={14} />Enregistrer</Button>
          </form>
        </Card>
      </Reveal>

      <Reveal delay={0.08}>
        <Card className="max-w-xl">
          <CardTitle>Règles de validation</CardTitle>
          <form action={enregistrerRegleValidation} className="grid grid-cols-2 gap-3">
            <p className="col-span-2 text-sm text-[var(--color-navy-900)]/55">
              Ces règles s&apos;appliquent à la prochaine « Appliquer les règles de validation » ; les cours déjà
              validés ne sont jamais recalculés.
            </p>
            <div>
              <Label>Tolérance arrivée (min)</Label>
              <Input name="toleranceArriveeMin" type="number" defaultValue={regle?.toleranceArriveeMin ?? 10} required />
            </div>
            <div>
              <Label>Tolérance départ (min)</Label>
              <Input name="toleranceDepartMin" type="number" defaultValue={regle?.toleranceDepartMin ?? 10} required />
            </div>
            <div>
              <Label>Retard maximal accepté (min)</Label>
              <Input name="retardMaxAccepteMin" type="number" defaultValue={regle?.retardMaxAccepteMin ?? 30} required />
            </div>
            <div>
              <Label>Délai avant absence (min)</Label>
              <Input name="delaiAbsenceMin" type="number" defaultValue={regle?.delaiAbsenceMin ?? 20} required />
            </div>
            <div>
              <Label>Arrondi (min, 0 = aucun)</Label>
              <Input name="arrondiMin" type="number" defaultValue={regle?.arrondiMin ?? 0} />
            </div>
            <div>
              <Label>Sens de l&apos;arrondi</Label>
              <Select name="sensArrondi" defaultValue={regle?.sensArrondi ?? "PLUS_PROCHE"}>
                <option value="PLUS_PROCHE">Au plus proche</option>
                <option value="INFERIEUR">Inférieur</option>
                <option value="SUPERIEUR">Supérieur</option>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Taux horaire général</Label>
              <Input name="tauxHoraireGeneral" type="number" step="0.01" defaultValue={regle ? Number(regle.tauxHoraireGeneral) : undefined} required />
            </div>
            <div className="col-span-2">
              <Button type="submit">
                <Settings size={16} />
                Enregistrer les règles
              </Button>
            </div>
          </form>
        </Card>
      </Reveal>
    </div>
  );
}
