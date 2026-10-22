import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Liste des professeurs actifs pouvant pointer (PIN defini), pour l'ecran
 * d'accueil du poste kiosque. Aucune information sensible renvoyee. */
export async function GET() {
  const professeurs = await prisma.professeur.findMany({
    where: { actif: true, utilisateur: { codePinHash: { not: null }, actif: true } },
    select: { id: true, nom: true, prenom: true },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });
  return NextResponse.json(professeurs);
}
