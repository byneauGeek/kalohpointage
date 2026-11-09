"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigerRole } from "@/lib/auth";
import { enregistrerAudit } from "@/lib/audit";

export async function creerPeriode(formData: FormData) {
  await exigerRole(["ADMIN"]);
  const libelle = String(formData.get("libelle") ?? "").trim();
  const dateDebut = new Date(String(formData.get("dateDebut")));
  const dateFin = new Date(String(formData.get("dateFin")));
  if (!libelle || Number.isNaN(dateDebut.getTime()) || Number.isNaN(dateFin.getTime())) {
    redirect("/admin/periodes?erreur=invalide");
  }
  if (dateFin < dateDebut) {
    redirect("/admin/periodes?erreur=ordre");
  }

  await prisma.periode.create({ data: { libelle, dateDebut, dateFin } });
  revalidatePath("/admin/periodes");
  redirect("/admin/periodes?succes=creee");
}

export async function cloturerPeriode(periodeId: number) {
  const session = await exigerRole(["ADMIN"]);

  const periode = await prisma.periode.findUniqueOrThrow({ where: { id: periodeId } });

  const anomalies = await prisma.cours.count({
    where: { dateCours: { gte: periode.dateDebut, lte: periode.dateFin }, statut: "A_CONTROLER" },
  });
  if (anomalies > 0) {
    redirect(`/admin/periodes?erreur=anomalies&periodeId=${periodeId}`);
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
  redirect("/admin/periodes?succes=cloturee");
}

export async function reouvrirPeriode(formData: FormData) {
  const session = await exigerRole(["ADMIN"]);
  const periodeId = Number(formData.get("periodeId"));
  const motif = String(formData.get("motif") ?? "").trim();
  if (!motif) redirect("/admin/periodes?erreur=motif");

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
  redirect("/admin/periodes?succes=reouverte");
}
