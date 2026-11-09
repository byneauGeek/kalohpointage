-- CreateTable
CREATE TABLE "periodes_grille" (
    "id" SERIAL NOT NULL,
    "ordre" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL,
    "heureDebutMin" INTEGER NOT NULL,
    "heureFinMin" INTEGER NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "periodes_grille_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affectations_enseignement" (
    "id" SERIAL NOT NULL,
    "classeId" INTEGER NOT NULL,
    "matiereId" INTEGER NOT NULL,
    "professeurId" INTEGER NOT NULL,
    "seancesParSemaine" INTEGER NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3),

    CONSTRAINT "affectations_enseignement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indisponibilites_professeur" (
    "id" SERIAL NOT NULL,
    "professeurId" INTEGER NOT NULL,
    "jourSemaine" INTEGER NOT NULL,
    "periodeGrilleId" INTEGER NOT NULL,
    "motif" TEXT,

    CONSTRAINT "indisponibilites_professeur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matieres_periodes_evitees" (
    "id" SERIAL NOT NULL,
    "matiereId" INTEGER NOT NULL,
    "periodeGrilleId" INTEGER NOT NULL,

    CONSTRAINT "matieres_periodes_evitees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "affectations_enseignement_classeId_matiereId_key" ON "affectations_enseignement"("classeId", "matiereId");

-- CreateIndex
CREATE UNIQUE INDEX "indisponibilites_professeur_professeurId_jourSemaine_period_key" ON "indisponibilites_professeur"("professeurId", "jourSemaine", "periodeGrilleId");

-- CreateIndex
CREATE UNIQUE INDEX "matieres_periodes_evitees_matiereId_periodeGrilleId_key" ON "matieres_periodes_evitees"("matiereId", "periodeGrilleId");

-- AddForeignKey
ALTER TABLE "affectations_enseignement" ADD CONSTRAINT "affectations_enseignement_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations_enseignement" ADD CONSTRAINT "affectations_enseignement_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "matieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations_enseignement" ADD CONSTRAINT "affectations_enseignement_professeurId_fkey" FOREIGN KEY ("professeurId") REFERENCES "professeurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indisponibilites_professeur" ADD CONSTRAINT "indisponibilites_professeur_professeurId_fkey" FOREIGN KEY ("professeurId") REFERENCES "professeurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indisponibilites_professeur" ADD CONSTRAINT "indisponibilites_professeur_periodeGrilleId_fkey" FOREIGN KEY ("periodeGrilleId") REFERENCES "periodes_grille"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matieres_periodes_evitees" ADD CONSTRAINT "matieres_periodes_evitees_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "matieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matieres_periodes_evitees" ADD CONSTRAINT "matieres_periodes_evitees_periodeGrilleId_fkey" FOREIGN KEY ("periodeGrilleId") REFERENCES "periodes_grille"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

