"use server";
import { revalidatePath } from "next/cache";
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
