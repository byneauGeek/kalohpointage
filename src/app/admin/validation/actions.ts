"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { exigerRole } from "@/lib/auth";
import { appliquerReglesValidation, traiterAnomalie } from "@/lib/validation";
import { enregistrerAudit } from "@/lib/audit";
import { notifierAnomaliesATraiter } from "@/lib/notifications";

export async function appliquerReglesAction() {
  const session = await exigerRole(["ADMIN"]);
  const regle = await prisma.regleValidation.findFirst({ where: { actif: true }, orderBy: { dateApplication: "desc" } });
  if (!regle) redirect("/admin/validation?erreur=pas_de_regle");

  const resultat = await appliquerReglesValidation(regle);
  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "APPLICATION_REGLES_VALIDATION",
    motif: `${resultat.nbValides} valides, ${resultat.nbAControler} a controler`,
  });

  const enTetes = await headers();
  const origine = `${enTetes.get("x-forwarded-proto") ?? "https"}://${enTetes.get("host") ?? ""}`;
  await notifierAnomaliesATraiter(resultat.nbAControler, origine);

  revalidatePath("/admin/validation");
  redirect(`/admin/validation?succes=${resultat.nbValides}-${resultat.nbAControler}`);
}

export async function resoudreAnomalieAction(formData: FormData) {
  const session = await exigerRole(["ADMIN"]);
  const coursId = Number(formData.get("coursId"));
  const motif = String(formData.get("motif") ?? "").trim();
  if (!motif) redirect(`/admin/validation?erreur=motif&coursId=${coursId}`);

  await traiterAnomalie({
    coursId,
    decision: String(formData.get("decision")) as "VALIDER" | "REJETER",
    dureeValideeMin: formData.get("dureeValideeMin") ? Number(formData.get("dureeValideeMin")) : undefined,
    motif,
    utilisateurId: session.userId,
  });
  revalidatePath("/admin/validation");
  redirect("/admin/validation?succes=anomalie_traitee");
}
