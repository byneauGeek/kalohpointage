"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

type Creneau = { jourSemaine: number; periodeGrilleId: number };
type Periode = { id: number; libelle: string };

function cle(c: Creneau): string {
  return `${c.jourSemaine}-${c.periodeGrilleId}`;
}

export default function IndisponibilitesForm({
  professeurId,
  periodes,
  indisponibilitesInitiales,
}: {
  professeurId: number;
  periodes: Periode[];
  indisponibilitesInitiales: Creneau[];
}) {
  const router = useRouter();
  const [coches, setCoches] = useState<Set<string>>(new Set(indisponibilitesInitiales.map(cle)));
  const [envoi, setEnvoi] = useState(false);
  const [succes, setSucces] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  function basculer(jourSemaine: number, periodeGrilleId: number) {
    const k = cle({ jourSemaine, periodeGrilleId });
    setCoches((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(k)) suivant.delete(k);
      else suivant.add(k);
      return suivant;
    });
  }

  async function soumettre() {
    setErreur(null);
    setSucces(null);
    setEnvoi(true);
    const creneaux = Array.from(coches).map((k) => {
      const [jourSemaine, periodeGrilleId] = k.split("-").map(Number);
      return { jourSemaine, periodeGrilleId };
    });
    const reponse = await fetch("/api/admin/indisponibilites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ professeurId, creneaux }),
    });
    const data = await reponse.json();
    setEnvoi(false);
    if (!reponse.ok) {
      setErreur(data.erreur ?? "Erreur lors de l'enregistrement.");
      return;
    }
    setSucces(`Indisponibilités enregistrées : ${data.nbCreneaux} créneau(x).`);
    router.refresh();
  }

  if (periodes.length === 0) {
    return (
      <Card className="max-w-2xl">
        <p className="text-sm text-[var(--color-navy-900)]/60">
          Aucune période définie. Configurez d&apos;abord la grille horaire.
        </p>
      </Card>
    );
  }

  return (
    <Card className="w-fit max-w-full overflow-auto">
      <CardTitle>Grille d&apos;indisponibilité</CardTitle>
      {succes && (
        <p className="mb-4 rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-sm text-[var(--color-success)]">{succes}</p>
      )}
      {erreur && <p className="mb-4 rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">{erreur}</p>}

      <table className="mb-4 border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-20 border border-[var(--color-navy-900)]/10 bg-[var(--color-navy-900)]/5 px-2 py-1.5 text-left text-xs font-medium">
              Période
            </th>
            {JOURS.map((j) => (
              <th key={j} className="border border-[var(--color-navy-900)]/10 bg-[var(--color-navy-900)]/5 px-3 py-1.5 text-xs font-medium">
                {j}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periodes.map((p) => (
            <tr key={p.id}>
              <td className="border border-[var(--color-navy-900)]/10 px-2 py-1.5 text-xs font-medium text-[var(--color-navy-900)]/70">
                {p.libelle}
              </td>
              {JOURS.map((_, idx) => {
                const jourSemaine = idx + 1;
                const actif = coches.has(cle({ jourSemaine, periodeGrilleId: p.id }));
                return (
                  <td
                    key={jourSemaine}
                    onClick={() => basculer(jourSemaine, p.id)}
                    className={`cursor-pointer border border-[var(--color-navy-900)]/10 px-3 py-1.5 text-center transition-colors ${
                      actif ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]" : "hover:bg-[var(--color-navy-900)]/5"
                    }`}
                  >
                    {actif ? "✕" : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mb-4 text-xs text-[var(--color-navy-900)]/50">Cliquez une case pour marquer ce créneau indisponible.</p>

      <Button type="button" onClick={soumettre} disabled={envoi}>
        {envoi ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {envoi ? "Enregistrement…" : "Enregistrer les indisponibilités"}
      </Button>
    </Card>
  );
}
