/**
 * Portage de mdl_Rapprochement (LOT 6) : constate les faits, ne decide jamais
 * d'une duree validee ou d'un statut final (ca, c'est le role de
 * mdl_Validation / validation.ts). PLANIFIE -> ABSENT si pas d'arrivee passe
 * le delai configure ; ARRIVEE_ENREGISTREE/EN_COURS -> INCOMPLET si l'heure de
 * fin prevue est passee sans pointage de fin.
 */
import { prisma } from "@/lib/db";

function combinerDateEtMinutes(dateCours: Date, minutes: number): Date {
  const d = new Date(dateCours);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d;
}

export async function effectuerRapprochement(regle: { delaiAbsenceMin: number }) {
  const maintenant = new Date();
  let nbAbsents = 0;
  let nbIncomplets = 0;

  const planifies = await prisma.cours.findMany({ where: { statut: "PLANIFIE" } });
  for (const c of planifies) {
    const limiteAbsence = combinerDateEtMinutes(c.dateCours, c.heureDebutPrevueMin + regle.delaiAbsenceMin);
    if (maintenant > limiteAbsence && !c.heureArriveeReelle) {
      await prisma.cours.update({ where: { id: c.id }, data: { statut: "ABSENT" } });
      nbAbsents++;
    }
  }

  const enCours = await prisma.cours.findMany({
    where: { statut: { in: ["ARRIVEE_ENREGISTREE", "EN_COURS"] } },
  });
  for (const c of enCours) {
    const finPrevue = combinerDateEtMinutes(c.dateCours, c.heureFinPrevueMin);
    if (maintenant > finPrevue && !c.heureFinReelle) {
      await prisma.cours.update({ where: { id: c.id }, data: { statut: "INCOMPLET" } });
      nbIncomplets++;
    }
  }

  return { nbAbsents, nbIncomplets };
}
