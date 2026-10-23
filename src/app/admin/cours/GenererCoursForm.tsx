"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const JOURS_PAR_LOT = 30;

/** Decoupe [debut, fin] en sous-periodes d'au plus JOURS_PAR_LOT jours. */
function decouperPeriode(debut: Date, fin: Date): Array<{ debut: Date; fin: Date }> {
  const lots: Array<{ debut: Date; fin: Date }> = [];
  const curseur = new Date(debut);
  while (curseur <= fin) {
    const finLot = new Date(curseur);
    finLot.setUTCDate(finLot.getUTCDate() + JOURS_PAR_LOT - 1);
    lots.push({ debut: new Date(curseur), fin: finLot > fin ? new Date(fin) : finLot });
    curseur.setUTCDate(curseur.getUTCDate() + JOURS_PAR_LOT);
  }
  return lots;
}

export default function GenererCoursForm() {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [progression, setProgression] = useState<{ fait: number; total: number } | null>(null);
  const [resultat, setResultat] = useState<{ nbCrees: number; nbIgnores: number } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(formData: FormData) {
    const dateDebut = new Date(String(formData.get("dateDebut")));
    const dateFin = new Date(String(formData.get("dateFin")));
    const lots = decouperPeriode(dateDebut, dateFin);

    setEnCours(true);
    setErreur(null);
    setResultat(null);
    setProgression({ fait: 0, total: lots.length });

    let totalCrees = 0;
    let totalIgnores = 0;

    // Sequentiel (pas en parallele) : chaque lot reste sous le delai
    // d'execution d'une fonction serverless, mais plusieurs lots en meme
    // temps surchargeraient inutilement la base pour un gain de temps
    // marginal sur une operation lancee ponctuellement par l'administration.
    for (let i = 0; i < lots.length; i++) {
      const lot = lots[i];
      const reponse = await fetch("/api/admin/generer-cours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateDebut: lot.debut.toISOString().slice(0, 10),
          dateFin: lot.fin.toISOString().slice(0, 10),
        }),
      });
      if (!reponse.ok) {
        const data = await reponse.json().catch(() => ({}));
        setErreur(data.erreur ?? `Echec sur la periode ${lot.debut.toISOString().slice(0, 10)} - ${lot.fin.toISOString().slice(0, 10)}.`);
        setEnCours(false);
        return;
      }
      const data = await reponse.json();
      totalCrees += data.nbCrees;
      totalIgnores += data.nbIgnores;
      setProgression({ fait: i + 1, total: lots.length });
    }

    setResultat({ nbCrees: totalCrees, nbIgnores: totalIgnores });
    setEnCours(false);
    router.refresh();
  }

  return (
    <Card padded className="flex flex-col gap-2">
      <form action={soumettre} className="flex items-end gap-2">
        <div>
          <Label>Du</Label>
          <Input type="date" name="dateDebut" required disabled={enCours} />
        </div>
        <div>
          <Label>Au</Label>
          <Input type="date" name="dateFin" required disabled={enCours} />
        </div>
        <Button type="submit" disabled={enCours}>
          {enCours ? <Loader2 size={16} className="animate-spin" /> : <CalendarPlus size={16} />}
          {enCours ? "Génération…" : "Générer les cours"}
        </Button>
      </form>

      {enCours && progression && (
        <p className="text-xs text-[var(--color-navy-900)]/50">
          Lot {progression.fait}/{progression.total} traité{progression.fait > 1 ? "s" : ""}…
        </p>
      )}
      {resultat && (
        <p className="text-xs text-[var(--color-success)]">
          {resultat.nbCrees} cours créés, {resultat.nbIgnores} déjà existants.
        </p>
      )}
      {erreur && <p className="text-xs text-[var(--color-danger)]">{erreur}</p>}
    </Card>
  );
}
