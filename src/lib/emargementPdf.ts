/**
 * Fiche d'emargement imprimable (dashboard, carte "Fiche d'emargement") :
 * un professeur par ligne avec nom et prenoms, matiere(s) enseignee(s),
 * nombre total d'heures, montant du et une case vide a signer a la main -
 * document destine a etre imprime et signe sur papier, d'ou une grille
 * complete (bordures horizontales ET verticales) plutot que les tableaux
 * internes habituels (voir ficheDePaiePdf.ts) qui n'ont que des
 * separateurs horizontaux.
 */
import PDFDocument from "pdfkit";

const NAVY = "#0B1B38";
const GOLD = "#A9790A";
const GRIS = "#6B7280";
const BORDURE = "#9AA3B5";
const HAUTEUR_PAGE_UTILE = 740;

export type LigneEmargement = {
  matricule: string;
  nom: string;
  prenom: string;
  matieres: string;
  minutesValidees: number;
  montant: number;
};

function formatHeures(min: number): string {
  return (min / 60).toFixed(2).replace(".", ",") + " h";
}

export async function genererEmargementPdf(params: {
  nomEtablissement: string;
  moisLibelle: string;
  lignes: LigneEmargement[];
}): Promise<Buffer> {
  const { nomEtablissement, moisLibelle, lignes } = params;

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
    doc.fontSize(12).fillColor(GOLD).font("Helvetica-Bold").text("FICHE D'ÉMARGEMENT", xMarge, y, { width: largeurPage, align: "center" });
    y += 18;
    doc.fontSize(10).fillColor(GRIS).font("Helvetica-Oblique").text(moisLibelle, xMarge, y, { width: largeurPage, align: "center" });
    y += 26;

    doc.fontSize(9).font("Helvetica").fillColor("#000000").text(
      `Les professeurs ci-dessous attestent, par leur signature, avoir pris connaissance des heures d'enseignement effectuées et des montants dus au titre de ${moisLibelle}.`,
      xMarge,
      y,
      { width: largeurPage }
    );
    y += 32;

    const colonnes = [
      { titre: "N°", largeur: 24 },
      { titre: "Nom et prénoms", largeur: 128 },
      { titre: "Matière(s) enseignée(s)", largeur: 112 },
      { titre: "Heures", largeur: 55 },
      { titre: "Montant", largeur: 58 },
      { titre: "Signature", largeur: largeurPage - 24 - 128 - 112 - 55 - 58 },
    ];

    function ligneGrille(valeurs: string[], hauteur: number, gras: boolean, fond?: string) {
      sauterPageSiNecessaire(hauteur);
      if (fond) doc.rect(xMarge, y, largeurPage, hauteur).fill(fond);
      doc.rect(xMarge, y, largeurPage, hauteur).strokeColor(BORDURE).lineWidth(0.6).stroke();
      doc.font(gras ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor(gras ? "#FFFFFF" : "#000000");
      let x = xMarge;
      valeurs.forEach((v, i) => {
        if (i > 0) {
          doc.moveTo(x, y).lineTo(x, y + hauteur).strokeColor(BORDURE).lineWidth(0.6).stroke();
        }
        const align = i === 3 || i === 4 ? "right" : i === 0 ? "center" : "left";
        doc.text(v, x + 5, y + hauteur / 2 - 5, { width: colonnes[i].largeur - 10, lineBreak: false, align });
        x += colonnes[i].largeur;
      });
      y += hauteur;
    }

    ligneGrille(colonnes.map((c) => c.titre), 24, true, NAVY);
    if (lignes.length === 0) {
      sauterPageSiNecessaire(20);
      doc.fontSize(9).font("Helvetica-Oblique").fillColor(GRIS).text("Aucune heure validée sur ce mois.", xMarge, y + 6);
      y += 20;
    } else {
      lignes.forEach((l, i) => {
        ligneGrille(
          [String(i + 1), `${l.nom} ${l.prenom}`, l.matieres || "—", formatHeures(l.minutesValidees), l.montant.toFixed(2), ""],
          30,
          false
        );
      });
    }

    y += 30;
    sauterPageSiNecessaire(60);
    doc.fontSize(9).font("Helvetica").fillColor("#000000");
    doc.text("Établi par : ....................................................", xMarge, y);
    doc.text("Date : ......../......../..........", xMarge + largeurPage / 2, y);
    y += 30;

    sauterPageSiNecessaire(14);
    doc.fontSize(8).font("Helvetica-Oblique").fillColor(GRIS)
      .text(`Document généré le ${new Date().toLocaleDateString("fr-FR")} — ${nomEtablissement} — à conserver après signature.`, xMarge, y, { width: largeurPage });

    doc.end();
  });
}
