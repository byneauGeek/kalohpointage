"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud, Loader2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Select, Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type Option = { id: number; label: string };
type Resultat = {
  lignesLues: number;
  lignesImportees: number;
  lignesRejetees: number;
  erreurs: string[];
  avertissements: string[];
};

export default function FormulaireImport({ professeurs, matieres }: { professeurs: Option[]; matieres: Option[] }) {
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function soumettre(formData: FormData) {
    setEnCours(true);
    setResultat(null);
    const reponse = await fetch("/api/admin/import-emploi-du-temps", { method: "POST", body: formData });
    const data = await reponse.json();
    setResultat(data);
    setEnCours(false);
  }

  return (
    <Card className="mb-8 max-w-2xl">
      <CardTitle>Importer un emploi du temps (Excel)</CardTitle>
      <p className="mb-4 text-sm text-[var(--color-navy-900)]/55">
        Colonnes dans cet ordre : Jour | Créneau | Heure début | Heure fin | Type | Classe. Seules les lignes
        « Cours » sont importées. Les créneaux partagés entre classes (« 2ndeA/C ») et les variantes d&apos;écriture
        (« 6è2 » = « 6ème2 ») sont reconnus automatiquement.
      </p>
      <form action={(fd) => soumettre(fd)} className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Professeur</Label>
          <Select name="professeurId" required>
            <option value="">Professeur…</option>
            {professeurs.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Matière</Label>
          <Select name="matiereId" required>
            <option value="">Matière…</option>
            {matieres.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Début de validité</Label>
          <Input type="date" name="dateDebutValidite" required />
        </div>
        <div>
          <Label>Fin (optionnel)</Label>
          <Input type="date" name="dateFinValidite" />
        </div>
        <div className="col-span-2">
          <Label>Fichier Excel (.xlsx)</Label>
          <input type="file" name="fichier" accept=".xlsx" required className="block w-full text-sm text-[var(--color-navy-900)]/70 file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-navy-900)]/5 file:px-3 file:py-2 file:text-xs file:font-medium" />
        </div>
        <div className="col-span-2">
          <Button type="submit" disabled={enCours} className="w-full">
            {enCours ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            {enCours ? "Import en cours…" : "Importer"}
          </Button>
        </div>
      </form>

      {resultat && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 overflow-hidden rounded-lg bg-[var(--color-navy-900)]/[0.03] p-3 text-sm"
        >
          <p className="text-[var(--color-navy-900)]/80">
            Lignes lues : {resultat.lignesLues} — importées :{" "}
            <span className="font-semibold text-[var(--color-success)]">{resultat.lignesImportees}</span> — rejetées :{" "}
            <span className="font-semibold text-[var(--color-danger)]">{resultat.lignesRejetees}</span>
          </p>
          {resultat.avertissements.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-[var(--color-warning)]">
              {resultat.avertissements.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          )}
          {resultat.erreurs.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-[var(--color-danger)]">
              {resultat.erreurs.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </motion.div>
      )}
    </Card>
  );
}
