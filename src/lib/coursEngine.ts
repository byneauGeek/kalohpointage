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

  // Construit TOUTES les lignes candidates d'abord, puis les insere par lots
  // via createMany/skipDuplicates (une seule requete par lot) plutot qu'un
  // create() individuel par occurrence : sur une periode de plusieurs
  // semaines avec plusieurs professeurs, des centaines d'allers-retours
  // reseau sequentiels vers la base depassent le delai d'une fonction
  // serverless (observe en production). skipDuplicates s'appuie sur la
  // contrainte unique (professeurId, dateCours, heureDebutPrevueMin) pour
  // l'idempotence - memes garanties qu'avant, sans avaler silencieusement
  // une erreur qui ne serait pas un simple doublon.
  const lignes: {
    emploiDuTempsId: number;
    professeurId: number;
    classeId: number;
    matiereId: number;
    dateCours: Date;
    heureDebutPrevueMin: number;
    heureFinPrevueMin: number;
    dureePrevueMin: number;
  }[] = [];

  for (let d = new Date(debut); d <= fin; d.setUTCDate(d.getUTCDate() + 1)) {
    const jourCourant = new Date(d);
    const cle = jourCourant.toISOString().slice(0, 10);
    if (joursNonOuvresSet.has(cle)) continue;

    const jsISO = jourSemaineISO(jourCourant);
    for (const emploi of emplois) {
      if (emploi.jourSemaine !== jsISO) continue;
      if (jourCourant < dateSeuleUTC(emploi.dateDebutValidite)) continue;
      if (emploi.dateFinValidite && jourCourant > dateSeuleUTC(emploi.dateFinValidite)) continue;

      lignes.push({
        emploiDuTempsId: emploi.id,
        professeurId: emploi.professeurId,
        classeId: emploi.classeId,
        matiereId: emploi.matiereId,
        dateCours: jourCourant,
        heureDebutPrevueMin: emploi.heureDebutMin,
        heureFinPrevueMin: emploi.heureFinMin,
        dureePrevueMin: emploi.heureFinMin - emploi.heureDebutMin,
      });
    }
  }

  // Sous la limite de parametres liants de PostgreSQL (65535 / 8 colonnes
  // par ligne ~= 8191) : un lot large minimise le nombre d'allers-retours
  // reseau, qui domine largement le temps total face a une base distante
  // (Neon) - une seule requete pour une periode d'une annee scolaire
  // complete avec plusieurs dizaines de professeurs reste possible.
  const TAILLE_LOT = 8000;
  let nbCrees = 0;
  for (let i = 0; i < lignes.length; i += TAILLE_LOT) {
    const lot = lignes.slice(i, i + TAILLE_LOT);
    const resultat = await prisma.cours.createMany({ data: lot, skipDuplicates: true });
    nbCrees += resultat.count;
  }
  const nbIgnores = lignes.length - nbCrees;

  return { nbCrees, nbIgnores };
}
