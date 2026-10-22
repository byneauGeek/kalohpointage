"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { exigerRole } from "@/lib/auth";
import { hashSecret } from "@/lib/crypto";
import { enregistrerAudit } from "@/lib/audit";

export async function creerCompteAdminOuComptable(formData: FormData) {
  const session = await exigerRole(["ADMIN"]);
  const motDePasse = String(formData.get("motDePasse") ?? "");
  if (motDePasse.length < 8) throw new Error("Le mot de passe doit comporter au moins 8 caractères.");

  const { hash, sel } = await hashSecret(motDePasse);
  const utilisateur = await prisma.utilisateur.create({
    data: {
      role: String(formData.get("role")) as "ADMIN" | "COMPTABLE",
      nomUtilisateur: String(formData.get("nomUtilisateur")).trim(),
      motDePasseHash: hash,
      motDePasseSel: sel,
    },
  });

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "CREATION_UTILISATEUR",
    tableConcernee: "utilisateurs",
    idEnregistrement: utilisateur.id,
    nouvelleValeur: utilisateur.nomUtilisateur ?? undefined,
  });
  revalidatePath("/admin/utilisateurs");
}

/** Definir/redefinir le PIN d'un professeur - indispensable pour qu'il
 * puisse pointer (voir Guide_Installation.md §6.4). */
export async function definirPinProfesseur(formData: FormData) {
  const session = await exigerRole(["ADMIN"]);
  const professeurId = Number(formData.get("professeurId"));
  const pin = String(formData.get("pin") ?? "");
  if (!/^\d{4,8}$/.test(pin)) throw new Error("Le PIN doit comporter 4 à 8 chiffres.");

  const { hash, sel } = await hashSecret(pin);

  await prisma.utilisateur.upsert({
    where: { professeurId },
    create: { role: "PROFESSEUR", professeurId, codePinHash: hash, codePinSel: sel },
    update: { codePinHash: hash, codePinSel: sel, actif: true },
  });

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "DEFINITION_PIN",
    tableConcernee: "professeurs",
    idEnregistrement: professeurId,
  });
  revalidatePath("/admin/utilisateurs");
}
