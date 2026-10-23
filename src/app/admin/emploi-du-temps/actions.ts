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
 * matiere) - jusqu'ici seul l'import initial permettait de definir un
 * creneau, sans correction possible ligne a ligne en cas d'erreur de
 * saisie. Reutilise les memes regles de validation que l'import (classe
 * reconnue, chevauchement) pour ne pas introduire d'incoherence que
 * l'import lui-meme aurait refusee. */
export async function modifierCreneau(creneauId: number, formData: FormData) {
  const session = await exigerRole(["ADMIN"]);

  const creneau = await prisma.emploiDuTemps.findUnique({ where: { id: creneauId } });
  if (!creneau) redirect("/admin/emploi-du-temps?erreur=introuvable");

  const jourTexte = JOURS[Number(formData.get("jourSemaine"))] ?? "";
  const numJour = jourSemaineVersNumero(jourTexte);
  const heureDebutMin = parseHeureFrancaise(String(formData.get("heureDebut") ?? ""));
  const heureFinMin = parseHeureFrancaise(String(formData.get("heureFin") ?? ""));
  const classeTexte = String(formData.get("classe") ?? "").trim();

  if (numJour === 0 || heureDebutMin === null || heureFinMin === null || !classeTexte) {
    redirect(`/admin/emploi-du-temps/${creneauId}?erreur=invalide`);
  }
  if (heureFinMin <= heureDebutMin) {
    redirect(`/admin/emploi-du-temps/${creneauId}?erreur=ordre_heures`);
  }

  const resultatClasse = await trouverIdClasse(prisma, classeTexte);
  if (!resultatClasse.trouve) {
    redirect(`/admin/emploi-du-temps/${creneauId}?erreur=classe_inconnue`);
  }

  const chevauchement = await prisma.emploiDuTemps.findFirst({
    where: {
      id: { not: creneauId },
      professeurId: creneau.professeurId,
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

  await prisma.emploiDuTemps.update({
    where: { id: creneauId },
    data: {
      jourSemaine: numJour,
      heureDebutMin,
      heureFinMin,
      classeId: resultatClasse.idClasse,
      matiereId: Number(formData.get("matiereId")),
    },
  });

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "MODIFICATION_CRENEAU",
    tableConcernee: "emplois_du_temps",
    idEnregistrement: creneauId,
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
