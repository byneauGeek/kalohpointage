import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMinutes } from "@/lib/heureUtils";
import { PageHeader } from "@/components/ui/PageHeader";
import GrilleHoraireForm from "./GrilleHoraireForm";

export default async function PageGrilleHoraire() {
  await exigerRole(["ADMIN"]);

  const periodes = await prisma.periodeGrille.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } });

  return (
    <div>
      <PageHeader
        title="Grille horaire"
        description="Le découpage en périodes de l'établissement (sonnerie), commun à tous les jours."
      />
      <GrilleHoraireForm
        periodesInitiales={periodes.map((p) => ({
          id: p.id,
          libelle: p.libelle,
          heureDebut: formatMinutes(p.heureDebutMin).replace("h", ":"),
          heureFin: formatMinutes(p.heureFinMin).replace("h", ":"),
        }))}
      />
    </div>
  );
}
