"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Wand2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

type Periode = { id: number; ordre: number; libelle: string };
type Placement = {
  affectationId: number;
  classeId: number;
  classeNom: string;
  matiereId: number;
  matiereLibelle: string;
  professeurId: number;
  professeurNom: string;
  jourSemaine: number;
  periodeGrilleId: number;
  periodeLibelle: string;
  heureDebutMin: number;
  heureFinMin: number;
};
type NonPlacee = { classeNom: string; matiereLibelle: string; professeurNom: string; motif: string };
type Resultat = { placements: Placement[]; nonPlacees: NonPlacee[]; affectationIds: number[] };

export default function GenerateurPanel({ periodes }: { periodes: Periode[] }) {
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [application, setApplication] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [messageApplication, setMessageApplication] = useState<string | null>(null);

  async function generer() {
    setEnCours(true);
    setErreur(null);
    setMessageApplication(null);
    const reponse = await fetch("/api/admin/generer-emploi-du-temps", { method: "POST" });
    const data = await reponse.json();
    setEnCours(false);
    if (!reponse.ok) {
      setErreur(data.erreur ?? "Erreur lors de la génération.");
      setResultat(null);
      return;
    }
    setResultat(data);
  }

  async function appliquer() {
    if (!resultat) return;
    setApplication(true);
    setErreur(null);
    const reponse = await fetch("/api/admin/appliquer-emploi-du-temps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placements: resultat.placements, affectationIds: resultat.affectationIds }),
    });
    const data = await reponse.json();
    setApplication(false);
    if (!reponse.ok) {
      setErreur(data.erreur ?? "Erreur lors de l'application.");
      return;
    }
    setMessageApplication(
      `${data.nbCreneaux} créneau(x) créé(s) pour ${data.nbCouples} couple(s) classe/matière. L'emploi du temps est à jour.`
    );
  }

  const placementsParClasse = useMemo(() => {
    if (!resultat) return new Map<string, Placement[]>();
    const m = new Map<string, Placement[]>();
    for (const p of resultat.placements) {
      if (!m.has(p.classeNom)) m.set(p.classeNom, []);
      m.get(p.classeNom)!.push(p);
    }
    return m;
  }, [resultat]);

  return (
    <div>
      <Button type="button" onClick={generer} disabled={enCours || application}>
        {enCours ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
        {enCours ? "Génération en cours…" : "Générer"}
      </Button>

      {erreur && (
        <p className="mt-4 rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">{erreur}</p>
      )}

      {messageApplication && (
        <div className="mt-4 rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-sm text-[var(--color-success)]">
          <p>{messageApplication}</p>
          <Link href="/admin/cours" className="mt-1 inline-block underline">
            Générer les cours correspondants →
          </Link>
        </div>
      )}

      {resultat && !messageApplication && (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <p className="flex items-center gap-1.5 text-sm text-[var(--color-success)]">
              <CheckCircle2 size={16} />
              {resultat.placements.length} créneau(x) généré(s)
            </p>
            {resultat.nonPlacees.length > 0 && (
              <p className="flex items-center gap-1.5 text-sm text-[var(--color-warning)]">
                <AlertTriangle size={16} />
                {resultat.nonPlacees.length} séance(s) non placée(s)
              </p>
            )}
            <Button type="button" size="sm" onClick={appliquer} disabled={application}>
              {application ? <Loader2 size={14} className="animate-spin" /> : null}
              {application ? "Application…" : "Appliquer ce résultat"}
            </Button>
          </div>

          {resultat.nonPlacees.length > 0 && (
            <div className="mb-6 rounded-lg bg-[var(--color-warning-bg)] px-3 py-2 text-sm text-[var(--color-warning)]">
              <ul className="list-inside list-disc">
                {resultat.nonPlacees.map((n, i) => (
                  <li key={i}>
                    {n.classeNom} — {n.matiereLibelle} ({n.professeurNom}) : {n.motif}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-6">
            {Array.from(placementsParClasse.entries()).map(([classeNom, placements]) => (
              <div key={classeNom}>
                <h3 className="mb-2 text-sm font-semibold text-[var(--color-navy-900)]">{classeNom}</h3>
                <table className="border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="w-16 border border-[var(--color-navy-900)]/10 bg-[var(--color-navy-900)]/5 px-2 py-1 text-left font-medium">
                        Période
                      </th>
                      {JOURS.map((j) => (
                        <th key={j} className="border border-[var(--color-navy-900)]/10 bg-[var(--color-navy-900)]/5 px-2 py-1 font-medium">
                          {j}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {periodes.map((p) => (
                      <tr key={p.id}>
                        <td className="border border-[var(--color-navy-900)]/10 px-2 py-1 font-medium text-[var(--color-navy-900)]/60">
                          {p.libelle}
                        </td>
                        {JOURS.map((_, idx) => {
                          const jourSemaine = idx + 1;
                          const placement = placements.find((pl) => pl.jourSemaine === jourSemaine && pl.periodeGrilleId === p.id);
                          return (
                            <td key={jourSemaine} className="border border-[var(--color-navy-900)]/10 px-2 py-1 text-center">
                              {placement ? (
                                <span>
                                  {placement.matiereLibelle}
                                  <br />
                                  <span className="text-[var(--color-navy-900)]/50">{placement.professeurNom}</span>
                                </span>
                              ) : (
                                ""
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
