import { notFound } from "next/navigation";
import { exigerRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import AffectationsForm from "./AffectationsForm";

export default async function PageAffectationsClasse({ params }: { params: Promise<{ id: string }> }) {
  await exigerRole(["ADMIN"]);
  const { id } = await params;
  const classeId = Number(id);

  const [classe, matieres, professeurs, affectations, creneauxActuels] = await Promise.all([
    prisma.classe.findUnique({ where: { id: classeId } }),
    prisma.matiere.findMany({ where: { actif: true }, orderBy: { libelle: "asc" } }),
    prisma.professeur.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
    prisma.affectationEnseignement.findMany({ where: { classeId, actif: true }, orderBy: { id: "asc" } }),
    prisma.emploiDuTemps.findMany({ where: { classeId, actif: true }, select: { matiereId: true, professeurId: true } }),
  ]);
  if (!classe) notFound();

  // Suggestion de pre-remplissage : pour chaque matiere deja presente dans
  // l'emploi du temps ACTUEL de cette classe (saisi via les editeurs
  // existants), le professeur le plus frequent et le nombre de creneaux
  // distincts deja en place - evite de ressaisir a la main ce qui existe
  // deja reellement pour les classes qui ont deja un emploi du temps.
  const comptageParMatiere = new Map<number, Map<number, number>>();
  for (const c of creneauxActuels) {
    if (!comptageParMatiere.has(c.matiereId)) comptageParMatiere.set(c.matiereId, new Map());
    const parProf = comptageParMatiere.get(c.matiereId)!;
    parProf.set(c.professeurId, (parProf.get(c.professeurId) ?? 0) + 1);
  }
  const matieresDejaAffectees = new Set(affectations.map((a) => a.matiereId));
  const suggestions = Array.from(comptageParMatiere.entries())
    .filter(([matiereId]) => !matieresDejaAffectees.has(matiereId))
    .map(([matiereId, parProf]) => {
      const [professeurId, seances] = Array.from(parProf.entries()).sort((a, b) => b[1] - a[1])[0];
      return { matiereId, professeurId, seancesParSemaine: seances };
    });

  return (
    <div>
      <PageHeader
        title={`Affectations — ${classe.nomClasse}`}
        description="Matière par matière : professeur attitré et nombre de séances par semaine à placer."
      />
      <AffectationsForm
        classeId={classe.id}
        matieres={matieres.map((m) => ({ id: m.id, label: m.libelle }))}
        professeurs={professeurs.map((p) => ({ id: p.id, label: `${p.nom} ${p.prenom}` }))}
        affectationsInitiales={affectations.map((a) => ({
          id: a.id,
          matiereId: String(a.matiereId),
          professeurId: String(a.professeurId),
          seancesParSemaine: String(a.seancesParSemaine),
        }))}
        suggestions={suggestions.map((s) => ({
          matiereId: String(s.matiereId),
          professeurId: String(s.professeurId),
          seancesParSemaine: String(s.seancesParSemaine),
        }))}
      />
    </div>
  );
}
