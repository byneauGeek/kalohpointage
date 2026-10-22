-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('ADMIN', 'COMPTABLE', 'PROFESSEUR');

-- CreateEnum
CREATE TYPE "StatutProfesseur" AS ENUM ('PERMANENT', 'VACATAIRE', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutCours" AS ENUM ('PLANIFIE', 'ARRIVEE_ENREGISTREE', 'EN_COURS', 'FIN_ENREGISTREE', 'VALIDE', 'A_CONTROLER', 'NON_VALIDE', 'INCOMPLET', 'ABSENT', 'CLOTURE');

-- CreateEnum
CREATE TYPE "StatutPeriode" AS ENUM ('OUVERTE', 'CLOTUREE');

-- CreateEnum
CREATE TYPE "StatutRapport" AS ENUM ('OFFICIEL', 'REMPLACE');

-- CreateEnum
CREATE TYPE "SensArrondi" AS ENUM ('PLUS_PROCHE', 'INFERIEUR', 'SUPERIEUR');

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" SERIAL NOT NULL,
    "role" "RoleCode" NOT NULL,
    "professeurId" INTEGER,
    "nomUtilisateur" TEXT,
    "motDePasseHash" TEXT,
    "motDePasseSel" TEXT,
    "codePinHash" TEXT,
    "codePinSel" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3),
    "dernierAcces" TIMESTAMP(3),

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professeurs" (
    "id" SERIAL NOT NULL,
    "matricule" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT,
    "email" TEXT,
    "statut" "StatutProfesseur" NOT NULL DEFAULT 'VACATAIRE',
    "tauxHoraireSpecifique" DECIMAL(10,2),
    "salaireFixeMensuel" DECIMAL(10,2),
    "quotaHeuresMensuelMin" INTEGER,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3),

    CONSTRAINT "professeurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" SERIAL NOT NULL,
    "nomClasse" TEXT NOT NULL,
    "niveau" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matieres" (
    "id" SERIAL NOT NULL,
    "libelle" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "matieres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emplois_du_temps" (
    "id" SERIAL NOT NULL,
    "professeurId" INTEGER NOT NULL,
    "classeId" INTEGER NOT NULL,
    "matiereId" INTEGER NOT NULL,
    "jourSemaine" INTEGER NOT NULL,
    "heureDebutMin" INTEGER NOT NULL,
    "heureFinMin" INTEGER NOT NULL,
    "dateDebutValidite" TIMESTAMP(3) NOT NULL,
    "dateFinValidite" TIMESTAMP(3),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "dateImport" TIMESTAMP(3),
    "importLogId" INTEGER,

    CONSTRAINT "emplois_du_temps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cours" (
    "id" SERIAL NOT NULL,
    "emploiDuTempsId" INTEGER,
    "professeurId" INTEGER NOT NULL,
    "classeId" INTEGER NOT NULL,
    "matiereId" INTEGER NOT NULL,
    "dateCours" TIMESTAMP(3) NOT NULL,
    "heureDebutPrevueMin" INTEGER NOT NULL,
    "heureFinPrevueMin" INTEGER NOT NULL,
    "heureArriveeReelle" TIMESTAMP(3),
    "heureFinReelle" TIMESTAMP(3),
    "dureePrevueMin" INTEGER NOT NULL,
    "dureeReelleMin" INTEGER,
    "ecartArriveeMin" INTEGER,
    "ecartDepartMin" INTEGER,
    "dureeValideeMin" INTEGER,
    "statut" "StatutCours" NOT NULL DEFAULT 'PLANIFIE',
    "motifValidation" TEXT,
    "dateValidation" TIMESTAMP(3),
    "validateurId" INTEGER,
    "periodeId" INTEGER,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3),

    CONSTRAINT "cours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regles_validation" (
    "id" SERIAL NOT NULL,
    "toleranceArriveeMin" INTEGER NOT NULL,
    "toleranceDepartMin" INTEGER NOT NULL,
    "retardMaxAccepteMin" INTEGER NOT NULL,
    "delaiAbsenceMin" INTEGER NOT NULL,
    "arrondiMin" INTEGER NOT NULL DEFAULT 0,
    "sensArrondi" "SensArrondi" NOT NULL DEFAULT 'PLUS_PROCHE',
    "tauxHoraireGeneral" DECIMAL(10,2) NOT NULL,
    "dateApplication" TIMESTAMP(3) NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3),

    CONSTRAINT "regles_validation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodes" (
    "id" SERIAL NOT NULL,
    "libelle" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "statut" "StatutPeriode" NOT NULL DEFAULT 'OUVERTE',
    "dateCloture" TIMESTAMP(3),
    "closeParId" INTEGER,
    "dateReouverture" TIMESTAMP(3),
    "rouverteParId" INTEGER,
    "motifReouverture" TEXT,
    "tauxHoraireApplique" DECIMAL(10,2),

    CONSTRAINT "periodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rapports" (
    "id" SERIAL NOT NULL,
    "numeroRapport" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "periodeId" INTEGER NOT NULL,
    "typeRapport" TEXT NOT NULL,
    "dateGeneration" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "genereParId" INTEGER NOT NULL,
    "heuresTotalesMin" INTEGER,
    "montantTotal" DECIMAL(12,2),
    "donneesCanoniquesJson" TEXT NOT NULL,
    "hashRapport" TEXT NOT NULL,
    "codeVerification" TEXT NOT NULL,
    "statut" "StatutRapport" NOT NULL DEFAULT 'OFFICIEL',
    "cheminPdf" TEXT,
    "cheminExcel" TEXT,

    CONSTRAINT "rapports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit" (
    "id" SERIAL NOT NULL,
    "dateHeure" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utilisateurId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "tableConcernee" TEXT,
    "idEnregistrement" INTEGER,
    "ancienneValeur" TEXT,
    "nouvelleValeur" TEXT,
    "motif" TEXT,

    CONSTRAINT "audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imports_log" (
    "id" SERIAL NOT NULL,
    "dateImport" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importeParId" INTEGER,
    "nomFichier" TEXT,
    "lignesLues" INTEGER NOT NULL DEFAULT 0,
    "lignesImportees" INTEGER NOT NULL DEFAULT 0,
    "lignesRejetees" INTEGER NOT NULL DEFAULT 0,
    "detailErreurs" TEXT,
    "detailAvertissements" TEXT,

    CONSTRAINT "imports_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jours_non_ouvres" (
    "id" SERIAL NOT NULL,
    "dateJour" TIMESTAMP(3) NOT NULL,
    "libelle" TEXT NOT NULL,

    CONSTRAINT "jours_non_ouvres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametres" (
    "cle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,

    CONSTRAINT "parametres_pkey" PRIMARY KEY ("cle")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_professeurId_key" ON "utilisateurs"("professeurId");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_nomUtilisateur_key" ON "utilisateurs"("nomUtilisateur");

-- CreateIndex
CREATE UNIQUE INDEX "professeurs_matricule_key" ON "professeurs"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "classes_nomClasse_key" ON "classes"("nomClasse");

-- CreateIndex
CREATE UNIQUE INDEX "matieres_libelle_key" ON "matieres"("libelle");

-- CreateIndex
CREATE INDEX "emplois_du_temps_professeurId_jourSemaine_dateDebutValidite_idx" ON "emplois_du_temps"("professeurId", "jourSemaine", "dateDebutValidite");

-- CreateIndex
CREATE UNIQUE INDEX "cours_professeurId_dateCours_heureDebutPrevueMin_key" ON "cours"("professeurId", "dateCours", "heureDebutPrevueMin");

-- CreateIndex
CREATE UNIQUE INDEX "periodes_libelle_key" ON "periodes"("libelle");

-- CreateIndex
CREATE UNIQUE INDEX "rapports_numeroRapport_version_key" ON "rapports"("numeroRapport", "version");

-- CreateIndex
CREATE UNIQUE INDEX "jours_non_ouvres_dateJour_key" ON "jours_non_ouvres"("dateJour");

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_professeurId_fkey" FOREIGN KEY ("professeurId") REFERENCES "professeurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emplois_du_temps" ADD CONSTRAINT "emplois_du_temps_professeurId_fkey" FOREIGN KEY ("professeurId") REFERENCES "professeurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emplois_du_temps" ADD CONSTRAINT "emplois_du_temps_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emplois_du_temps" ADD CONSTRAINT "emplois_du_temps_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "matieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emplois_du_temps" ADD CONSTRAINT "emplois_du_temps_importLogId_fkey" FOREIGN KEY ("importLogId") REFERENCES "imports_log"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cours" ADD CONSTRAINT "cours_emploiDuTempsId_fkey" FOREIGN KEY ("emploiDuTempsId") REFERENCES "emplois_du_temps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cours" ADD CONSTRAINT "cours_professeurId_fkey" FOREIGN KEY ("professeurId") REFERENCES "professeurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cours" ADD CONSTRAINT "cours_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cours" ADD CONSTRAINT "cours_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "matieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cours" ADD CONSTRAINT "cours_validateurId_fkey" FOREIGN KEY ("validateurId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cours" ADD CONSTRAINT "cours_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "periodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodes" ADD CONSTRAINT "periodes_closeParId_fkey" FOREIGN KEY ("closeParId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodes" ADD CONSTRAINT "periodes_rouverteParId_fkey" FOREIGN KEY ("rouverteParId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapports" ADD CONSTRAINT "rapports_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "periodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapports" ADD CONSTRAINT "rapports_genereParId_fkey" FOREIGN KEY ("genereParId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit" ADD CONSTRAINT "audit_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imports_log" ADD CONSTRAINT "imports_log_importeParId_fkey" FOREIGN KEY ("importeParId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
