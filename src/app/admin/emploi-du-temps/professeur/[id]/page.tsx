import { notFound } from "next/navigation";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMinutes } from "@/lib/heureUtils";
import { PageHeader } from "@/components/ui/PageHeader";
import EmploiDuTempsProfesseurForm from "./EmploiDuTempsProfesseurForm";

export default async function PageEmploiDuTempsProfesseur({ params }: { params: Promise<{ id: string }> }) {
  await exigerRole(["ADMIN"]);
  const { id } = await params;
  const professeurId = Number(id);

  const [professeur, matieres, classes, creneaux] = await Promise.all([
    prisma.professeur.findUnique({ where: { id: professeurId } }),
    prisma.matiere.findMany({ where: { actif: true }, orderBy: { libelle: "asc" } }),
    prisma.classe.findMany({ where: { actif: true }, orderBy: { nomClasse: "asc" } }),
    prisma.emploiDuTemps.findMany({
      where: { professeurId, actif: true },
      include: { classe: true },
      orderBy: [{ jourSemaine: "asc" }, { heureDebutMin: "asc" }],
    }),
  ]);
  if (!professeur) notFound();

  return (
    <div>
      <PageHeader
        title={`Emploi du temps — ${professeur.nom} ${professeur.prenom}`}
        description="Modifiez tous les créneaux de ce professeur en une fois, puis enregistrez."
      />
      <EmploiDuTempsProfesseurForm
        professeurId={professeur.id}
        matieres={matieres.map((m) => ({ id: m.id, label: m.libelle }))}
        classes={classes.map((c) => c.nomClasse)}
        creneauxInitiaux={creneaux.map((c) => ({
          id: c.id,
          jourSemaine: String(c.jourSemaine),
          matiereId: String(c.matiereId),
          heureDebut: formatMinutes(c.heureDebutMin).replace("h", ":"),
          heureFin: formatMinutes(c.heureFinMin).replace("h", ":"),
          classe: c.classe.nomClasse,
        }))}
      />
    </div>
  );
}
