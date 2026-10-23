"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerRole } from "@/lib/auth";
import { enregistrerAudit } from "@/lib/audit";

/** Les regles sont HISTORISEES par date d'application (jamais ecrasees) :
 * un cours utilise toujours la regle active a SA date, jamais la regle
 * courante (D120/Modele_Donnees.md). On desactive l'ancienne et on cree une
 * nouvelle ligne active. */
export async function enregistrerRegleValidation(formData: FormData) {
  const session = await exigerRole(["ADMIN"]);

  const ancienne = await prisma.regleValidation.findFirst({ where: { actif: true } });
  if (ancienne) {
    await prisma.regleValidation.update({ where: { id: ancienne.id }, data: { actif: false } });
  }

  const nouvelle = await prisma.regleValidation.create({
    data: {
      toleranceArriveeMin: Number(formData.get("toleranceArriveeMin")),
      toleranceDepartMin: Number(formData.get("toleranceDepartMin")),
      retardMaxAccepteMin: Number(formData.get("retardMaxAccepteMin")),
      delaiAbsenceMin: Number(formData.get("delaiAbsenceMin")),
      arrondiMin: Number(formData.get("arrondiMin") ?? 0),
      sensArrondi: String(formData.get("sensArrondi")) as "PLUS_PROCHE" | "INFERIEUR" | "SUPERIEUR",
      tauxHoraireGeneral: Number(formData.get("tauxHoraireGeneral")),
      dateApplication: new Date(),
      actif: true,
    },
  });

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "MODIFICATION_PARAMETRES",
    tableConcernee: "regles_validation",
    idEnregistrement: nouvelle.id,
    ancienneValeur: ancienne ? JSON.stringify(ancienne) : undefined,
    nouvelleValeur: JSON.stringify(nouvelle),
  });

  revalidatePath("/admin/parametres");
}

export async function enregistrerNomEtablissement(formData: FormData) {
  const session = await exigerRole(["ADMIN"]);
  const valeur = String(formData.get("nomEtablissement") ?? "").trim();
  await prisma.parametre.upsert({
    where: { cle: "NOM_ETABLISSEMENT" },
    create: { cle: "NOM_ETABLISSEMENT", valeur },
    update: { valeur },
  });
  await enregistrerAudit({ utilisateurId: session.userId, action: "MODIFICATION_PARAMETRES", nouvelleValeur: valeur });
  revalidatePath("/admin/parametres");
}

/** Cloture l'emploi du temps en cours pour archiver proprement une rentree
 * scolaire : fixe la date de fin de validite de tous les creneaux encore
 * "sans fin" (dateFinValidite null) a la veille de la date choisie. Les
 * creneaux ne sont PAS supprimes (historique conserve, visible via
 * dateDebutValidite/dateFinValidite) - un nouvel import pour la rentree
 * suivante avec une date de debut posterieure ne chevauchera alors plus les
 * anciens creneaux. Protegee par une confirmation textuelle : ca affecte
 * tous les professeurs d'un coup. */
export async function cloturerAnneeScolaire(formData: FormData) {
  const session = await exigerRole(["ADMIN"]);
  const dateRentreeTexte = String(formData.get("dateRentree") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (confirmation !== "CONFIRMER") {
    redirect("/admin/parametres?erreur=confirmation");
  }
  const dateRentree = new Date(dateRentreeTexte);
  if (!dateRentreeTexte || Number.isNaN(dateRentree.getTime())) {
    redirect("/admin/parametres?erreur=date");
  }

  const dateFin = new Date(dateRentree);
  dateFin.setDate(dateFin.getDate() - 1);

  const resultat = await prisma.emploiDuTemps.updateMany({
    where: { actif: true, dateFinValidite: null },
    data: { dateFinValidite: dateFin },
  });

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "CLOTURE_ANNEE_SCOLAIRE",
    tableConcernee: "emplois_du_temps",
    motif: `${resultat.count} créneau(x) clôturé(s) au ${dateFin.toLocaleDateString("fr-FR")} avant la rentrée du ${dateRentree.toLocaleDateString("fr-FR")}`,
  });

  revalidatePath("/admin/parametres");
  revalidatePath("/admin/emploi-du-temps");
  redirect("/admin/parametres?succes=cloture");
}
