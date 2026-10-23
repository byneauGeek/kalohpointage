"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerRole } from "@/lib/auth";
import { enregistrerAudit } from "@/lib/audit";

/** Purge les entrees d'audit anterieures a une date donnee - a utiliser
 * apres avoir telecharge l'export CSV si une trace hors base est souhaitee.
 * Protegee par une confirmation textuelle (irreversible, pas de corbeille) ;
 * l'action de purge elle-meme est journalisee APRES coup (jamais
 * auto-supprimee par sa propre purge, puisqu'elle est creee une fois la
 * suppression terminee). */
export async function purgerAuditAnterieur(formData: FormData) {
  const session = await exigerRole(["ADMIN"]);
  const dateLimiteTexte = String(formData.get("dateLimite") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (confirmation !== "SUPPRIMER") {
    redirect("/admin/audit?erreur=confirmation");
  }
  const dateLimite = new Date(dateLimiteTexte);
  if (!dateLimiteTexte || Number.isNaN(dateLimite.getTime())) {
    redirect("/admin/audit?erreur=date");
  }
  if (dateLimite >= new Date()) {
    redirect("/admin/audit?erreur=date_future");
  }

  const resultat = await prisma.audit.deleteMany({ where: { dateHeure: { lt: dateLimite } } });

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "PURGE_AUDIT",
    tableConcernee: "audit",
    motif: `${resultat.count} entrée(s) antérieure(s) au ${dateLimite.toLocaleDateString("fr-FR")} supprimée(s)`,
  });

  revalidatePath("/admin/audit");
  redirect("/admin/audit?succes=purge");
}
