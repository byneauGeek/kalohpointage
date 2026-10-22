/**
 * Portage de mdl_Pointage.TrouverCoursActuel (LOT 5), etendu (demande
 * explicite de l'etablissement) pour gerer les BLOCS DE COURS ENCHAINES :
 * un professeur qui a plusieurs cours consecutifs (sans heure creuse entre
 * eux) pointe UNE SEULE FOIS "debut de cours" en montant le matin, et UNE
 * SEULE FOIS "fin de cours" quand il redescend (avant une heure creuse ou en
 * fin de journee) - il ne redescend pas pointer entre chaque cours du meme
 * bloc.
 *
 * Un "bloc contigu" est une suite de cours du jour ou chaque cours commence
 * exactement a l'heure ou le precedent se termine (aucun ecart). Des qu'un
 * ecart existe (heure creuse), le bloc s'arrete - le cours suivant appartient
 * a un bloc different, qui exigera un nouveau pointage de debut.
 *
 * - "Debut de cours" marque TOUS les cours du bloc a partir du premier non
 *   pointe comme EN_COURS : seul le PREMIER recoit l'heure reelle du clic
 *   (Now()) ; les suivants recoivent l'heure de debut PREVUE de leur propre
 *   creneau (le professeur etait deja present, pas de retard a mesurer
 *   individuellement).
 * - "Fin de cours" cloture TOUS les cours EN_COURS du bloc courant : seul le
 *   DERNIER recoit l'heure reelle du clic (Now()) ; les precedents recoivent
 *   leur propre heure de fin PREVUE (meme logique symetrique).
 * - Le bouton "Pointer mon arrivee" et le bouton "Pointer ma fin de cours"
 *   suivent la MEME politique de visibilite : disponibles seulement dans les
 *   DELAI_DEBUT_VISIBLE_MIN minutes avant le debut du bloc (resp.
 *   DELAI_FIN_VISIBLE_MIN minutes avant la fin du bloc), ou au-dela - jamais
 *   trop en avance. Avant ce delai, le professeur voit un ecran d'attente,
 *   sans jeton d'action utilisable.
 *
 * NOTE : "aujourd'hui" est calcule a partir de l'heure locale du serveur.
 * En production, fixer le fuseau horaire du serveur (TZ) a celui de
 * l'etablissement pour que la journee du pointage corresponde a la vraie
 * journee scolaire.
 */
import { prisma } from "@/lib/db";
import type { Cours, Classe, Matiere } from "@prisma/client";

export const DELAI_DEBUT_VISIBLE_MIN = 5;
export const DELAI_FIN_VISIBLE_MIN = 5;

/** Protection contre le brute-force du PIN (demandee par la specification
 * d'origine : "echec PIN (3 tentatives) -> retour a l'accueil", mais
 * appliquee ici cote SERVEUR, pas seulement dans l'ecran - D11, jamais une
 * securite reposant uniquement sur l'interface). Au-dela de
 * MAX_TENTATIVES_PIN echecs consecutifs dans la fenetre, le compte est
 * bloque pour les tentatives de PIN pendant DELAI_BLOCAGE_PIN_MIN. */
export const MAX_TENTATIVES_PIN = 3;
export const DELAI_BLOCAGE_PIN_MIN = 5;

/** dernierAcces reinitialise le compteur : seuls les echecs posterieurs a la
 * derniere connexion REUSSIE (et dans la fenetre de temps) comptent, sinon
 * un succes entre deux echecs ne protegerait de rien. */
export async function compteBloquePourPin(utilisateurId: number, dernierAcces: Date | null): Promise<boolean> {
  const depuisFenetre = new Date(Date.now() - DELAI_BLOCAGE_PIN_MIN * 60000);
  const depuis = dernierAcces && dernierAcces > depuisFenetre ? dernierAcces : depuisFenetre;
  const echecsRecents = await prisma.audit.count({
    where: { utilisateurId, action: "ECHEC_PIN", dateHeure: { gte: depuis } },
  });
  return echecsRecents >= MAX_TENTATIVES_PIN;
}

export function aujourdhuiUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function combinerDateEtMinutes(dateCours: Date, minutes: number): Date {
  const d = new Date(dateCours);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d;
}

type CoursAvecRelations = Cours & { classe: Classe; matiere: Matiere };

/** A partir d'une liste de cours du jour (meme statut), DEJA TRIEE par
 * heureDebutPrevueMin croissant et COMMENCANT au cours de depart, retourne
 * le plus long prefixe contigu (chaque cours commence pile a l'heure ou le
 * precedent finit). */
export function blocContigu(coursDepartEtSuivants: CoursAvecRelations[]): CoursAvecRelations[] {
  if (coursDepartEtSuivants.length === 0) return [];
  const bloc = [coursDepartEtSuivants[0]];
  for (let i = 1; i < coursDepartEtSuivants.length; i++) {
    const precedent = bloc[bloc.length - 1];
    if (coursDepartEtSuivants[i].heureDebutPrevueMin === precedent.heureFinPrevueMin) {
      bloc.push(coursDepartEtSuivants[i]);
    } else {
      break;
    }
  }
  return bloc;
}

export type SessionInfo = { classe: string; matiere: string; heureDebutPrevueMin: number; heureFinPrevueMin: number };

export function versSessionInfo(c: CoursAvecRelations): SessionInfo {
  return {
    classe: c.classe.nomClasse,
    matiere: c.matiere.libelle,
    heureDebutPrevueMin: c.heureDebutPrevueMin,
    heureFinPrevueMin: c.heureFinPrevueMin,
  };
}

export type ResultatCoursActuel =
  | { action: "ATTENTE_DEBUT"; anchorCoursId: number; minutesRestantes: number; sessions: SessionInfo[] }
  | { action: "ARRIVEE"; anchorCoursId: number; sessions: SessionInfo[] }
  | { action: "ATTENTE_FIN"; anchorCoursId: number; minutesRestantes: number; sessions: SessionInfo[] }
  | { action: "FIN"; anchorCoursId: number; sessions: SessionInfo[] };

export async function trouverCoursActuel(professeurId: number): Promise<ResultatCoursActuel | null> {
  const today = aujourdhuiUTC();

  const enCoursListe = await prisma.cours.findMany({
    where: { professeurId, dateCours: today, statut: "EN_COURS" },
    orderBy: { heureDebutPrevueMin: "asc" },
    include: { classe: true, matiere: true },
  });

  if (enCoursListe.length > 0) {
    const bloc = blocContigu(enCoursListe);
    const dernier = bloc[bloc.length - 1];
    const finPrevue = combinerDateEtMinutes(dernier.dateCours, dernier.heureFinPrevueMin);
    const minutesRestantes = Math.ceil((finPrevue.getTime() - Date.now()) / 60000);
    const sessions = bloc.map(versSessionInfo);

    if (minutesRestantes > DELAI_FIN_VISIBLE_MIN) {
      return { action: "ATTENTE_FIN", anchorCoursId: bloc[0].id, minutesRestantes, sessions };
    }
    return { action: "FIN", anchorCoursId: bloc[0].id, sessions };
  }

  const planifies = await prisma.cours.findMany({
    where: { professeurId, dateCours: today, statut: "PLANIFIE" },
    orderBy: { heureDebutPrevueMin: "asc" },
    include: { classe: true, matiere: true },
  });
  if (planifies.length === 0) return null;

  const premier = planifies[0];
  const debutPrevu = combinerDateEtMinutes(premier.dateCours, premier.heureDebutPrevueMin);
  const minutesAvant = Math.ceil((debutPrevu.getTime() - Date.now()) / 60000);
  const bloc = blocContigu(planifies);
  const sessions = bloc.map(versSessionInfo);

  if (minutesAvant > DELAI_DEBUT_VISIBLE_MIN) {
    return { action: "ATTENTE_DEBUT", anchorCoursId: premier.id, minutesRestantes: minutesAvant, sessions };
  }
  return { action: "ARRIVEE", anchorCoursId: premier.id, sessions };
}
