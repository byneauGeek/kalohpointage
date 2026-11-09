import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import ProfesseurSelectorIndispo from "./ProfesseurSelectorIndispo";

export default async function PageIndisponibilites() {
  await exigerRole(["ADMIN"]);
  const professeurs = await prisma.professeur.findMany({ where: { actif: true }, orderBy: { nom: "asc" } });

  return (
    <div>
      <PageHeader
        title="Indisponibilités"
        description="Jours et périodes où un professeur ne peut pas être placé - contrainte du générateur automatique."
      />
      <Card className="max-w-xl">
        <CardTitle>Choisir un professeur</CardTitle>
        <ProfesseurSelectorIndispo
          professeurs={professeurs.map((p) => ({ id: p.id, label: `${p.nom} ${p.prenom} (${p.matricule})` }))}
        />
      </Card>
    </div>
  );
}
