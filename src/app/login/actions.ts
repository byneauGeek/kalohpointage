"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifySecret } from "@/lib/crypto";
import { creerSession } from "@/lib/session";

export async function connecter(formData: FormData) {
  const nomUtilisateur = String(formData.get("nomUtilisateur") ?? "").trim();
  const motDePasse = String(formData.get("motDePasse") ?? "");

  const utilisateur = await prisma.utilisateur.findUnique({ where: { nomUtilisateur } });
  if (!utilisateur || !utilisateur.actif || !utilisateur.motDePasseHash || !utilisateur.motDePasseSel) {
    redirect("/login?erreur=1");
  }
  const ok = await verifySecret(motDePasse, utilisateur.motDePasseHash, utilisateur.motDePasseSel);
  if (!ok) {
    redirect("/login?erreur=1");
  }
  if (utilisateur.role !== "ADMIN" && utilisateur.role !== "COMPTABLE") {
    redirect("/login?erreur=1");
  }

  await prisma.utilisateur.update({ where: { id: utilisateur.id }, data: { dernierAcces: new Date() } });
  await creerSession({ userId: utilisateur.id, role: utilisateur.role });
  redirect("/admin");
}
