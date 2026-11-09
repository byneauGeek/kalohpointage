"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  if (!regle) redirect("/admin/cours?erreurRapprochement=pas_de_regle");

  const resultat = await effectuerRapprochement({ delaiAbsenceMin: regle.delaiAbsenceMin });
  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "RAPPROCHEMENT",
    motif: `${resultat.nbAbsents} absences, ${resultat.nbIncomplets} incomplets`,
  });
  revalidatePath("/admin/cours");
  redirect(`/admin/cours?succesRapprochement=${resultat.nbAbsents}-${resultat.nbIncomplets}`);
}

/** Supprime les cours (generes par erreur, doublons, test...) sur une plage
 * de dates - jamais les cours VALIDE ou CLOTURE, deja pris en compte dans
 * la paie (voir calculerComptabilisation) : une suppression ne doit jamais
 * pouvoir casser un historique de paie deja etabli. Protegee par une
 * confirmation textuelle, comme cloturerAnneeScolaire, car irreversible. */
export async function supprimerCoursAction(formData: FormData) {
  const session = await exigerRole(["ADMIN"]);

  const dateDebutTexte = String(formData.get("dateDebut") ?? "");
  const dateFinTexte = String(formData.get("dateFin") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (confirmation !== "CONFIRMER") {
    redirect("/admin/cours?erreurSuppression=confirmation");
  }

  const dateDebut = new Date(dateDebutTexte);
  const dateFin = new Date(dateFinTexte);
  if (!dateDebutTexte || !dateFinTexte || Number.isNaN(dateDebut.getTime()) || Number.isNaN(dateFin.getTime())) {
    redirect("/admin/cours?erreurSuppression=date");
  }
  if (dateFin < dateDebut) {
    redirect("/admin/cours?erreurSuppression=ordre");
  }

  const resultat = await prisma.cours.deleteMany({
    where: {
      dateCours: { gte: dateDebut, lte: dateFin },
      statut: { notIn: ["VALIDE", "CLOTURE"] },
    },
  });

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "SUPPRESSION_COURS",
    tableConcernee: "cours",
    motif: `${resultat.count} cours non valides supprimes entre ${dateDebutTexte} et ${dateFinTexte}`,
  });

  revalidatePath("/admin/cours");
  redirect(`/admin/cours?succesSuppression=${resultat.count}`);
}
