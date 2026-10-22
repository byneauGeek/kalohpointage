"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { exigerRole } from "@/lib/auth";
import { enregistrerAudit } from "@/lib/audit";

/** Creation en masse (portage simplifie de mdl_Classes.CreerClassesEnMasse,
 * Journal_Decisions.md D72) : une classe deja existante n'est jamais
 * modifiee ni recreee, elle est simplement ignoree et signalee. */
export async function creerClassesEnMasse(formData: FormData) {
  const session = await exigerRole(["ADMIN"]);
  const noms = String(formData.get("noms") ?? "")
    .split(/[\n,]/)
    .map((n) => n.trim())
    .filter((n) => n !== "");
  const niveau = String(formData.get("niveau") ?? "").trim() || null;

  const existantes = await prisma.classe.findMany({ where: { nomClasse: { in: noms } }, select: { nomClasse: true } });
  const existantesSet = new Set(existantes.map((c) => c.nomClasse));
  const aCreer = noms.filter((n) => !existantesSet.has(n));

  if (aCreer.length > 0) {
    await prisma.classe.createMany({ data: aCreer.map((n) => ({ nomClasse: n, niveau })) });
    await enregistrerAudit({
      utilisateurId: session.userId,
      action: "CREATION_CLASSES_MASSE",
      tableConcernee: "classes",
      nouvelleValeur: aCreer.join(", "),
    });
  }

  revalidatePath("/admin/classes");
}
