"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerRole } from "@/lib/auth";
import { hashSecret, verifySecret } from "@/lib/crypto";
import { enregistrerAudit } from "@/lib/audit";

/** Changement d'identifiant et/ou de mot de passe par l'utilisateur
 * lui-meme (ADMIN ou COMPTABLE) - exige le mot de passe actuel, jamais une
 * simple reinitialisation par un tiers (voir definirPinProfesseur pour le
 * cas distinct "reset par l'admin" du PIN professeur). */
export async function modifierMonCompte(formData: FormData) {
  const session = await exigerRole(["ADMIN", "COMPTABLE"]);
  const motDePasseActuel = String(formData.get("motDePasseActuel") ?? "");
  const nouvelIdentifiant = String(formData.get("nouvelIdentifiant") ?? "").trim();
  const nouveauMotDePasse = String(formData.get("nouveauMotDePasse") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  const utilisateur = await prisma.utilisateur.findUnique({ where: { id: session.userId } });
  if (!utilisateur?.motDePasseHash || !utilisateur.motDePasseSel) {
    redirect("/admin/mon-compte?erreur=compte");
  }

  const motDePasseOk = await verifySecret(motDePasseActuel, utilisateur.motDePasseHash, utilisateur.motDePasseSel);
  if (!motDePasseOk) {
    redirect("/admin/mon-compte?erreur=mdp_actuel");
  }

  const identifiantChange = nouvelIdentifiant !== "" && nouvelIdentifiant !== utilisateur.nomUtilisateur;
  const motDePasseChange = nouveauMotDePasse !== "";

  if (!identifiantChange && !motDePasseChange) {
    redirect("/admin/mon-compte?erreur=aucune_modif");
  }

  if (motDePasseChange) {
    if (nouveauMotDePasse.length < 8) redirect("/admin/mon-compte?erreur=mdp_court");
    if (nouveauMotDePasse !== confirmation) redirect("/admin/mon-compte?erreur=mdp_confirmation");
  }

  if (identifiantChange) {
    const dejaPris = await prisma.utilisateur.findUnique({ where: { nomUtilisateur: nouvelIdentifiant } });
    if (dejaPris) redirect("/admin/mon-compte?erreur=identifiant_pris");
  }

  const donnees: { nomUtilisateur?: string; motDePasseHash?: string; motDePasseSel?: string } = {};
  if (identifiantChange) donnees.nomUtilisateur = nouvelIdentifiant;
  if (motDePasseChange) {
    const { hash, sel } = await hashSecret(nouveauMotDePasse);
    donnees.motDePasseHash = hash;
    donnees.motDePasseSel = sel;
  }

  await prisma.utilisateur.update({ where: { id: session.userId }, data: donnees });

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "MODIFICATION_COMPTE",
    tableConcernee: "utilisateurs",
    idEnregistrement: session.userId,
    nouvelleValeur: identifiantChange ? nouvelIdentifiant : undefined,
  });

  redirect("/admin/mon-compte?succes=1");
}
