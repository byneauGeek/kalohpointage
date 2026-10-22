/**
 * Portage de mdl_MoteurCours (LOT 4) : genere les occurrences de cours (table
 * Cours) a partir de l'emploi du temps, pour une periode donnee, en ignorant
 * les jours non ouvres. Idempotent : repose sur la contrainte unique
 * (professeurId, dateCours, heureDebutPrevueMin) - relancer sur la meme
 * periode ne duplique jamais rien (voir Journal_Decisions.md D08/D29).
 */
import { prisma } from "@/lib/db";

function dateSeuleUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function jourSemaineISO(d: Date): number {
  const js = d.getUTCDay(); // 0=dimanche..6=samedi
  return js === 0 ? 7 : js; // 1=lundi..7=dimanche, comme l'emploi du temps
}

export async function genererCoursPeriode(dateDebut: Date, dateFin: Date) {
  const debut = dateSeuleUTC(dateDebut);
  const fin = dateSeuleUTC(dateFin);

  const joursNonOuvres = await prisma.jourNonOuvre.findMany({
    where: { dateJour: { gte: debut, lte: fin } },
  });
  const joursNonOuvresSet = new Set(joursNonOuvres.map((j) => j.dateJour.toISOString().slice(0, 10)));

  const emplois = await prisma.emploiDuTemps.findMany({
    where: {
      actif: true,
      dateDebutValidite: { lte: fin },
      OR: [{ dateFinValidite: null }, { dateFinValidite: { gte: debut } }],
    },
  });

  let nbCrees = 0;
  let nbIgnores = 0;

  for (let d = new Date(debut); d <= fin; d.setUTCDate(d.getUTCDate() + 1)) {
    const jourCourant = new Date(d);
    const cle = jourCourant.toISOString().slice(0, 10);
    if (joursNonOuvresSet.has(cle)) continue;

    const jsISO = jourSemaineISO(jourCourant);
    for (const emploi of emplois) {
      if (emploi.jourSemaine !== jsISO) continue;
      if (jourCourant < dateSeuleUTC(emploi.dateDebutValidite)) continue;
      if (emploi.dateFinValidite && jourCourant > dateSeuleUTC(emploi.dateFinValidite)) continue;

      try {
        await prisma.cours.create({
          data: {
            emploiDuTempsId: emploi.id,
            professeurId: emploi.professeurId,
            classeId: emploi.classeId,
            matiereId: emploi.matiereId,
            dateCours: jourCourant,
            heureDebutPrevueMin: emploi.heureDebutMin,
            heureFinPrevueMin: emploi.heureFinMin,
            dureePrevueMin: emploi.heureFinMin - emploi.heureDebutMin,
          },
        });
        nbCrees++;
      } catch {
        // Violation de la contrainte unique = cours deja genere pour ce
        // professeur/date/heure : idempotence voulue, pas une erreur.
        nbIgnores++;
      }
    }
  }

  return { nbCrees, nbIgnores };
}
