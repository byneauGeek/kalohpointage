"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Trash2, Loader2, Save } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Select, Label, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type Ligne = { date: string; heureArrivee: string; heureDepart: string };
type Professeur = { id: number; label: string };

const LIGNE_VIDE: Ligne = { date: "", heureArrivee: "", heureDepart: "" };

function minutesDepuisHHMM(valeur: string): number | null {
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(valeur);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function formatDuree(ligne: Ligne): string {
  const arrivee = minutesDepuisHHMM(ligne.heureArrivee);
  const depart = minutesDepuisHHMM(ligne.heureDepart);
  if (arrivee === null || depart === null || depart <= arrivee) return "—";
  const duree = depart - arrivee;
  return `${(duree / 60).toFixed(2)} h`;
}

export default function SaisieManuelleForm({ professeurs, periodeId }: { professeurs: Professeur[]; periodeId: number }) {
  const router = useRouter();
  const [professeurId, setProfesseurId] = useState("");
  const [motif, setMotif] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([{ ...LIGNE_VIDE }]);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  function majLigne(index: number, champ: keyof Ligne, valeur: string) {
    setLignes((l) => l.map((ligne, i) => (i === index ? { ...ligne, [champ]: valeur } : ligne)));
  }

  function ajouterLigne() {
    setLignes((l) => [...l, { ...LIGNE_VIDE }]);
  }

  function supprimerLigne(index: number) {
    setLignes((l) => (l.length > 1 ? l.filter((_, i) => i !== index) : l));
  }

  async function soumettre() {
    setErreur(null);
    setSucces(null);
    if (!professeurId) {
      setErreur("Sélectionnez un professeur.");
      return;
    }
    if (!motif.trim()) {
      setErreur("Le motif est obligatoire.");
      return;
    }
    const lignesCompletes = lignes.filter((l) => l.date && l.heureArrivee && l.heureDepart);
    if (lignesCompletes.length === 0) {
      setErreur("Ajoutez au moins une ligne complète (date, arrivée, départ).");
      return;
    }

    setEnvoi(true);
    const reponse = await fetch("/api/admin/heures-manuelles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ professeurId: Number(professeurId), periodeId, motif, lignes: lignesCompletes }),
    });
    const data = await reponse.json();
    setEnvoi(false);

    if (!reponse.ok) {
      setErreur(data.erreur ?? "Erreur lors de l'enregistrement.");
      return;
    }

    setSucces(`${data.nbLignes} ligne(s) enregistrée(s).`);
    setProfesseurId("");
    setMotif("");
    setLignes([{ ...LIGNE_VIDE }]);
    router.refresh();
  }

  return (
    <Card className="mb-6 max-w-3xl">
      <CardTitle>Ajouter des saisies</CardTitle>
      <p className="mb-4 text-sm text-[var(--color-navy-900)]/55">
        Une ligne par jour réellement effectué (date, heure d&apos;arrivée, heure de départ) — la durée est calculée
        automatiquement. Ces heures s&apos;ajoutent aux heures validées par le pointage pour le calcul des honoraires.
      </p>

      {succes && (
        <p className="mb-4 rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-sm text-[var(--color-success)]">{succes}</p>
      )}
      {erreur && (
        <p className="mb-4 rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">{erreur}</p>
      )}

      <div className="mb-4">
        <Label>Professeur</Label>
        <Select value={professeurId} onChange={(e) => setProfesseurId(e.target.value)}>
          <option value="">Professeur…</option>
          {professeurs.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </Select>
      </div>

      <div className="mb-4 flex flex-col gap-2">
        <Label>Lignes (une par jour)</Label>
        <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] items-end gap-2 text-xs font-medium text-[var(--color-navy-900)]/50">
          <span>Date</span>
          <span>Arrivée</span>
          <span>Départ</span>
          <span>Durée</span>
          <span></span>
        </div>
        {lignes.map((ligne, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto_auto] items-center gap-2">
            <Input type="date" value={ligne.date} onChange={(e) => majLigne(i, "date", e.target.value)} />
            <Input type="time" value={ligne.heureArrivee} onChange={(e) => majLigne(i, "heureArrivee", e.target.value)} />
            <Input type="time" value={ligne.heureDepart} onChange={(e) => majLigne(i, "heureDepart", e.target.value)} />
            <span className="w-16 text-center font-mono text-xs text-[var(--color-navy-900)]/70">{formatDuree(ligne)}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="!px-2 !py-1 text-[var(--color-danger)]"
              disabled={lignes.length === 1}
              onClick={() => supprimerLigne(i)}
            >
              <Trash2 size={13} />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={ajouterLigne}>
          <PlusCircle size={14} />
          Ajouter une ligne
        </Button>
      </div>

      <div className="mb-4">
        <Label>Motif (obligatoire)</Label>
        <Textarea
          rows={2}
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Ex. : Heures de septembre à octobre, avant la mise en service du système"
        />
      </div>

      <Button type="button" onClick={soumettre} disabled={envoi}>
        {envoi ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {envoi ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </Card>
  );
}
