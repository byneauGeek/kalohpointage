"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type Option = { id: number; label: string };
type Periode = { id: number; libelle: string };

export default function PeriodesEviteesForm({
  matieres,
  periodes,
  eviteesParMatiere,
}: {
  matieres: Option[];
  periodes: Periode[];
  eviteesParMatiere: Record<number, number[]>;
}) {
  const router = useRouter();
  const [matiereId, setMatiereId] = useState<string>("");
  const [coches, setCoches] = useState<Set<number>>(new Set());
  const [envoi, setEnvoi] = useState(false);
  const [succes, setSucces] = useState<string | null>(null);

  function choisirMatiere(valeur: string) {
    setMatiereId(valeur);
    setSucces(null);
    setCoches(new Set(valeur ? eviteesParMatiere[Number(valeur)] ?? [] : []));
  }

  function basculer(periodeId: number) {
    setCoches((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(periodeId)) suivant.delete(periodeId);
      else suivant.add(periodeId);
      return suivant;
    });
  }

  async function soumettre() {
    if (!matiereId) return;
    setEnvoi(true);
    setSucces(null);
    const reponse = await fetch("/api/admin/matieres-periodes-evitees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matiereId: Number(matiereId), periodeGrilleIds: Array.from(coches) }),
    });
    setEnvoi(false);
    if (reponse.ok) {
      setSucces("Enregistré.");
      router.refresh();
    }
  }

  return (
    <div>
      <p className="mb-3 text-sm text-[var(--color-navy-900)]/55">
        Périodes à éviter pour une matière (contrainte souple : le générateur essaie, sans garantie absolue).
      </p>
      <div className="mb-3 flex items-center gap-2">
        <Select className="w-auto" value={matiereId} onChange={(e) => choisirMatiere(e.target.value)}>
          <option value="">Matière…</option>
          {matieres.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </Select>
        {succes && <span className="text-sm text-[var(--color-success)]">{succes}</span>}
      </div>

      {matiereId && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {periodes.map((p) => {
              const actif = coches.has(p.id);
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => basculer(p.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    actif
                      ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
                      : "bg-[var(--color-navy-900)]/5 text-[var(--color-navy-900)]/60 hover:bg-[var(--color-navy-900)]/10"
                  }`}
                >
                  {p.libelle}
                </button>
              );
            })}
          </div>
          <Button type="button" size="sm" onClick={soumettre} disabled={envoi}>
            {envoi ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Enregistrer pour cette matière
          </Button>
        </>
      )}
    </div>
  );
}
