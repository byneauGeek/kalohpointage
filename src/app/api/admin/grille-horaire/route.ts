import { NextResponse } from "next/server";
import { lireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { parseHeureFrancaise } from "@/lib/heureUtils";
import { enregistrerAudit } from "@/lib/audit";

type LigneEntree = { id?: number; libelle: string; heureDebut: string; heureFin: string };

/** Remplace en un seul envoi toute la grille horaire (decoupage en periodes
 * de l'etablissement) - meme semantique "ensemble remplace" que les autres
 * editeurs en masse (voir emploi-du-temps-professeur/route.ts) : les lignes
 * avec un id sont mises a jour, les lignes sans id sont creees, et toute
 * periode active absente de l'envoi est desactivee. L'ordre d'affichage
 * suit l'ordre d'envoi (pas besoin de trier par heure : une periode peut en
 * theorie etre ajoutee hors-sequence). */
export async function POST(request: Request) {
  const session = await lireSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorise." }, { status: 403 });
  }

  const { lignes } = (await request.json()) as { lignes?: LigneEntree[] };
  if (!Array.isArray(lignes) || lignes.length === 0) {
    return NextResponse.json({ erreur: "Au moins une periode est requise." }, { status: 400 });
  }

  const erreurs: string[] = [];
  const resolues: { id?: number; ordre: number; libelle: string; heureDebutMin: number; heureFinMin: number }[] = [];

  for (let i = 0; i < lignes.length; i++) {
    const l = lignes[i];
    const r = i + 1;
    const libelle = (l.libelle ?? "").trim();
    if (!libelle) {
      erreurs.push(`Ligne ${r} : libelle obligatoire.`);
      continue;
    }
    const heureDebutMin = parseHeureFrancaise(l.heureDebut ?? "");
    const heureFinMin = parseHeureFrancaise(l.heureFin ?? "");
    if (heureDebutMin === null || heureFinMin === null) {
      erreurs.push(`Ligne ${r} : heure de début ou de fin invalide.`);
      continue;
    }
    if (heureFinMin <= heureDebutMin) {
      erreurs.push(`Ligne ${r} : l'heure de fin doit être postérieure à l'heure de début.`);
      continue;
    }
    resolues.push({ id: l.id, ordre: i + 1, libelle, heureDebutMin, heureFinMin });
  }

  if (erreurs.length > 0) {
    return NextResponse.json({ erreur: "Erreurs de validation.", erreurs }, { status: 400 });
  }

  const idsConserves = resolues.filter((l) => l.id).map((l) => l.id as number);
  const aCreer = resolues.filter((l) => !l.id);
  const aMettreAJour = resolues.filter((l) => l.id);

  await prisma.$transaction(async (tx) => {
    await tx.periodeGrille.updateMany({
      where: { actif: true, id: idsConserves.length > 0 ? { notIn: idsConserves } : undefined },
      data: { actif: false },
    });

    for (const l of aMettreAJour) {
      await tx.periodeGrille.update({
        where: { id: l.id },
        data: { ordre: l.ordre, libelle: l.libelle, heureDebutMin: l.heureDebutMin, heureFinMin: l.heureFinMin, actif: true },
      });
    }

    if (aCreer.length > 0) {
      await tx.periodeGrille.createMany({
        data: aCreer.map((l) => ({ ordre: l.ordre, libelle: l.libelle, heureDebutMin: l.heureDebutMin, heureFinMin: l.heureFinMin })),
      });
    }
  });

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "MODIFICATION_GRILLE_HORAIRE",
    tableConcernee: "periodes_grille",
    nouvelleValeur: `${resolues.length} periode(s) active(s) apres modification`,
  });

  return NextResponse.json({ ok: true, nbPeriodes: resolues.length });
}
