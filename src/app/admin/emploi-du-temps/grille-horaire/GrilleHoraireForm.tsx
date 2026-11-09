"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Trash2, Loader2, Save } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type Ligne = { id?: number; libelle: string; heureDebut: string; heureFin: string };
const LIGNE_VIDE: Ligne = { libelle: "", heureDebut: "", heureFin: "" };

export default function GrilleHoraireForm({ periodesInitiales }: { periodesInitiales: Ligne[] }) {
  const router = useRouter();
  const [lignes, setLignes] = useState<Ligne[]>(periodesInitiales.length > 0 ? periodesInitiales : [{ ...LIGNE_VIDE }]);
  const [envoi, setEnvoi] = useState(false);
  const [erreurs, setErreurs] = useState<string[] | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  function majLigne(index: number, champ: keyof Ligne, valeur: string) {
    setLignes((l) => l.map((ligne, i) => (i === index ? { ...ligne, [champ]: valeur } : ligne)));
  }

  function ajouterLigne() {
    setLignes((l) => [...l, { ...LIGNE_VIDE }]);
  }

  function supprimerLigne(index: number) {
    setLignes((l) => l.filter((_, i) => i !== index));
  }

  async function soumettre() {
    setErreurs(null);
    setSucces(null);
    const lignesCompletes = lignes.filter((l) => l.libelle.trim() && l.heureDebut && l.heureFin);
    if (lignesCompletes.length === 0) {
      setErreurs(["Au moins une période complète (libellé, début, fin) est requise."]);
      return;
    }

    setEnvoi(true);
    const reponse = await fetch("/api/admin/grille-horaire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lignes: lignesCompletes }),
    });
    const data = await reponse.json();
    setEnvoi(false);

    if (!reponse.ok) {
      setErreurs(data.erreurs ?? [data.erreur ?? "Erreur lors de l'enregistrement."]);
      return;
    }

    setSucces(`Grille enregistrée : ${data.nbPeriodes} période(s) active(s).`);
    router.refresh();
  }

  return (
    <Card className="max-w-2xl">
      <CardTitle>Périodes</CardTitle>
      <p className="mb-4 text-sm text-[var(--color-navy-900)]/55">
        Le découpage horaire de l&apos;établissement, utilisé par le générateur automatique et les écrans
        d&apos;indisponibilité. Une ligne retirée ici désactive la période correspondante.
      </p>

      {succes && (
        <p className="mb-4 rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-sm text-[var(--color-success)]">{succes}</p>
      )}
      {erreurs && erreurs.length > 0 && (
        <ul className="mb-4 list-inside list-disc rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {erreurs.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      <div className="mb-4 flex flex-col gap-2">
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2 text-xs font-medium text-[var(--color-navy-900)]/50">
          <span>Libellé</span>
          <span>Début</span>
          <span>Fin</span>
          <span></span>
        </div>
        {lignes.map((ligne, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
            <Input placeholder="P1" value={ligne.libelle} onChange={(e) => majLigne(i, "libelle", e.target.value)} />
            <Input type="time" value={ligne.heureDebut} onChange={(e) => majLigne(i, "heureDebut", e.target.value)} />
            <Input type="time" value={ligne.heureFin} onChange={(e) => majLigne(i, "heureFin", e.target.value)} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="!px-2 !py-1 text-[var(--color-danger)]"
              onClick={() => supprimerLigne(i)}
            >
              <Trash2 size={13} />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={ajouterLigne}>
          <PlusCircle size={14} />
          Ajouter une période
        </Button>
      </div>

      <Button type="button" onClick={soumettre} disabled={envoi}>
        {envoi ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {envoi ? "Enregistrement…" : "Enregistrer la grille"}
      </Button>
    </Card>
  );
}
