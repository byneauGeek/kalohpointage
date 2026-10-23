/**
 * Portage de mdl_Rapprochement (LOT 6) : constate les faits, ne decide jamais
 * d'une duree validee ou d'un statut final (ca, c'est le role de
 * mdl_Validation / validation.ts). PLANIFIE -> ABSENT si pas d'arrivee passe
 * le delai configure ; ARRIVEE_ENREGISTREE/EN_COURS -> INCOMPLET si l'heure de
 * fin prevue est passee sans pointage de fin.
 *
 * Deux UPDATE en masse (un par transition) plutot qu'une boucle JS avec un
 * update() individuel par cours concerne : sur un emploi du temps genere
 * pour une annee scolaire complete, des milliers de cours peuvent etre
 * PLANIFIE a la fois, meme risque de depassement du delai d'execution d'une
 * fonction serverless que la generation de cours (voir src/lib/coursEngine.ts).
 */
import { prisma } from "@/lib/db";

export async function effectuerRapprochement(regle: { delaiAbsenceMin: number }) {
  const nbAbsents = await prisma.$executeRaw`
    UPDATE "cours"
    SET "statut" = 'ABSENT'
    WHERE "statut" = 'PLANIFIE'
      AND "heureArriveeReelle" IS NULL
      AND "dateCours" + (("heureDebutPrevueMin" + ${regle.delaiAbsenceMin}) * interval '1 minute') < now()
  `;

  const nbIncomplets = await prisma.$executeRaw`
    UPDATE "cours"
    SET "statut" = 'INCOMPLET'
    WHERE "statut" IN ('ARRIVEE_ENREGISTREE', 'EN_COURS')
      AND "heureFinReelle" IS NULL
      AND "dateCours" + ("heureFinPrevueMin" * interval '1 minute') < now()
  `;

  return { nbAbsents, nbIncomplets };
}
