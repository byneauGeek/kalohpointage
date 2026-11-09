"use client";
import { useState } from "react";
import { Label, Select } from "@/components/ui/Field";

type Option = { id: number; label: string };

/** Champ matiere du formulaire de modification d'un creneau : par defaut un
 * simple Select (une matiere), mais une case a cocher permet de passer en
 * mode "plusieurs matieres sur ce creneau" (co-enseignement sur la meme
 * classe/horaire) - chaque matiere cochee devient alors sa propre occurrence
 * d'EmploiDuTemps (voir modifierCreneau). Pre-coche automatiquement si ce
 * creneau a deja plus d'une matiere enregistree (siblings). */
export default function MatiereSelecteur({
  matieres,
  matiereIdsInitiaux,
}: {
  matieres: Option[];
  matiereIdsInitiaux: number[];
}) {
  const [multi, setMulti] = useState(matiereIdsInitiaux.length > 1);
  const selectionInitiale = new Set(matiereIdsInitiaux);

  return (
    <div className="col-span-2">
      <div className="mb-2 flex items-center justify-between">
        <Label className="!mb-0">Matière</Label>
        <label className="flex items-center gap-1.5 text-xs text-[var(--color-navy-900)]/60">
          <input
            type="checkbox"
            checked={multi}
            onChange={(e) => setMulti(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--color-gold-500)]"
          />
          Plusieurs matières sur ce créneau
        </label>
      </div>

      {multi ? (
        <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-[var(--color-navy-900)]/15 p-2">
          {matieres.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm text-[var(--color-navy-900)]">
              <input
                type="checkbox"
                name="matiereId"
                value={m.id}
                defaultChecked={selectionInitiale.has(m.id)}
                className="h-3.5 w-3.5 accent-[var(--color-gold-500)]"
              />
              {m.label}
            </label>
          ))}
        </div>
      ) : (
        <Select name="matiereId" defaultValue={matiereIdsInitiaux[0]}>
          {matieres.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}
