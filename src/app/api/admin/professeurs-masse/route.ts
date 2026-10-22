import { NextResponse } from "next/server";
import { lireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { enregistrerAudit } from "@/lib/audit";

/** Creation de plusieurs professeurs a la fois depuis le meme formulaire,
 * une ligne par professeur : Matricule;Nom;Prenom;Statut(optionnel).
 * Une ligne invalide ou un matricule deja utilise est signale et ignore -
 * jamais d'arret complet pour une seule ligne en erreur (meme principe que
 * l'import d'emploi du temps : compte rendu explicite ligne par ligne). */
export async function POST(request: Request) {
  const session = await lireSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorise." }, { status: 403 });
  }

  const { lignes: texte } = await request.json();
  const lignes = String(texte ?? "")
    .split("\n")
    .map((l: string) => l.trim())
    .filter((l: string) => l !== "");

  const crees: string[] = [];
  const erreurs: string[] = [];

  for (let i = 0; i < lignes.length; i++) {
    const champs = lignes[i].split(/[;,]/).map((c) => c.trim());
    const [matricule, nom, prenom, statutBrut] = champs;

    if (!matricule || !nom || !prenom) {
      erreurs.push(`Ligne ${i + 1} : format invalide (attendu Matricule;Nom;Prenom;Statut) - '${lignes[i]}'`);
      continue;
    }
    const statut = statutBrut?.toUpperCase() === "PERMANENT" ? "PERMANENT" : "VACATAIRE";

    const existant = await prisma.professeur.findUnique({ where: { matricule } });
    if (existant) {
      erreurs.push(`Ligne ${i + 1} : matricule '${matricule}' deja utilise, ligne ignoree`);
      continue;
    }

    const professeur = await prisma.professeur.create({
      data: { matricule, nom, prenom, statut },
    });
    await enregistrerAudit({
      utilisateurId: session.userId,
      action: "CREATION_PROFESSEUR",
      tableConcernee: "professeurs",
      idEnregistrement: professeur.id,
      nouvelleValeur: `${matricule} ${nom} ${prenom} (creation en masse)`,
    });
    crees.push(`${nom} ${prenom}`);
  }

  return NextResponse.json({ crees, erreurs });
}
