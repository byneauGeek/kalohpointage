/**
 * Fiche de paie (export PDF) - meme contenu et mise en page "bulletin
 * officiel" que genererFicheDePaieDocx (src/lib/ficheDePaie.ts) : reference,
 * encadre recapitulatif, zones de signature Professeur/Comptable pensees
 * pour une impression et une signature manuscrite des deux parties.
 *
 * Attention pdfkit : chaque bloc dessine a une position EXPLICITE (x, y)
 * passee a chaque appel de text()/rect() plutot que de laisser le curseur
 * automatique de la librairie avancer tout seul - un melange de texte en
 * flux et de positionnement manuel (colonnes, tableaux) deplace sinon le
 * curseur de facon imprevisible et decale tout le contenu suivant hors de
 * la page (bug constate et corrige lors de la premiere version).
 */
import PDFDocument from "pdfkit";
import type { LigneComptabilisation, SessionDetail, DetailParMatiere, SaisieManuelleDetail } from "@/lib/comptabilisation";

const JOURS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const NAVY = "#0B1B38";
const GOLD = "#A9790A";
const GRIS = "#6B7280";
const BORDURE = "#D4D8E2";
const HAUTEUR_PAGE_UTILE = 740;

function formatHeures(min: number): string {
  return (min / 60).toFixed(2).replace(".", ",") + " h";
}

function referenceFiche(matricule: string, periodeLibelle: string): string {
  return `FP-${periodeLibelle}-${matricule}`;
}

export async function genererFicheDePaiePdf(params: {
  nomEtablissement: string;
  periodeLibelle: string;
  ligne: LigneComptabilisation;
  sessions: SessionDetail[];
  parMatiere: DetailParMatiere[];
  manuelles: SaisieManuelleDetail[];
}): Promise<Buffer> {
  const { nomEtablissement, periodeLibelle, ligne, sessions, parMatiere, manuelles } = params;
  const reference = referenceFiche(ligne.matricule, periodeLibelle);

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

    // En-tete
    doc.fontSize(18).fillColor(NAVY).font("Helvetica-Bold").text(nomEtablissement, xMarge, y, { width: largeurPage, align: "center" });
    y += 26;
    doc.fontSize(12).fillColor(GOLD).font("Helvetica-Bold").text("BULLETIN DE PAIE — ENSEIGNEMENT", xMarge, y, { width: largeurPage, align: "center" });
    y += 18;
    doc.fontSize(9).fillColor(GRIS).font("Helvetica-Oblique").text(`Référence ${reference}`, xMarge, y, { width: largeurPage, align: "center" });
    y += 28;

    // Encadre identite
    const hauteurBox = 44;
    doc.rect(xMarge, y, largeurPage, hauteurBox).strokeColor(BORDURE).lineWidth(1).stroke();
    doc.fontSize(9).font("Helvetica").fillColor("#000000");
    doc.text(`Professeur : ${ligne.nom} ${ligne.prenom}`, xMarge + 10, y + 8);
    doc.text(`Matricule : ${ligne.matricule}`, xMarge + 10, y + 24);
    doc.text(`Statut : ${ligne.statut}`, xMarge + largeurPage / 2, y + 8);
    doc.text(`Période : ${periodeLibelle}`, xMarge + largeurPage / 2, y + 24);
    y += hauteurBox + 20;

    doc.fontSize(12).fillColor(NAVY).font("Helvetica-Bold").text("Détail des sessions effectuées", xMarge, y);
    y += 20;

    if (sessions.length === 0) {
      doc.fontSize(10).font("Helvetica-Oblique").fillColor(GRIS).text("Aucune session validée sur cette période.", xMarge, y);
      y += 20;
    } else {
      const colonnes = [
        { titre: "Date", largeur: 80 },
        { titre: "Jour", largeur: 75 },
        { titre: "Matière", largeur: 135 },
        { titre: "Classe", largeur: 110 },
        { titre: "Durée", largeur: largeurPage - 80 - 75 - 135 - 110 },
      ];

      function ligneTableau(valeurs: string[], gras: boolean, fond?: string) {
        sauterPageSiNecessaire(18);
        const hauteur = 18;
        if (fond) doc.rect(xMarge, y, largeurPage, hauteur).fill(fond);
        doc.font(gras ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor(gras ? "#FFFFFF" : "#000000");
        let x = xMarge;
        valeurs.forEach((v, i) => {
          doc.text(v, x + 4, y + 5, { width: colonnes[i].largeur - 8, lineBreak: false });
          x += colonnes[i].largeur;
        });
        y += hauteur;
      }

      ligneTableau(colonnes.map((c) => c.titre), true, NAVY);
      for (const s of sessions) {
        const jourTexte = JOURS[s.date.getUTCDay() === 0 ? 7 : s.date.getUTCDay()];
        ligneTableau([s.date.toISOString().slice(0, 10), jourTexte, s.matiere, s.classe, formatHeures(s.dureeValideeMin)], false);
      }
      y += 15;
    }

    sauterPageSiNecessaire(30);
    doc.fontSize(12).fillColor(NAVY).font("Helvetica-Bold").text("Sous-totaux par matière", xMarge, y);
    y += 18;
    doc.fontSize(10).font("Helvetica").fillColor("#000000");
    for (const m of parMatiere) {
      sauterPageSiNecessaire(14);
      doc.text(`${m.matiere} : ${formatHeures(m.minutes)}`, xMarge, y);
      y += 14;
    }
    y += 10;

    if (manuelles.length > 0) {
      sauterPageSiNecessaire(30);
      doc.fontSize(12).fillColor(NAVY).font("Helvetica-Bold").text("Heures saisies manuellement", xMarge, y);
      y += 18;
      doc.fontSize(9).font("Helvetica-Oblique").fillColor("#000000");
      for (const m of manuelles) {
        sauterPageSiNecessaire(14);
        doc.text(`${formatHeures(m.heuresMin)} — ${m.motif}`, xMarge, y, { width: largeurPage });
        y += 14;
      }
      y += 10;
    }

    // Encadre recapitulatif remuneration
    sauterPageSiNecessaire(30);
    doc.fontSize(12).fillColor(NAVY).font("Helvetica-Bold").text("Récapitulatif de rémunération", xMarge, y);
    y += 20;

    const lignesRecap: Array<[string, string]> = [["Heures validées totales", formatHeures(ligne.minutesValidees)]];
    if (ligne.quotaMin != null) {
      lignesRecap.push(["Quota mensuel", formatHeures(ligne.quotaMin)]);
      lignesRecap.push(["Heures supplémentaires", formatHeures(ligne.minutesSupp)]);
      lignesRecap.push(["Salaire fixe", ligne.salaireFixe.toFixed(2)]);
    } else {
      lignesRecap.push(["Taux horaire appliqué", ligne.tauxApplique.toFixed(2)]);
    }
    for (const [label, valeur] of lignesRecap) {
      sauterPageSiNecessaire(18);
      doc.rect(xMarge, y, largeurPage, 18).strokeColor(BORDURE).lineWidth(0.5).stroke();
      doc.fontSize(9).font("Helvetica").fillColor("#000000");
      doc.text(label, xMarge + 8, y + 5);
      doc.text(valeur, xMarge, y + 5, { width: largeurPage - 8, align: "right" });
      y += 18;
    }
    sauterPageSiNecessaire(24);
    doc.rect(xMarge, y, largeurPage, 24).fill(NAVY);
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#FFFFFF");
    doc.text("MONTANT TOTAL", xMarge + 8, y + 6);
    doc.text(ligne.montant.toFixed(2), xMarge, y + 6, { width: largeurPage - 8, align: "right" });
    y += 24 + 15;

    if (ligne.avertissements.length > 0) {
      sauterPageSiNecessaire(20);
      doc.fontSize(9).font("Helvetica-Oblique").fillColor("#B45309").text("Avertissements : " + ligne.avertissements.join(" "), xMarge, y, { width: largeurPage });
      y += 25;
    }

    // Zones de signature
    const hauteurSignature = 110;
    sauterPageSiNecessaire(hauteurSignature + 30);
    y += 10;
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
      doc.text("Nom : ....................................................", x + 10, yDepartSignature + 40);
      doc.text("Date : ......../......../..........", x + 10, yDepartSignature + 62);
      doc.text("Signature :", x + 10, yDepartSignature + 84);
    }

    blocSignature(xGauche, "Le Professeur");
    blocSignature(xDroite, "Le Comptable");
    y = yDepartSignature + hauteurSignature + 20;

    sauterPageSiNecessaire(14);
    doc.fontSize(8).font("Helvetica-Oblique").fillColor(GRIS)
      .text(`Document généré le ${new Date().toLocaleDateString("fr-FR")} — ${nomEtablissement} — à conserver par les deux parties après signature.`, xMarge, y, { width: largeurPage });

    doc.end();
  });
}
