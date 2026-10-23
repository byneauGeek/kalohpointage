/**
 * Export PDF d'un rapport officiel deja genere (voir src/lib/rapports.ts).
 * Imprime le numero, la version, le code de verification et l'empreinte
 * SHA-256 sur le document meme : c'est ce qui permet de recontroler plus
 * tard l'authenticite d'un rapport imprime via /admin/rapports (controle
 * manuel du numero + code).
 */
import PDFDocument from "pdfkit";

type LigneCanonique = {
  matricule: string;
  nom: string;
  prenom: string;
  statut: string;
  minutesValidees: number;
  quotaMin: number | null;
  minutesSupp: number;
  tauxApplique: string;
  salaireFixe: string;
  montantSupp: string;
  montant: string;
};

const NAVY = "#0B1B38";
const GOLD = "#A9790A";
const GRIS = "#6B7280";

function formatHeures(min: number): string {
  return (min / 60).toFixed(2).replace(".", ",") + " h";
}

export async function genererRapportPdf(params: {
  nomEtablissement: string;
  numeroRapport: string;
  version: number;
  typeRapport: string;
  periodeLibelle: string;
  dateGeneration: Date;
  codeVerification: string;
  hashRapport: string;
  heuresTotalesMin: number | null;
  montantTotal: number | null;
  lignes: LigneCanonique[];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).fillColor(NAVY).font("Helvetica-Bold").text(params.nomEtablissement, { align: "center" });
    doc.fontSize(11).fillColor(GOLD).font("Helvetica-Oblique").text("Rapport officiel", { align: "center" });
    doc.moveDown(1);

    doc.fontSize(10).fillColor("#000000").font("Helvetica");
    doc.text(`Numéro : ${params.numeroRapport}  (version ${params.version})`);
    doc.text(`Type : ${params.typeRapport}    Période : ${params.periodeLibelle}`);
    doc.text(`Généré le : ${params.dateGeneration.toLocaleString("fr-FR")}`);
    doc.moveDown(0.6);

    doc.fontSize(9).font("Helvetica-Bold").fillColor(NAVY).text("Code de vérification : ", { continued: true });
    doc.font("Helvetica").fillColor("#000000").text(params.codeVerification);
    doc.fontSize(8).font("Helvetica").fillColor(GRIS).text(`Empreinte SHA-256 : ${params.hashRapport}`);
    doc.moveDown(1);

    const colonnes = [
      { titre: "Matricule", largeur: 65 },
      { titre: "Nom", largeur: 110 },
      { titre: "Statut", largeur: 70 },
      { titre: "Heures val.", largeur: 65 },
      { titre: "Heures supp.", largeur: 65 },
      { titre: "Montant", largeur: 65 },
    ];
    const xDepart = doc.x;
    let y = doc.y;

    function ligneTableau(valeurs: string[], gras: boolean, fond?: string) {
      const hauteur = 18;
      if (fond) doc.rect(xDepart, y, colonnes.reduce((s, c) => s + c.largeur, 0), hauteur).fill(fond);
      doc.font(gras ? "Helvetica-Bold" : "Helvetica").fontSize(8).fillColor(gras ? "#FFFFFF" : "#000000");
      let x = xDepart;
      valeurs.forEach((v, i) => {
        doc.text(v, x + 4, y + 5, { width: colonnes[i].largeur - 8, lineBreak: false });
        x += colonnes[i].largeur;
      });
      y += hauteur;
      if (y > 760) {
        doc.addPage();
        y = 50;
      }
    }

    ligneTableau(colonnes.map((c) => c.titre), true, NAVY);
    for (const l of params.lignes) {
      ligneTableau(
        [l.matricule, `${l.nom} ${l.prenom}`, l.statut, formatHeures(l.minutesValidees), formatHeures(l.minutesSupp), l.montant],
        false
      );
    }
    doc.y = y + 15;

    doc.fontSize(11).font("Helvetica-Bold").fillColor(NAVY).text(`Total heures validées : ${formatHeures(params.heuresTotalesMin ?? 0)}`);
    if (params.montantTotal != null) {
      doc.text(`Montant total : ${params.montantTotal.toFixed(2)}`);
    }

    doc.moveDown(1.5);
    doc.fontSize(8).font("Helvetica-Oblique").fillColor(GRIS)
      .text("L'authenticité de ce document peut être vérifiée dans l'application via le numéro de rapport et le code de vérification ci-dessus.");

    doc.end();
  });
}
