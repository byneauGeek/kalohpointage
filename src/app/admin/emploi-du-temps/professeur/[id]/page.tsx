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

  const [professeur, matieres, classes, creneaux, periodes] = await Promise.all([
    prisma.professeur.findUnique({ where: { id: professeurId } }),
    prisma.matiere.findMany({ where: { actif: true }, orderBy: { libelle: "asc" } }),
    prisma.classe.findMany({ where: { actif: true }, orderBy: { nomClasse: "asc" } }),
    prisma.emploiDuTemps.findMany({
      where: { professeurId, actif: true },
      include: { classe: true },
      orderBy: [{ jourSemaine: "asc" }, { heureDebutMin: "asc" }],
    }),
    prisma.periodeGrille.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } }),
  ]);
  if (!professeur) notFound();

  // Professeur sans aucun creneau actif : plutot qu'une seule ligne vide a
  // dupliquer a la main, on propose d'office la grille horaire complete de
  // l'etablissement (toutes les periodes, du lundi au vendredi) - matiere
  // et classe restent a choisir, ligne par ligne, ou a supprimer pour les
  // periodes non enseignees. Une ligne non completee par l'admin est de
  // toute facon ignoree a l'enregistrement (voir EmploiDuTempsProfesseurForm
  // /l'API, qui ne gardent que les lignes entierement remplies), donc
  // proposer toutes ces lignes par defaut est sans risque.
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
      : [1, 2, 3, 4, 5].flatMap((jour) =>
          periodes.map((periode) => ({
            jourSemaine: String(jour),
            matiereId: "",
            heureDebut: formatMinutes(periode.heureDebutMin).replace("h", ":"),
            heureFin: formatMinutes(periode.heureFinMin).replace("h", ":"),
            classe: "",
          }))
        );

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
