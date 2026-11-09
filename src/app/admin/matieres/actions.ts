"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerRole } from "@/lib/auth";

export async function creerMatiere(formData: FormData) {
  await exigerRole(["ADMIN"]);
  const libelle = String(formData.get("libelle") ?? "").trim();
  if (libelle === "") redirect("/admin/matieres?erreur=vide");

  const existante = await prisma.matiere.findUnique({ where: { libelle } });
  if (existante) redirect("/admin/matieres?erreur=existe_deja");

  await prisma.matiere.create({ data: { libelle } });
  revalidatePath("/admin/matieres");
  redirect("/admin/matieres?succes=creee");
}

/** Choix, PAR MATIERE, de comment compter les heures d'un professeur qui
 * l'enseigne a plusieurs classes en simultane sur un meme creneau (voir
 * src/lib/comptabilisation.ts pour le detail du calcul - remplace l'ancien
 * reglage unique et global de /admin/parametres). */
export async function enregistrerModeComptageSimultane(formData: FormData) {
  await exigerRole(["ADMIN"]);
  const matiereId = Number(formData.get("matiereId"));
  const valeur = String(formData.get("modeComptageSimultane") ?? "PAR_CLASSE") === "UNE_FOIS_PAR_CRENEAU" ? "UNE_FOIS_PAR_CRENEAU" : "PAR_CLASSE";
  if (!matiereId) redirect("/admin/matieres?erreur=invalide");

  await prisma.matiere.update({ where: { id: matiereId }, data: { modeComptageSimultane: valeur } });
  revalidatePath("/admin/matieres");
  redirect("/admin/matieres?succes=mode_enregistre");
}
