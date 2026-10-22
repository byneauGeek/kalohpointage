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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
