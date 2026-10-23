"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { exigerRole } from "@/lib/auth";
import { enregistrerAudit } from "@/lib/audit";

/** Ajoute une saisie manuelle d'heures (rattrapage pre-mise en service ou
 * toute autre regularisation) pour un professeur sur une periode - voir
 * prisma/schema.prisma (SaisieHeuresManuelle) et calculerComptabilisation
 * pour comment ca s'integre au calcul des honoraires. Motif obligatoire,
 * toujours trace a l'audit : meme garde-fou que toute correction manuelle
 * de donnees dans l'application. */
export async function ajouterSaisieManuelle(formData: FormData) {
  const session = await exigerRole(["ADMIN"]);
  const professeurId = Number(formData.get("professeurId"));
  const periodeId = Number(formData.get("periodeId"));
  const heures = Number(formData.get("heures"));
  const motif = String(formData.get("motif") ?? "").trim();

  if (!professeurId || !periodeId) {
    redirect(`/admin/heures-manuelles?periodeId=${periodeId}&erreur=champs`);
  }
  if (!heures || heures <= 0) {
    redirect(`/admin/heures-manuelles?periodeId=${periodeId}&erreur=heures`);
  }
  if (!motif) {
    redirect(`/admin/heures-manuelles?periodeId=${periodeId}&erreur=motif`);
  }

  const saisie = await prisma.saisieHeuresManuelle.create({
    data: {
      professeurId,
      periodeId,
      heuresMin: Math.round(heures * 60),
      motif,
      saisieParId: session.userId,
    },
  });

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "SAISIE_HEURES_MANUELLE",
    tableConcernee: "saisies_heures_manuelles",
    idEnregistrement: saisie.id,
    nouvelleValeur: `${heures} h`,
    motif,
  });

  revalidatePath("/admin/heures-manuelles");
  revalidatePath("/admin/comptabilisation");
  redirect(`/admin/heures-manuelles?periodeId=${periodeId}&succes=1`);
}

/** Supprime une saisie manuelle - reservee a l'admin, journalisee (motif
 * et montant d'origine conserves dans l'entree d'audit avant suppression). */
export async function supprimerSaisieManuelle(formData: FormData) {
  const session = await exigerRole(["ADMIN"]);
  const id = Number(formData.get("id"));
  const periodeId = Number(formData.get("periodeId"));

  const saisie = await prisma.saisieHeuresManuelle.findUnique({ where: { id } });
  if (!saisie) redirect(`/admin/heures-manuelles?periodeId=${periodeId}`);

  await prisma.saisieHeuresManuelle.delete({ where: { id } });

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "SUPPRESSION_HEURES_MANUELLE",
    tableConcernee: "saisies_heures_manuelles",
    idEnregistrement: id,
    ancienneValeur: `${(saisie.heuresMin / 60).toFixed(2)} h — ${saisie.motif}`,
  });

  revalidatePath("/admin/heures-manuelles");
  revalidatePath("/admin/comptabilisation");
  redirect(`/admin/heures-manuelles?periodeId=${periodeId}&succes=supprime`);
}
