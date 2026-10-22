"use server";
import { revalidatePath } from "next/cache";
import { exigerRole } from "@/lib/auth";
import { genererRapport } from "@/lib/rapports";
import { enregistrerAudit } from "@/lib/audit";

export async function genererRapportAction(formData: FormData) {
  const session = await exigerRole(["ADMIN", "COMPTABLE"]);
  const { rapport } = await genererRapport({
    periodeId: Number(formData.get("periodeId")),
    typeRapport: String(formData.get("typeRapport") ?? "MENSUEL"),
    utilisateurId: session.userId,
  });
  await enregistrerAudit({
    utilisateurId: session.userId,
    action: "GENERATION_RAPPORT",
    tableConcernee: "rapports",
    idEnregistrement: rapport.id,
    nouvelleValeur: `${rapport.numeroRapport} v${rapport.version}`,
  });
  revalidatePath("/admin/rapports");
}
