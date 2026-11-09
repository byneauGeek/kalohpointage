/**
 * Amorçage minimal : un compte administrateur et une règle de validation par
 * défaut. Le mot de passe admin vient de l'environnement (jamais en dur dans
 * le code source) - voir .env.example.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCb } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCb);
const prisma = new PrismaClient();

async function hash(secret: string) {
  const sel = randomBytes(16).toString("hex");
  const derived = (await scrypt(secret, sel, 64)) as Buffer;
  return { hash: derived.toString("hex"), sel };
}

async function main() {
  const nomAdmin = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const motDePasseAdmin = process.env.SEED_ADMIN_PASSWORD;
  if (!motDePasseAdmin || motDePasseAdmin.length < 8) {
    throw new Error(
      "Definissez SEED_ADMIN_PASSWORD (8+ caracteres) dans .env avant de lancer le seed."
    );
  }

  const existant = await prisma.utilisateur.findUnique({ where: { nomUtilisateur: nomAdmin } });
  if (!existant) {
    const { hash: h, sel } = await hash(motDePasseAdmin);
    await prisma.utilisateur.create({
      data: { role: "ADMIN", nomUtilisateur: nomAdmin, motDePasseHash: h, motDePasseSel: sel },
    });
    console.log(`Compte administrateur cree : ${nomAdmin}`);
  } else {
    console.log("Compte administrateur deja present, non recree.");
  }

  const regleExistante = await prisma.regleValidation.findFirst({ where: { actif: true } });
  if (!regleExistante) {
    await prisma.regleValidation.create({
      data: {
        toleranceArriveeMin: 10,
        toleranceDepartMin: 10,
        retardMaxAccepteMin: 30,
        delaiAbsenceMin: 20,
        arrondiMin: 0,
        sensArrondi: "PLUS_PROCHE",
        tauxHoraireGeneral: 0,
        dateApplication: new Date(),
        actif: true,
      },
    });
    console.log("Regle de validation par defaut creee (taux horaire a configurer dans Parametres).");
  }

  const grilleExistante = await prisma.periodeGrille.count();
  if (grilleExistante === 0) {
    // Decoupage detecte dans les emplois du temps deja importes (identique
    // chaque jour, lundi-vendredi) : 9 periodes de 55 min, recreation a 10h30
    // et pause dejeuner a 12h20 - modifiable ensuite depuis l'admin si la
    // sonnerie de l'etablissement change.
    const periodes: [number, string, number, number][] = [
      [1, "P1", 450, 505],
      [2, "P2", 505, 560],
      [3, "P3", 560, 615],
      [4, "P4", 630, 685],
      [5, "P5", 685, 740],
      [6, "P6", 800, 855],
      [7, "P7", 855, 910],
      [8, "P8", 910, 965],
      [9, "P9", 965, 1020],
    ];
    await prisma.periodeGrille.createMany({
      data: periodes.map(([ordre, libelle, heureDebutMin, heureFinMin]) => ({ ordre, libelle, heureDebutMin, heureFinMin })),
    });
    console.log("Grille horaire par defaut creee (9 periodes, voir /admin pour la modifier).");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
