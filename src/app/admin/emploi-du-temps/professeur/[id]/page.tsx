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

  const [professeur, matieres, classes, creneaux, premierePeriode] = await Promise.all([
    prisma.professeur.findUnique({ where: { id: professeurId } }),
    prisma.matiere.findMany({ where: { actif: true }, orderBy: { libelle: "asc" } }),
    prisma.classe.findMany({ where: { actif: true }, orderBy: { nomClasse: "asc" } }),
    prisma.emploiDuTemps.findMany({
      where: { professeurId, actif: true },
      include: { classe: true },
      orderBy: [{ jourSemaine: "asc" }, { heureDebutMin: "asc" }],
    }),
    prisma.periodeGrille.findFirst({ where: { actif: true }, orderBy: { ordre: "asc" } }),
  ]);
  if (!professeur) notFound();

  // Professeur sans aucun creneau actif : plutot qu'une seule ligne vide a
  // dupliquer 4 fois a la main, on propose directement une ligne par jour
  // ouvre (lundi-vendredi), sur le premier creneau de la grille horaire de
  // l'etablissement - matiere et classe restent a choisir. Une ligne non
  // completee par l'admin est de toute facon ignoree a l'enregistrement
  // (voir EmploiDuTempsProfesseurForm/l'API, qui ne gardent que les lignes
  // entierement remplies), donc proposer ces 5 lignes est sans risque.
  const creneauxInitiaux =
    creneaux.length > 0
      ? creneaux.map((c) => ({
          id: c.id,
          jourSemaine: String(c.jourSemaine),
          matiereId: String(c.matiereId),
          heureDebut: formatMinutes(c.heureDebutMin).replace("h", ":"),
          heureFin: formatMinutes(c.heureFinMin).replace("h", ":"),
          classe: c.classe.nomClasse,
        }))
      : premierePeriode
        ? [1, 2, 3, 4, 5].map((jour) => ({
            jourSemaine: String(jour),
            matiereId: "",
            heureDebut: formatMinutes(premierePeriode.heureDebutMin).replace("h", ":"),
            heureFin: formatMinutes(premierePeriode.heureFinMin).replace("h", ":"),
            classe: "",
          }))
        : [];

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
        creneauxInitiaux={creneauxInitiaux}
      />
    </div>
  );
}
