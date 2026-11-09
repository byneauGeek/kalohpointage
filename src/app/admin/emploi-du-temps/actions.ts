"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { exigerRole } from "@/lib/auth";
import { enregistrerAudit } from "@/lib/audit";
import { parseHeureFrancaise, jourSemaineVersNumero } from "@/lib/heureUtils";
import { trouverIdClasse } from "@/lib/classeMatching";

const JOURS = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/** Modifie un creneau d'emploi du temps existant (jour, horaires, classe,
 * matiere(s)) - jusqu'ici seul l'import initial permettait de definir un
 * creneau, sans correction possible ligne a ligne en cas d'erreur de
 * saisie. Reutilise les memes regles de validation que l'import (classe
 * reconnue, chevauchement) pour ne pas introduire d'incoherence que
 * l'import lui-meme aurait refusee.
 *
 * Plusieurs matieres possibles sur un meme creneau (co-enseignement, voir
 * MatiereSelecteur) : une matiere = une ligne EmploiDuTemps, toutes
 * partageant le meme jour/horaires/classe. Le "groupe" du creneau est
 * identifie par ces champs AVANT modification (siblings) ; apres
 * modification, la ligne principale et les siblings reutilises portent les
 * nouvelles valeurs, les matieres retirees sont desactivees (jamais
 * supprimees, pour tracabilite) et les matieres ajoutees creent de
 * nouvelles lignes. */
export async function modifierCreneau(creneauId: number, formData: FormData) {
  const session = await exigerRole(["ADMIN"]);

  const creneau = await prisma.emploiDuTemps.findUnique({ where: { id: creneauId } });
  if (!creneau) redirect("/admin/emploi-du-temps?erreur=introuvable");

  const jourTexte = JOURS[Number(formData.get("jourSemaine"))] ?? "";
  const numJour = jourSemaineVersNumero(jourTexte);
  const heureDebutMin = parseHeureFrancaise(String(formData.get("heureDebut") ?? ""));
  const heureFinMin = parseHeureFrancaise(String(formData.get("heureFin") ?? ""));
  const classeTexte = String(formData.get("classe") ?? "").trim();
  const matiereIds = Array.from(new Set(formData.getAll("matiereId").map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0)));

  if (numJour === 0 || heureDebutMin === null || heureFinMin === null || !classeTexte || matiereIds.length === 0) {
    redirect(`/admin/emploi-du-temps/${creneauId}?erreur=invalide`);
  }
  if (heureFinMin <= heureDebutMin) {
    redirect(`/admin/emploi-du-temps/${creneauId}?erreur=ordre_heures`);
  }

  const resultatClasse = await trouverIdClasse(prisma, classeTexte);
  if (!resultatClasse.trouve) {
    redirect(`/admin/emploi-du-temps/${creneauId}?erreur=classe_inconnue`);
  }

  // Autres lignes formant deja ce meme creneau (meme prof/jour/horaires/
  // classe, avant modification) - a la fois le groupe de co-enseignement a
  // faire evoluer, et des lignes a exclure du controle de chevauchement
  // (elles ne sont pas de "vrais" doublons entre elles).
  const siblings = await prisma.emploiDuTemps.findMany({
    where: {
      id: { not: creneauId },
      professeurId: creneau.professeurId,
      classeId: creneau.classeId,
      jourSemaine: creneau.jourSemaine,
      heureDebutMin: creneau.heureDebutMin,
      heureFinMin: creneau.heureFinMin,
      actif: true,
    },
  });
  const idsGroupe = [creneauId, ...siblings.map((s) => s.id)];

  // Un professeur peut avoir plusieurs classes en simultane sur le meme
  // creneau (ex. 3e1/3e2/3e3 en meme temps), et une meme classe plusieurs
  // matieres (co-enseignement) : seul un chevauchement sur LA MEME classe
  // ET LA MEME matiere, avec une ligne hors de ce groupe, est une vraie
  // erreur (double saisie du meme creneau).
  for (const matiereId of matiereIds) {
    const chevauchement = await prisma.emploiDuTemps.findFirst({
      where: {
        id: { notIn: idsGroupe },
        professeurId: creneau.professeurId,
        classeId: resultatClasse.idClasse,
        matiereId,
        jourSemaine: numJour,
        actif: true,
        heureDebutMin: { lt: heureFinMin },
        heureFinMin: { gt: heureDebutMin },
        OR: [{ dateFinValidite: null }, { dateFinValidite: { gte: creneau.dateDebutValidite } }],
      },
    });
    if (chevauchement) {
      redirect(`/admin/emploi-du-temps/${creneauId}?erreur=chevauchement`);
    }
  }

  // Ligne principale : garde sa matiere actuelle si toujours selectionnee,
  // sinon prend la premiere de la selection - purement cosmetique (quelle
  // ligne represente quelle matiere n'a aucun effet fonctionnel).
  const matiereIdsRestants = new Set(matiereIds);
  const matierePrincipale = matiereIdsRestants.has(creneau.matiereId) ? creneau.matiereId : matiereIds[0];
  matiereIdsRestants.delete(matierePrincipale);
  const siblingsParMatiere = new Map(siblings.map((s) => [s.matiereId, s]));

  await prisma.$transaction(async (tx) => {
    await tx.emploiDuTemps.update({
      where: { id: creneauId },
      data: {
        jourSemaine: numJour,
        heureDebutMin,
        heureFinMin,
        classeId: resultatClasse.idClasse,
        matiereId: matierePrincipale,
      },
    });

    for (const matiereId of matiereIdsRestants) {
      const existant = siblingsParMatiere.get(matiereId);
      if (existant) {
        await tx.emploiDuTemps.update({
          where: { id: existant.id },
          data: { jourSemaine: numJour, heureDebutMin, heureFinMin, classeId: resultatClasse.idClasse, actif: true },
        });
        siblingsParMatiere.delete(matiereId);
      } else {
        await tx.emploiDuTemps.create({
          data: {
            professeurId: creneau.professeurId,
            classeId: resultatClasse.idClasse,
            matiereId,
            jourSemaine: numJour,
            heureDebutMin,
            heureFinMin,
            dateDebutValidite: creneau.dateDebutValidite,
            dateFinValidite: creneau.dateFinValidite,
          },
        });
      }
    }

    // Siblings dont la matiere n'est plus selectionnee : desactives (jamais
    // supprimes, pour tracabilite - meme logique que desactiverCreneau).
    for (const reste of siblingsParMatiere.values()) {
      await tx.emploiDuTemps.update({ where: { id: reste.id }, data: { actif: false } });
    }
  });

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "MODIFICATION_CRENEAU",
    tableConcernee: "emplois_du_temps",
    idEnregistrement: creneauId,
    nouvelleValeur: matiereIds.length > 1 ? `${matiereIds.length} matieres sur ce creneau` : undefined,
  });

  revalidatePath("/admin/emploi-du-temps");
  redirect("/admin/emploi-du-temps?succes=modifie");
}

/** Desactive un creneau (retrait de l'emploi du temps actif) - conserve la
 * ligne pour tracabilite plutot qu'une suppression definitive. */
export async function desactiverCreneau(formData: FormData) {
  const session = await exigerRole(["ADMIN"]);
  const creneauId = Number(formData.get("creneauId"));

  await prisma.emploiDuTemps.update({ where: { id: creneauId }, data: { actif: false } });

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "DESACTIVATION_CRENEAU",
    tableConcernee: "emplois_du_temps",
    idEnregistrement: creneauId,
  });

  revalidatePath("/admin/emploi-du-temps");
  redirect("/admin/emploi-du-temps?succes=desactive");
}
