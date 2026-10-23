"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { exigerRole } from "@/lib/auth";
import { enregistrerAudit } from "@/lib/audit";

/** Supprime une saisie manuelle - reservee a l'admin, journalisee (motif
 * et duree d'origine conserves dans l'entree d'audit avant suppression).
 * La creation se fait via /api/admin/heures-manuelles (plusieurs lignes en
 * une fois, voir SaisieManuelleForm) - pas de server action ici car le
 * formulaire est dynamique (nombre de lignes variable). */
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
    ancienneValeur: `${saisie.date.toISOString().slice(0, 10)} ${(saisie.dureeMin / 60).toFixed(2)} h — ${saisie.motif}`,
  });

  revalidatePath("/admin/heures-manuelles");
  revalidatePath("/admin/comptabilisation");
  redirect(`/admin/heures-manuelles?periodeId=${periodeId}&succes=supprime`);
}
