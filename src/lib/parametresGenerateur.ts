/** Cles Parametre du generateur automatique d'emploi du temps - dans un
 * fichier a part (ni "use server", ni client) car un fichier Server Action
 * ("use server") ne peut exporter que des fonctions async, pas des
 * constantes (src/app/admin/emploi-du-temps/generateur/actions.ts et
 * .../route.ts en ont besoin tous les deux). */
export const CLE_MAX_SEANCES_JOUR = "GENERATEUR_MAX_SEANCES_MEME_MATIERE_JOUR";
export const CLE_MAX_PERIODES_JOUR_PROF = "GENERATEUR_MAX_PERIODES_JOUR_PROF";
