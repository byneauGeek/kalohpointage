import { notFound } from "next/navigation";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import IndisponibilitesForm from "./IndisponibilitesForm";

export default async function PageIndisponibilitesProfesseur({ params }: { params: Promise<{ id: string }> }) {
  await exigerRole(["ADMIN"]);
  const { id } = await params;
  const professeurId = Number(id);

  const [professeur, periodes, indisponibilites] = await Promise.all([
    prisma.professeur.findUnique({ where: { id: professeurId } }),
    prisma.periodeGrille.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } }),
    prisma.indisponibiliteProfesseur.findMany({ where: { professeurId } }),
  ]);
  if (!professeur) notFound();

  return (
    <div>
      <PageHeader
        title={`Indisponibilités — ${professeur.nom} ${professeur.prenom}`}
        description="Cochez les créneaux où ce professeur ne peut jamais être placé par le générateur automatique."
      />
      <IndisponibilitesForm
        professeurId={professeur.id}
        periodes={periodes.map((p) => ({ id: p.id, libelle: p.libelle }))}
        indisponibilitesInitiales={indisponibilites.map((i) => ({ jourSemaine: i.jourSemaine, periodeGrilleId: i.periodeGrilleId }))}
      />
    </div>
  );
}
