"use client";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Field";

export default function ClasseSelector({ classes }: { classes: { id: number; label: string }[] }) {
  const router = useRouter();
  return (
    <Select
      className="w-auto"
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) router.push(`/admin/emploi-du-temps/affectations/classe/${e.target.value}`);
      }}
    >
      <option value="">Classe…</option>
      {classes.map((c) => (
        <option key={c.id} value={c.id}>{c.label}</option>
      ))}
    </Select>
  );
}
