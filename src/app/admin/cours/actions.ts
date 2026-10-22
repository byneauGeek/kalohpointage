"use server";
import { revalidatePath } from "next/cache";
import { exigerRole } from "@/lib/auth";
import { genererCoursPeriode } from "@/lib/coursEngine";
import { effectuerRapprochement } from "@/lib/rapprochement";
import { prisma } from "@/lib/db";
import { enregistrerAudit } from "@/lib/audit";

export async function genererCoursAction(formData: FormData) {
  const session = await exigerRole(["ADMIN"]);
  const dateDebut = new Date(String(formData.get("dateDebut")));
  const dateFin = new Date(String(formData.get("dateFin")));

  const resultat = await genererCoursPeriode(dateDebut, dateFin);
  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "GENERATION_COURS",
    motif: `Periode ${formData.get("dateDebut")} au ${formData.get("dateFin")} : ${resultat.nbCrees} crees, ${resultat.nbIgnores} deja existants`,
  });
  revalidatePath("/admin/cours");
}

export async function effectuerRapprochementAction() {
  const session = await exigerRole(["ADMIN"]);
  const regle = await prisma.regleValidation.findFirst({ where: { actif: true }, orderBy: { dateApplication: "desc" } });
  if (!regle) throw new Error("Aucune regle de validation active - configurez les parametres d'abord.");

  const resultat = await effectuerRapprochement({ delaiAbsenceMin: regle.delaiAbsenceMin });
  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "RAPPROCHEMENT",
    motif: `${resultat.nbAbsents} absences, ${resultat.nbIncomplets} incomplets`,
  });
  revalidatePath("/admin/cours");
}
