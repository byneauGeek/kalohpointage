"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function FormulaireMasse() {
  const router = useRouter();
  const [resultat, setResultat] = useState<{ crees: string[]; erreurs: string[] } | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function soumettre(formData: FormData) {
    setEnCours(true);
    setResultat(null);
    const reponse = await fetch("/api/admin/professeurs-masse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lignes: formData.get("lignes") }),
    });
    const data = await reponse.json();
    setResultat(data);
    setEnCours(false);
    router.refresh();
  }

  return (
    <Card className="mb-8 max-w-3xl">
      <CardTitle>Enregistrer plusieurs professeurs à la fois</CardTitle>
      <p className="mb-3 text-sm text-[var(--color-navy-900)]/55">
        Un professeur par ligne : <code className="rounded bg-[var(--color-navy-900)]/5 px-1">Matricule;Nom;Prénom;Statut</code>{" "}
        (Statut optionnel, « Permanent » ou « Vacataire » par défaut). Les coordonnées, taux et quota se complètent ensuite sur la fiche de chaque professeur.
      </p>
      <form action={soumettre}>
        <Textarea
          name="lignes"
          rows={4}
          placeholder={"P-101;Kouassi;Awa;Vacataire\nP-102;Traoré;Moussa;Permanent"}
          className="mb-3 font-mono text-xs"
        />
        <Button type="submit" disabled={enCours}>
          <Users size={16} />
          {enCours ? "Enregistrement…" : "Enregistrer les professeurs"}
        </Button>
      </form>
      {resultat && (
        <div className="mt-4 rounded-lg bg-[var(--color-navy-900)]/[0.03] p-3 text-sm">
          <p className="text-[var(--color-success)]">{resultat.crees.length} professeur(s) créé(s){resultat.crees.length > 0 ? " : " + resultat.crees.join(", ") : ""}</p>
          {resultat.erreurs.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-[var(--color-danger)]">
              {resultat.erreurs.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
