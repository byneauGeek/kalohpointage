"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { exigerRole } from "@/lib/auth";
import { enregistrerAudit } from "@/lib/audit";

export async function creerPeriode(formData: FormData) {
  await exigerRole(["ADMIN"]);
  await prisma.periode.create({
    data: {
      libelle: String(formData.get("libelle")).trim(),
      dateDebut: new Date(String(formData.get("dateDebut"))),
      dateFin: new Date(String(formData.get("dateFin"))),
    },
  });
  revalidatePath("/admin/periodes");
}

export async function cloturerPeriode(periodeId: number) {
  const session = await exigerRole(["ADMIN"]);

  const periode = await prisma.periode.findUniqueOrThrow({ where: { id: periodeId } });

  const anomalies = await prisma.cours.count({
    where: { dateCours: { gte: periode.dateDebut, lte: periode.dateFin }, statut: "A_CONTROLER" },
  });
  if (anomalies > 0) {
    throw new Error("Impossible de clôturer : des anomalies restent non traitées.");
  }

  const regle = await prisma.regleValidation.findFirst({ where: { actif: true }, orderBy: { dateApplication: "desc" } });

  await prisma.$transaction([
    prisma.cours.updateMany({
      where: { dateCours: { gte: periode.dateDebut, lte: periode.dateFin }, statut: { in: ["VALIDE", "NON_VALIDE"] } },
      data: { periodeId },
    }),
    prisma.periode.update({
      where: { id: periodeId },
      data: {
        statut: "CLOTUREE",
        dateCloture: new Date(),
        closeParId: session.userId,
        tauxHoraireApplique: regle?.tauxHoraireGeneral,
      },
    }),
  ]);

  await enregistrerAudit({ utilisateurId: session.userId, action: "CLOTURE_PERIODE", tableConcernee: "periodes", idEnregistrement: periodeId });
  revalidatePath("/admin/periodes");
}

export async function reouvrirPeriode(formData: FormData) {
  const session = await exigerRole(["ADMIN"]);
  const periodeId = Number(formData.get("periodeId"));
  const motif = String(formData.get("motif") ?? "").trim();
  if (!motif) throw new Error("Motif obligatoire pour une réouverture.");

  await prisma.periode.update({
    where: { id: periodeId },
    data: { statut: "OUVERTE", dateReouverture: new Date(), rouverteParId: session.userId, motifReouverture: motif },
  });
  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "REOUVERTURE_PERIODE",
    tableConcernee: "periodes",
    idEnregistrement: periodeId,
    motif,
  });
  revalidatePath("/admin/periodes");
}
