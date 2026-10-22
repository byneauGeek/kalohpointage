"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { exigerRole } from "@/lib/auth";

export async function creerMatiere(formData: FormData) {
  await exigerRole(["ADMIN"]);
  const libelle = String(formData.get("libelle") ?? "").trim();
  if (libelle === "") return;
  await prisma.matiere.create({ data: { libelle } });
  revalidatePath("/admin/matieres");
}
