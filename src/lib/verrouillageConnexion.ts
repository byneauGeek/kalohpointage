import { prisma } from "@/lib/db";

/** Protection anti-brute-force sur la connexion ADMIN/COMPTABLE - meme
 * principe que compteBloquePourPin (src/lib/pointage.ts) mais pour le
 * mot de passe du back-office, desormais expose publiquement sur internet
 * (Netlify). Seuil plus tolerant que le PIN (mots de passe plus longs,
 * tres peu de comptes admin/comptable au total - une erreur de frappe ne
 * doit pas bloquer trop vite). Ne s'applique qu'aux identifiants qui
 * existent reellement : un identifiant inconnu ne peut pas etre "bloque"
 * (rien a proteger), ce qui evite aussi de polluer l'audit avec des
 * identifiants invente par un attaquant qui tente l'enumeration. */
export const MAX_TENTATIVES_CONNEXION = 5;
export const DELAI_BLOCAGE_CONNEXION_MIN = 15;

export async function compteBloquePourConnexion(utilisateurId: number): Promise<boolean> {
  const depuis = new Date(Date.now() - DELAI_BLOCAGE_CONNEXION_MIN * 60000);
  const echecsRecents = await prisma.audit.count({
    where: { utilisateurId, action: "ECHEC_CONNEXION", dateHeure: { gte: depuis } },
  });
  return echecsRecents >= MAX_TENTATIVES_CONNEXION;
}
