import { NextResponse } from "next/server";
import { lireSession } from "@/lib/session";
import { genererCoursPeriode } from "@/lib/coursEngine";
import { enregistrerAudit } from "@/lib/audit";

/** Genere les cours pour UNE SOUS-PERIODE (quelques semaines au plus) -
 * appelee plusieurs fois en sequence par GenererCoursForm (composant client)
 * pour couvrir une periode plus large sans depasser le delai d'execution
 * d'une fonction serverless Netlify. Voir src/lib/coursEngine.ts pour le
 * detail de la requete et son historique (deux correctifs precedents
 * insuffisants sur une annee scolaire complete en une seule requete). */
export async function POST(request: Request) {
  const session = await lireSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorise." }, { status: 403 });
  }

  const { dateDebut, dateFin } = await request.json();
  if (!dateDebut || !dateFin) {
    return NextResponse.json({ erreur: "Parametres manquants." }, { status: 400 });
  }

  const resultat = await genererCoursPeriode(new Date(dateDebut), new Date(dateFin));

  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "GENERATION_COURS",
    motif: `Periode ${dateDebut} au ${dateFin} : ${resultat.nbCrees} crees, ${resultat.nbIgnores} deja existants`,
  });

  return NextResponse.json(resultat);
}
