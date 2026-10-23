"use client";
import { Select } from "@/components/ui/Field";

export function PeriodeSelector({
  periodes,
  valeur,
}: {
  periodes: { id: number; libelle: string }[];
  valeur?: number;
}) {
  return (
    <form className="mb-6">
      <Select
        name="periodeId"
        defaultValue={valeur}
        onChange={(e) => e.currentTarget.form?.submit()}
        className="w-48"
      >
        {periodes.map((p) => (
          <option key={p.id} value={p.id}>{p.libelle}</option>
        ))}
      </Select>
    </form>
  );
}
