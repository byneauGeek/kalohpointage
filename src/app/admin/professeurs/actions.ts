"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerRole } from "@/lib/auth";
import { enregistrerAudit } from "@/lib/audit";

export async function creerProfesseur(formData: FormData) {
  const session = await exigerRole(["ADMIN"]);

  const statut = String(formData.get("statut"));
  const salaireFixe = formData.get("salaireFixeMensuel");
  const quota = formData.get("quotaHeuresMensuel");

  const professeur = await prisma.professeur.create({
    data: {
      matricule: String(formData.get("matricule")).trim(),
      nom: String(formData.get("nom")).trim(),
      prenom: String(formData.get("prenom")).trim(),
      telephone: String(formData.get("telephone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      statut: statut as "PERMANENT" | "VACATAIRE",
      tauxHoraireSpecifique: formData.get("tauxHoraireSpecifique")
        ? Number(formData.get("tauxHoraireSpecifique"))
        : null,
      salaireFixeMensuel: salaireFixe ? Number(salaireFixe) : null,
      // quota saisi en heures a l'ecran, stocke en minutes
      quotaHeuresMensuelMin: quota ? Math.round(Number(quota) * 60) : null,
    },
  });

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "CREATION_PROFESSEUR",
    tableConcernee: "professeurs",
    idEnregistrement: professeur.id,
    nouvelleValeur: `${professeur.matricule} ${professeur.nom} ${professeur.prenom}`,
  });

  revalidatePath("/admin/professeurs");
}

export async function desactiverProfesseur(professeurId: number) {
  const session = await exigerRole(["ADMIN"]);
  await prisma.professeur.update({ where: { id: professeurId }, data: { actif: false } });
  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "DESACTIVATION_PROFESSEUR",
    tableConcernee: "professeurs",
    idEnregistrement: professeurId,
  });
  revalidatePath("/admin/professeurs");
}

export async function modifierProfesseur(professeurId: number, formData: FormData) {
  const session = await exigerRole(["ADMIN"]);

  const avant = await prisma.professeur.findUniqueOrThrow({ where: { id: professeurId } });
  const statut = String(formData.get("statut"));
  const salaireFixe = formData.get("salaireFixeMensuel");
  const quota = formData.get("quotaHeuresMensuel");

  const apres = await prisma.professeur.update({
    where: { id: professeurId },
    data: {
      nom: String(formData.get("nom")).trim(),
      prenom: String(formData.get("prenom")).trim(),
      telephone: String(formData.get("telephone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      statut: statut as "PERMANENT" | "VACATAIRE",
      tauxHoraireSpecifique: formData.get("tauxHoraireSpecifique") ? Number(formData.get("tauxHoraireSpecifique")) : null,
      salaireFixeMensuel: salaireFixe ? Number(salaireFixe) : null,
      quotaHeuresMensuelMin: quota ? Math.round(Number(quota) * 60) : null,
    },
  });

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "MODIFICATION_PROFESSEUR",
    tableConcernee: "professeurs",
    idEnregistrement: professeurId,
    ancienneValeur: JSON.stringify({ nom: avant.nom, prenom: avant.prenom, statut: avant.statut, telephone: avant.telephone, email: avant.email }),
    nouvelleValeur: JSON.stringify({ nom: apres.nom, prenom: apres.prenom, statut: apres.statut, telephone: apres.telephone, email: apres.email }),
  });

  revalidatePath("/admin/professeurs");
  redirect("/admin/professeurs");
}

export async function reactiverProfesseur(professeurId: number) {
  const session = await exigerRole(["ADMIN"]);
  await prisma.professeur.update({ where: { id: professeurId }, data: { actif: true } });
  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "REACTIVATION_PROFESSEUR",
    tableConcernee: "professeurs",
    idEnregistrement: professeurId,
  });
  revalidatePath("/admin/professeurs");
}
