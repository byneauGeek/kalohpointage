"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ShieldAlert, Search } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default function FormulaireControle() {
  const [resultat, setResultat] = useState<{ authentique: boolean; motif?: string } | null>(null);

  async function soumettre(formData: FormData) {
    const reponse = await fetch("/api/admin/controler-rapport", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numeroRapport: formData.get("numeroRapport"),
        codeVerification: formData.get("codeVerification"),
      }),
    });
    setResultat(await reponse.json());
  }

  return (
    <Card className="mb-8 max-w-xl">
      <CardTitle>Contrôler l&apos;authenticité d&apos;un rapport</CardTitle>
      <form action={soumettre} className="flex flex-wrap gap-2">
        <Input name="numeroRapport" placeholder="RPT-2026-09-000001" required className="flex-1 min-w-[180px]" />
        <Input name="codeVerification" placeholder="VFY-XXXX-XXXX" required className="w-44" />
        <Button type="submit" variant="outline">
          <Search size={16} />
          Contrôler
        </Button>
      </form>
      <AnimatePresence mode="wait">
        {resultat && (
          <motion.p
            key={String(resultat.authentique)}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-3 flex items-center gap-2 text-sm font-medium ${
              resultat.authentique ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
            }`}
          >
            {resultat.authentique ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
            {resultat.authentique ? "Rapport authentique" : `Anomalie détectée : ${resultat.motif}`}
          </motion.p>
        )}
      </AnimatePresence>
    </Card>
  );
}
