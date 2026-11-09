/**
 * Portage de mdl_MoteurCours (LOT 4) : genere les occurrences de cours (table
 * Cours) a partir de l'emploi du temps, pour une periode donnee, en ignorant
 * les jours non ouvres. Idempotent : repose sur la contrainte unique
 * (professeurId, dateCours, heureDebutPrevueMin, classeId, matiereId) -
 * relancer sur la meme periode ne duplique jamais rien (voir
 * Journal_Decisions.md D08/D29).
 *
 * Implemente en UNE requete SQL brute (generate_series + jointure + INSERT
 * ... ON CONFLICT DO NOTHING) plutot qu'une boucle JS avec un aller-retour
 * reseau par occurrence : sur un emploi du temps reel (plusieurs dizaines de
 * professeurs, annee scolaire complete), ca representait plusieurs milliers
 * d'allers-retours sequentiels vers Neon - largement au-dela du delai
 * d'execution d'une fonction serverless Netlify (constate en production,
 * y compris apres un premier correctif par lots qui restait trop lent).
 * Laisser Postgres faire la generation de dates ET la jointure cote serveur
 * est a la fois plus correct et plus rapide qu'envoyer des milliers de
 * lignes construites cote application.
 */
import { prisma } from "@/lib/db";

function dateSeuleUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function genererCoursPeriode(dateDebut: Date, dateFin: Date) {
  const debut = dateSeuleUTC(dateDebut);
  const fin = dateSeuleUTC(dateFin);

  const [{ total }] = await prisma.$queryRaw<{ total: bigint }[]>`
    SELECT COUNT(*)::bigint AS total
    FROM generate_series(${debut}::timestamp, ${fin}::timestamp, interval '1 day') AS j
    JOIN "emplois_du_temps" e
      ON e."actif" = true
      AND e."jourSemaine" = EXTRACT(ISODOW FROM j)
      AND e."dateDebutValidite" <= j
      AND (e."dateFinValidite" IS NULL OR e."dateFinValidite" >= j)
    WHERE j::date NOT IN (
      SELECT "dateJour"::date FROM "jours_non_ouvres" WHERE "dateJour" BETWEEN ${debut}::timestamp AND ${fin}::timestamp
    )
  `;

  // dureePrevueMin : duree PAYEE du creneau, pas sa duree d'horloge brute.
  // Chaque "periode" de la grille horaire (periodes_grille) vaut 1h PLEINE
  // pour la paie, meme si elle ne dure que 55 min sur l'horloge (ex.
  // 7h30-8h25) - les 5 min restantes sont la recreation entre deux cours,
  // jamais du temps de cours en moins (demande explicite de
  // l'etablissement). Si le creneau correspond exactement a une ou
  // plusieurs periodes CONSECUTIVES de la grille (du debut a la fin, sans
  // trou ni depassement), compte nbPeriodes x 60. Sinon (creneau sans
  // correspondance connue dans la grille), retombe sur la duree d'horloge
  // brute, seule info disponible.
  const nbCrees = await prisma.$executeRaw`
    INSERT INTO "cours" ("emploiDuTempsId", "professeurId", "classeId", "matiereId", "dateCours", "heureDebutPrevueMin", "heureFinPrevueMin", "dureePrevueMin")
    SELECT
      e."id", e."professeurId", e."classeId", e."matiereId", j::date, e."heureDebutMin", e."heureFinMin",
      COALESCE(
        (SELECT CASE
           WHEN COUNT(*) > 0
             AND MIN(pg."heureDebutMin") = e."heureDebutMin"
             AND MAX(pg."heureFinMin") = e."heureFinMin"
             AND SUM(pg."heureFinMin" - pg."heureDebutMin") = (e."heureFinMin" - e."heureDebutMin")
           THEN COUNT(*) * 60
           ELSE NULL
         END
         FROM "periodes_grille" pg
         WHERE pg."actif" = true AND pg."heureDebutMin" >= e."heureDebutMin" AND pg."heureFinMin" <= e."heureFinMin"
        ),
        e."heureFinMin" - e."heureDebutMin"
      )
    FROM generate_series(${debut}::timestamp, ${fin}::timestamp, interval '1 day') AS j
    JOIN "emplois_du_temps" e
      ON e."actif" = true
      AND e."jourSemaine" = EXTRACT(ISODOW FROM j)
      AND e."dateDebutValidite" <= j
      AND (e."dateFinValidite" IS NULL OR e."dateFinValidite" >= j)
    WHERE j::date NOT IN (
      SELECT "dateJour"::date FROM "jours_non_ouvres" WHERE "dateJour" BETWEEN ${debut}::timestamp AND ${fin}::timestamp
    )
    ON CONFLICT ("professeurId", "dateCours", "heureDebutPrevueMin", "classeId", "matiereId") DO NOTHING
  `;

  return { nbCrees, nbIgnores: Number(total) - nbCrees };
}
