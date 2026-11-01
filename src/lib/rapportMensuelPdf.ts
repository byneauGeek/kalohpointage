/**
 * Rapport mensuel imprimable (dashboard, carte "Rapport du mois") : resume
 * en une page des heures validees et montants dus par professeur sur le
 * mois calendaire en cours - independant des Periode (annee scolaire), qui
 * ne donnent pas cette granularite mensuelle. Meme discipline pdfkit que
 * ficheDePaiePdf.ts : chaque bloc dessine a une position explicite (x, y).
 */
import PDFDocument from "pdfkit";
import type { LigneComptabilisation } from "@/lib/comptabilisation";

const NAVY = "#0B1B38";
const GOLD = "#A9790A";
const GRIS = "#6B7280";
const BORDURE = "#D4D8E2";
const HAUTEUR_PAGE_UTILE = 740;

function formatHeures(min: number): string {
  return (min / 60).toFixed(2).replace(".", ",") + " h";
}

export async function genererRapportMensuelPdf(params: {
  nomEtablissement: string;
  moisLibelle: string;
  lignes: LigneComptabilisation[];
}): Promise<Buffer> {
  const { nomEtablissement, moisLibelle, lignes } = params;
  const montantTotal = lignes.reduce((s, l) => s + l.montant, 0);
  const minutesTotal = lignes.reduce((s, l) => s + l.minutesValidees, 0);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const xMarge = doc.page.margins.left;
    const largeurPage = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    let y = doc.page.margins.top;

    function sauterPageSiNecessaire(hauteurNecessaire: number) {
      if (y + hauteurNecessaire > HAUTEUR_PAGE_UTILE) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    }

    doc.fontSize(18).fillColor(NAVY).font("Helvetica-Bold").text(nomEtablissement, xMarge, y, { width: largeurPage, align: "center" });
    y += 26;
    doc.fontSize(12).fillColor(GOLD).font("Helvetica-Bold").text("RAPPORT MENSUEL", xMarge, y, { width: largeurPage, align: "center" });
    y += 18;
    doc.fontSize(10).fillColor(GRIS).font("Helvetica-Oblique").text(moisLibelle, xMarge, y, { width: largeurPage, align: "center" });
    y += 32;

    const colonnes = [
      { titre: "Professeur", largeur: 150 },
      { titre: "Matricule", largeur: 90 },
      { titre: "Statut", largeur: 90 },
      { titre: "Heures validées", largeur: 90 },
      { titre: "Montant dû", largeur: largeurPage - 150 - 90 - 90 - 90 },
    ];

    function ligneTableau(valeurs: string[], gras: boolean, fond?: string) {
      sauterPageSiNecessaire(20);
      const hauteur = 20;
      if (fond) doc.rect(xMarge, y, largeurPage, hauteur).fill(fond);
      doc.font(gras ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor(gras ? "#FFFFFF" : "#000000");
      let x = xMarge;
      valeurs.forEach((v, i) => {
        doc.text(v, x + 4, y + 6, { width: colonnes[i].largeur - 8, lineBreak: false, align: i >= 3 ? "right" : "left" });
        x += colonnes[i].largeur;
      });
      y += hauteur;
    }

    ligneTableau(colonnes.map((c) => c.titre), true, NAVY);
    if (lignes.length === 0) {
      sauterPageSiNecessaire(20);
      doc.fontSize(10).font("Helvetica-Oblique").fillColor(GRIS).text("Aucune heure validée sur ce mois.", xMarge, y);
      y += 20;
    } else {
      for (const l of lignes) {
        ligneTableau([`${l.nom} ${l.prenom}`, l.matricule, l.statut, formatHeures(l.minutesValidees), l.montant.toFixed(2)], false);
      }
    }
    y += 6;
    sauterPageSiNecessaire(22);
    doc.rect(xMarge, y, largeurPage, 22).fill(NAVY);
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#FFFFFF");
    doc.text("TOTAL", xMarge + 4, y + 6, { width: colonnes[0].largeur + colonnes[1].largeur + colonnes[2].largeur - 8 });
    doc.text(formatHeures(minutesTotal), xMarge + colonnes[0].largeur + colonnes[1].largeur + colonnes[2].largeur + 4, y + 6, {
      width: colonnes[3].largeur - 8,
      align: "right",
    });
    doc.text(
      montantTotal.toFixed(2),
      xMarge + colonnes[0].largeur + colonnes[1].largeur + colonnes[2].largeur + colonnes[3].largeur + 4,
      y + 6,
      { width: colonnes[4].largeur - 8, align: "right" }
    );
    y += 22 + 20;

    const hauteurSignature = 90;
    sauterPageSiNecessaire(hauteurSignature + 40);
    doc.fontSize(12).fillColor(NAVY).font("Helvetica-Bold").text("Approbation", xMarge, y);
    y += 20;

    const largeurColonne = (largeurPage - 20) / 2;
    const xGauche = xMarge;
    const xDroite = xMarge + largeurColonne + 20;
    const yDepartSignature = y;

    function blocSignature(x: number, titre: string) {
      doc.rect(x, yDepartSignature, largeurColonne, hauteurSignature).strokeColor(BORDURE).lineWidth(1).stroke();
      doc.fontSize(11).font("Helvetica-Bold").fillColor(NAVY).text(titre, x + 10, yDepartSignature + 10);
      doc.fontSize(9).font("Helvetica").fillColor("#000000");
      doc.text("Nom : ....................................................", x + 10, yDepartSignature + 38);
      doc.text("Date : ......../......../..........", x + 10, yDepartSignature + 58);
      doc.text("Signature :", x + 10, yDepartSignature + 76);
    }

    blocSignature(xGauche, "Le Comptable");
    blocSignature(xDroite, "Le Directeur");
    y = yDepartSignature + hauteurSignature + 20;

    sauterPageSiNecessaire(14);
    doc.fontSize(8).font("Helvetica-Oblique").fillColor(GRIS)
      .text(`Document généré le ${new Date().toLocaleDateString("fr-FR")} — ${nomEtablissement} — document de synthèse, à rapprocher du tableau de bord.`, xMarge, y, { width: largeurPage });

    doc.end();
  });
}
