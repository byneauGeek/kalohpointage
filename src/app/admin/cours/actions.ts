"use server";
import { revalidatePath } from "next/cache";
import { exigerRole } from "@/lib/auth";
import { effectuerRapprochement } from "@/lib/rapprochement";
import { prisma } from "@/lib/db";
import { enregistrerAudit } from "@/lib/audit";

// La generation de cours est desormais pilotee par GenererCoursForm (client,
// decoupe la periode en lots pour rester sous le delai d'execution d'une
// fonction serverless) via /api/admin/generer-cours - voir ce fichier pour
// l'historique de ce choix.

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
