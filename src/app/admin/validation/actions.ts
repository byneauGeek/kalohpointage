"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { exigerRole } from "@/lib/auth";
import { appliquerReglesValidation, traiterAnomalie } from "@/lib/validation";
import { enregistrerAudit } from "@/lib/audit";
import { notifierAnomaliesATraiter } from "@/lib/notifications";

export async function appliquerReglesAction() {
  const session = await exigerRole(["ADMIN"]);
  const regle = await prisma.regleValidation.findFirst({ where: { actif: true }, orderBy: { dateApplication: "desc" } });
  if (!regle) throw new Error("Aucune regle de validation active.");

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
}

export async function resoudreAnomalieAction(formData: FormData) {
  const session = await exigerRole(["ADMIN"]);
  await traiterAnomalie({
    coursId: Number(formData.get("coursId")),
    decision: String(formData.get("decision")) as "VALIDER" | "REJETER",
    dureeValideeMin: formData.get("dureeValideeMin") ? Number(formData.get("dureeValideeMin")) : undefined,
    motif: String(formData.get("motif") ?? ""),
    utilisateurId: session.userId,
  });
  revalidatePath("/admin/validation");
}
