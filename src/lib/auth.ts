import { redirect } from "next/navigation";
import { lireSession, type SessionPayload } from "@/lib/session";

/** Verification de role cote serveur, a appeler en tete de CHAQUE page/action
 * sensible - jamais seulement le masquage d'un lien (D11). Pas de session ->
 * /login (se connecter) ; session valide mais role insuffisant -> /login
 * avec un message explicite "accès refusé" (pas le meme message qu'un echec
 * de connexion, pour ne pas laisser croire que le compte est invalide). */
export async function exigerRole(roles: Array<SessionPayload["role"]>): Promise<SessionPayload> {
  const session = await lireSession();
  if (!session) {
    redirect("/login");
  }
  if (!roles.includes(session.role)) {
    redirect("/login?erreur=role");
  }
  return session;
}
