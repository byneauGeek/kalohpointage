-- Recreation complete : table vide a ce stade (fonctionnalite livree le
-- jour meme, aucune saisie reelle persistee), remplacee par un modele
-- ligne-par-jour (date + heure d'arrivee + heure de depart) au lieu d'un
-- total global par saisie.
DROP TABLE "saisies_heures_manuelles";

CREATE TABLE "saisies_heures_manuelles" (
    "id" SERIAL NOT NULL,
    "professeurId" INTEGER NOT NULL,
    "periodeId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "heureArriveeMin" INTEGER NOT NULL,
    "heureDepartMin" INTEGER NOT NULL,
    "dureeMin" INTEGER NOT NULL,
    "motif" TEXT NOT NULL,
    "dateSaisie" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saisieParId" INTEGER NOT NULL,

    CONSTRAINT "saisies_heures_manuelles_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "saisies_heures_manuelles" ADD CONSTRAINT "saisies_heures_manuelles_professeurId_fkey" FOREIGN KEY ("professeurId") REFERENCES "professeurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saisies_heures_manuelles" ADD CONSTRAINT "saisies_heures_manuelles_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "periodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saisies_heures_manuelles" ADD CONSTRAINT "saisies_heures_manuelles_saisieParId_fkey" FOREIGN KEY ("saisieParId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
