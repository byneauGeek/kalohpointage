"use client";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Field";

export default function ProfesseurSelector({ professeurs }: { professeurs: { id: number; label: string }[] }) {
  const router = useRouter();
  return (
    <Select
      className="w-auto"
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) router.push(`/admin/emploi-du-temps/professeur/${e.target.value}`);
      }}
    >
      <option value="">Professeur…</option>
      {professeurs.map((p) => (
        <option key={p.id} value={p.id}>{p.label}</option>
      ))}
    </Select>
  );
}
