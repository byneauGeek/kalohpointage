import { NextResponse } from "next/server";
import { lireSession } from "@/lib/session";
import { prisma } from "@/lib/db";

/** Echappe une valeur pour une cellule CSV (RFC 4180) : entoure de
 * guillemets et double les guillemets internes des qu'une virgule, un
 * guillemet ou un retour a la ligne est present. */
function celluleCsv(valeur: unknown): string {
  const texte = valeur === null || valeur === undefined ? "" : String(valeur);
  if (/[",\n]/.test(texte)) return `"${texte.replace(/"/g, '""')}"`;
  return texte;
}

/** Export complet de l'historique d'audit en CSV - permet de conserver une
 * trace hors base avant une eventuelle purge (voir /api/admin/audit-purge),
 * ou simplement pour analyse externe. */
export async function GET() {
  const session = await lireSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorise." }, { status: 403 });
  }

  const entrees = await prisma.audit.findMany({
    include: { utilisateur: true },
    orderBy: { dateHeure: "asc" },
  });

  const entetes = ["Date/heure", "Utilisateur", "Action", "Table", "ID enregistrement", "Ancienne valeur", "Nouvelle valeur", "Motif"];
  const lignes = entrees.map((a) =>
    [
      a.dateHeure.toISOString(),
      a.utilisateur.nomUtilisateur ?? `#${a.utilisateurId}`,
      a.action,
      a.tableConcernee ?? "",
      a.idEnregistrement ?? "",
      a.ancienneValeur ?? "",
      a.nouvelleValeur ?? "",
      a.motif ?? "",
    ]
      .map(celluleCsv)
      .join(",")
  );

  const csv = "﻿" + [entetes.join(","), ...lignes].join("\r\n");
  const nomFichier = `audit-kaloh-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
    },
  });
}
