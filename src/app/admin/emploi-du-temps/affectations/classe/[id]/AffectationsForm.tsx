"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Trash2, Loader2, Save, Wand2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type Ligne = { id?: number; matiereId: string; professeurId: string; seancesParSemaine: string };
type Option = { id: number; label: string };
const LIGNE_VIDE: Ligne = { matiereId: "", professeurId: "", seancesParSemaine: "" };

export default function AffectationsForm({
  classeId,
  matieres,
  professeurs,
  affectationsInitiales,
  suggestions,
}: {
  classeId: number;
  matieres: Option[];
  professeurs: Option[];
  affectationsInitiales: Ligne[];
  suggestions: Ligne[];
}) {
  const router = useRouter();
  const [lignes, setLignes] = useState<Ligne[]>(affectationsInitiales.length > 0 ? affectationsInitiales : [{ ...LIGNE_VIDE }]);
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

  function preRemplir() {
    setLignes((l) => {
      const base = l.filter((ligne) => ligne.matiereId || ligne.professeurId || ligne.seancesParSemaine);
      return [...base, ...suggestions];
    });
  }

  async function soumettre() {
    setErreurs(null);
    setSucces(null);
    const lignesCompletes = lignes.filter((l) => l.matiereId && l.professeurId && l.seancesParSemaine);
    if (lignesCompletes.length === 0) {
      setErreurs(["Complétez au moins une ligne (matière, professeur, séances/semaine)."]);
      return;
    }

    setEnvoi(true);
    const reponse = await fetch("/api/admin/affectations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classeId,
        lignes: lignesCompletes.map((l) => ({
          id: l.id,
          matiereId: Number(l.matiereId),
          professeurId: Number(l.professeurId),
          seancesParSemaine: Number(l.seancesParSemaine),
        })),
      }),
    });
    const data = await reponse.json();
    setEnvoi(false);

    if (!reponse.ok) {
      setErreurs(data.erreurs ?? [data.erreur ?? "Erreur lors de l'enregistrement."]);
      return;
    }

    setSucces(`Affectations enregistrées : ${data.nbAffectations} active(s).`);
    router.refresh();
  }

  return (
    <Card className="max-w-4xl">
      <CardTitle>Matières, professeurs et quotas</CardTitle>
      <p className="mb-4 text-sm text-[var(--color-navy-900)]/55">
        Une seule ligne par matière. Les séances/semaine sont des périodes de la grille horaire (pas des heures) -
        c&apos;est ce quota que le générateur automatique essaiera de placer dans la semaine.
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

      {suggestions.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-[var(--color-gold-300)]/15 px-3 py-2">
          <p className="text-sm text-[var(--color-navy-900)]/70">
            {suggestions.length} matière(s) déjà présentes dans l&apos;emploi du temps actuel de cette classe, pas encore affectées ici.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={preRemplir}>
            <Wand2 size={14} />
            Pré-remplir
          </Button>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2">
        <div className="grid grid-cols-[1fr_1fr_110px_auto] items-end gap-2 text-xs font-medium text-[var(--color-navy-900)]/50">
          <span>Matière</span>
          <span>Professeur</span>
          <span>Séances/sem.</span>
          <span></span>
        </div>
        {lignes.map((ligne, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_110px_auto] items-center gap-2">
            <Select value={ligne.matiereId} onChange={(e) => majLigne(i, "matiereId", e.target.value)}>
              <option value="">Matière…</option>
              {matieres.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </Select>
            <Select value={ligne.professeurId} onChange={(e) => majLigne(i, "professeurId", e.target.value)}>
              <option value="">Professeur…</option>
              {professeurs.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </Select>
            <Input
              type="number"
              min={1}
              max={30}
              value={ligne.seancesParSemaine}
              onChange={(e) => majLigne(i, "seancesParSemaine", e.target.value)}
            />
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
          Ajouter une matière
        </Button>
      </div>

      <Button type="button" onClick={soumettre} disabled={envoi}>
        {envoi ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {envoi ? "Enregistrement…" : "Enregistrer les affectations"}
      </Button>
    </Card>
  );
}
