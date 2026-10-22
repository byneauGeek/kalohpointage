import { NextResponse } from "next/server";
import { lireSession } from "@/lib/session";
import { importerEmploiDuTemps } from "@/lib/importEmploiDuTemps";

export async function POST(request: Request) {
  const session = await lireSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorise." }, { status: 403 });
  }

  const formData = await request.formData();
  const fichier = formData.get("fichier") as File | null;
  const professeurId = Number(formData.get("professeurId"));
  const matiereId = Number(formData.get("matiereId"));
  const dateDebutValidite = String(formData.get("dateDebutValidite") ?? "");
  const dateFinValidite = String(formData.get("dateFinValidite") ?? "");

  if (!fichier || !professeurId || !matiereId || !dateDebutValidite) {
    return NextResponse.json({ erreur: "Champs obligatoires manquants (fichier, professeur, matiere, date de debut)." }, { status: 400 });
  }

  const buffer = Buffer.from(await fichier.arrayBuffer());

  try {
    const resultat = await importerEmploiDuTemps({
      buffer,
      professeurId,
      matiereId,
      dateDebutValidite: new Date(dateDebutValidite),
      dateFinValidite: dateFinValidite ? new Date(dateFinValidite) : null,
      nomFichier: fichier.name,
      importeParId: session.userId,
    });
    return NextResponse.json(resultat);
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : "Erreur inattendue pendant l'import.";
    return NextResponse.json({ erreur: message }, { status: 500 });
  }
}
