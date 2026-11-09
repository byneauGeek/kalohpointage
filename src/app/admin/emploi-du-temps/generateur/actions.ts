"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { exigerRole } from "@/lib/auth";
import { enregistrerAudit } from "@/lib/audit";
import { CLE_MAX_SEANCES_JOUR, CLE_MAX_PERIODES_JOUR_PROF } from "@/lib/parametresGenerateur";

/** Les deux plafonds du generateur automatique (voir
 * src/lib/generateurEmploiDuTemps.ts) - stockes comme de simples parametres
 * cle/valeur, coherent avec NOM_ETABLISSEMENT (src/app/admin/parametres). */
export async function enregistrerReglesGenerateur(formData: FormData) {
  const session = await exigerRole(["ADMIN"]);
  const maxSeances = String(formData.get("maxSeancesJour") ?? "2");
  const maxPeriodes = String(formData.get("maxPeriodesJour") ?? "6");

  await prisma.$transaction([
    prisma.parametre.upsert({ where: { cle: CLE_MAX_SEANCES_JOUR }, create: { cle: CLE_MAX_SEANCES_JOUR, valeur: maxSeances }, update: { valeur: maxSeances } }),
    prisma.parametre.upsert({ where: { cle: CLE_MAX_PERIODES_JOUR_PROF }, create: { cle: CLE_MAX_PERIODES_JOUR_PROF, valeur: maxPeriodes }, update: { valeur: maxPeriodes } }),
  ]);

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "MODIFICATION_PARAMETRES",
    tableConcernee: "parametres",
    nouvelleValeur: `generateur : max ${maxSeances} seance(s)/jour meme matiere, max ${maxPeriodes} periode(s)/jour par professeur`,
  });
  revalidatePath("/admin/emploi-du-temps/generateur");
}
