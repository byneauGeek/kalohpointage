import { PrismaClient } from "@prisma/client";

// Neon suspend le compute de la base apres une periode d'inactivite ; la
// toute premiere requete qui le reveille peut echouer (connexion refusee
// pendant son redemarrage) avant de reussir a la tentative suivante -
// sans ce retry, cet echec remontait tel quel jusqu'a l'utilisateur (page
// d'erreur generique, y compris a la connexion) plutot que de patienter
// un instant puis reessayer une fois.
const CODES_ERREUR_CONNEXION = new Set(["P1001", "P1002", "P1008", "P1017"]);

function creerClient(): PrismaClient {
  // Cast : l'extension ne fait qu'intercepter l'execution des requetes, elle
  // ne change ni les modeles ni leurs arguments - le reste du code continue
  // d'utiliser `prisma` comme un PrismaClient normal.
  return new PrismaClient().$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          try {
            return await query(args);
          } catch (erreur) {
            const code = (erreur as { code?: string })?.code;
            if (code && CODES_ERREUR_CONNEXION.has(code)) {
              await new Promise((resolve) => setTimeout(resolve, 800));
              return await query(args);
            }
            throw erreur;
          }
        },
      },
    },
  }) as unknown as PrismaClient;
}

// Singleton Prisma Client : evite d'ouvrir une nouvelle connexion a chaque
// rechargement en developpement (Next.js recharge les modules a chaud).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? creerClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
