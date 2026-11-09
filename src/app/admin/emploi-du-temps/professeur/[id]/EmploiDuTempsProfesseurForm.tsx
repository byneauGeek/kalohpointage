"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Trash2, Loader2, Save } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type LigneInitiale = { id?: number; jourSemaine: string; matiereId: string; heureDebut: string; heureFin: string; classe: string };
// classesSupp/multi : etat client uniquement (classes simultanees - voir
// case "Plusieurs classes"), jamais envoye tel quel au serveur : chaque
// classe (principale + supplementaires) devient sa propre ligne
// EmploiDuTemps/Cours a l'enregistrement (meme jour/horaires/matiere), voir
// soumettre().
type Ligne = LigneInitiale & { classesSupp: string[]; multi: boolean };
type Option = { id: number; label: string };

const JOURS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const LIGNE_VIDE: Ligne = { jourSemaine: "1", matiereId: "", heureDebut: "", heureFin: "", classe: "", classesSupp: [], multi: false };

export default function EmploiDuTempsProfesseurForm({
  professeurId,
  matieres,
  classes,
  creneauxInitiaux,
}: {
  professeurId: number;
  matieres: Option[];
  classes: string[];
  creneauxInitiaux: LigneInitiale[];
}) {
  const router = useRouter();
  const [lignes, setLignes] = useState<Ligne[]>(
    (creneauxInitiaux.length > 0 ? creneauxInitiaux : [LIGNE_VIDE]).map((l) => ({ ...l, classesSupp: [], multi: false }))
  );
  const [envoi, setEnvoi] = useState(false);
  const [erreurs, setErreurs] = useState<string[] | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  function majLigne<K extends keyof Ligne>(index: number, champ: K, valeur: Ligne[K]) {
    setLignes((l) => l.map((ligne, i) => (i === index ? { ...ligne, [champ]: valeur } : ligne)));
  }

  function basculerMulti(index: number) {
    setLignes((l) => l.map((ligne, i) => (i === index ? { ...ligne, multi: !ligne.multi, classesSupp: ligne.multi ? [] : ligne.classesSupp } : ligne)));
  }

  function basculerClasseSupp(index: number, classe: string, coche: boolean) {
    setLignes((l) =>
      l.map((ligne, i) => {
        if (i !== index) return ligne;
        const ensemble = new Set(ligne.classesSupp);
        if (coche) ensemble.add(classe);
        else ensemble.delete(classe);
        return { ...ligne, classesSupp: Array.from(ensemble) };
      })
    );
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
    const lignesCompletes = lignes.filter((l) => l.jourSemaine && l.matiereId && l.heureDebut && l.heureFin && l.classe.trim());
    if (lignesCompletes.length === 0 && lignes.length > 0) {
      setErreurs(["Complétez au moins une ligne (jour, matière, horaires, classe), ou supprimez les lignes vides."]);
      return;
    }

    // Une ligne avec "plusieurs classes" cochee devient une entree par
    // classe selectionnee (principale + supplementaires), toutes avec le
    // meme jour/horaires/matiere - voir le type Ligne ci-dessus.
    const entreesResolues = lignesCompletes.flatMap((l) => {
      const base = { jourSemaine: Number(l.jourSemaine), matiereId: Number(l.matiereId), heureDebut: l.heureDebut, heureFin: l.heureFin };
      const classesSupp = l.multi
        ? Array.from(new Set(l.classesSupp)).filter((c) => c.trim() && c.trim().toLowerCase() !== l.classe.trim().toLowerCase())
        : [];
      return [
        { id: l.id, classe: l.classe, ...base },
        ...classesSupp.map((c) => ({ classe: c, ...base })),
      ];
    });

    setEnvoi(true);
    const reponse = await fetch("/api/admin/emploi-du-temps-professeur", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ professeurId, lignes: entreesResolues }),
    });
    const data = await reponse.json();
    setEnvoi(false);

    if (!reponse.ok) {
      setErreurs(data.erreurs ?? [data.erreur ?? "Erreur lors de l'enregistrement."]);
      return;
    }

    setSucces(`Emploi du temps enregistré : ${data.nbCreneaux} créneau(x) actif(s).`);
    router.refresh();
  }

  return (
    <Card className="max-w-4xl">
      <CardTitle>Créneaux</CardTitle>
      <p className="mb-4 text-sm text-[var(--color-navy-900)]/55">
        Modifiez, ajoutez ou supprimez des lignes puis enregistrez : l&apos;ensemble remplace l&apos;emploi du temps actif de ce
        professeur (toute ligne retirée ici désactive le créneau correspondant). Cochez « Plusieurs classes » sur une
        ligne pour que ce professeur enseigne plusieurs classes à la fois sur ce créneau (classes simultanées).
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

      <datalist id="classes-existantes">
        {classes.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div className="mb-4 flex flex-col gap-2">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] items-end gap-2 text-xs font-medium text-[var(--color-navy-900)]/50">
          <span>Jour</span>
          <span>Matière</span>
          <span>Début</span>
          <span>Fin</span>
          <span>Classe</span>
          <span></span>
        </div>
        {lignes.map((ligne, i) => (
          <div key={i} className="flex flex-col gap-1 rounded-lg border border-transparent p-1 has-[:checked]:border-[var(--color-navy-900)]/10">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] items-center gap-2">
              <Select value={ligne.jourSemaine} onChange={(e) => majLigne(i, "jourSemaine", e.target.value)}>
                {JOURS.slice(1).map((j, idx) => (
                  <option key={j} value={idx + 1}>
                    {j}
                  </option>
                ))}
              </Select>
              <Select value={ligne.matiereId} onChange={(e) => majLigne(i, "matiereId", e.target.value)}>
                <option value="">Matière…</option>
                {matieres.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </Select>
              <Input type="time" value={ligne.heureDebut} onChange={(e) => majLigne(i, "heureDebut", e.target.value)} />
              <Input type="time" value={ligne.heureFin} onChange={(e) => majLigne(i, "heureFin", e.target.value)} />
              <div>
                <Input
                  list="classes-existantes"
                  placeholder="Classe"
                  value={ligne.classe}
                  onChange={(e) => majLigne(i, "classe", e.target.value)}
                />
                <label className="mt-1 flex items-center gap-1 text-[11px] text-[var(--color-navy-900)]/55">
                  <input
                    type="checkbox"
                    checked={ligne.multi}
                    onChange={() => basculerMulti(i)}
                    className="h-3 w-3 accent-[var(--color-gold-500)]"
                  />
                  Plusieurs classes
                </label>
              </div>
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
            {ligne.multi && (
              <div className="ml-[calc(83.33%+0.5rem)] flex max-w-xs flex-wrap gap-2 rounded-lg border border-[var(--color-navy-900)]/15 p-2">
                {classes
                  .filter((c) => c.trim().toLowerCase() !== ligne.classe.trim().toLowerCase())
                  .map((c) => (
                    <label key={c} className="flex items-center gap-1 text-xs text-[var(--color-navy-900)]">
                      <input
                        type="checkbox"
                        checked={ligne.classesSupp.includes(c)}
                        onChange={(e) => basculerClasseSupp(i, c, e.target.checked)}
                        className="h-3 w-3 accent-[var(--color-gold-500)]"
                      />
                      {c}
                    </label>
                  ))}
              </div>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={ajouterLigne}>
          <PlusCircle size={14} />
          Ajouter un créneau
        </Button>
      </div>

      <Button type="button" onClick={soumettre} disabled={envoi}>
        {envoi ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {envoi ? "Enregistrement…" : "Enregistrer l'emploi du temps"}
      </Button>
    </Card>
  );
}
