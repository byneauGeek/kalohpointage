# Heures Enseignement — version Web

Réécriture web (Next.js + PostgreSQL) du système de gestion des heures
d'enseignement Access/VBA. Le cahier des charges complet est dans le projet
Access : [`05_Documentation/02_Technique/Specification_Version_Web.md`](../05_Documentation/02_Technique/Specification_Version_Web.md).

## Stack

- **Next.js** (App Router, TypeScript, Tailwind)
- **PostgreSQL** via **Prisma** (schéma complet dans `prisma/schema.prisma`)
- **Auth maison** (cookies httpOnly signés avec `jose`) : session classique
  pour Admin/Comptable, jeton d'action à usage unique (2 min) pour le
  pointage professeur par PIN — jamais une session persistante sur le poste
  partagé
- **exceljs** pour l'import de l'emploi du temps
- Hachage SHA-256 natif (`crypto` de Node) pour les mots de passe/PIN et
  l'authenticité des rapports — aucun contournement nécessaire ici,
  contrairement à la version Access (voir Journal_Decisions.md D23/D24)

## Démarrage local

```bash
npm install
cp .env.example .env         # puis au moins renseigner AUTH_SECRET et SEED_ADMIN_PASSWORD
```

Base de donnees — deux options :

- **Avec Docker** : `docker compose up -d db`
- **Sans Docker** (Postgres embarque en pur Node, pratique si Docker n'est pas disponible) : `npm run db:local` dans un terminal a part, puis garder `DATABASE_URL` tel que fourni dans `.env.example`

```bash
npm run db:migrate           # cree les tables
npm run db:seed              # cree le premier compte admin + regle par defaut
npm run dev
```

- `/` — accueil (liens Pointage / Administration)
- `/pointage` — poste kiosque (sélection du nom → PIN → une action)
- `/login` puis `/admin` — back-office (professeurs, classes, matières,
  emploi du temps + import, génération des cours, rapprochement, validation,
  périodes, comptabilisation, rapports + contrôle d'authenticité,
  paramètres, utilisateurs, audit)

## Déploiement (Vercel ou Netlify)

### 1. Base de données + stockage objet (une seule fois)

Le projet **Neon** "kaloh" est déjà provisionné (Postgres + Object Storage,
branche `production`) — récupérer dans le tableau de bord
[console.neon.tech](https://console.neon.tech) :
- `DATABASE_URL` : la chaîne de connexion **pooled** (hôte en `-pooler`),
  avec `?sslmode=require&pgbouncer=true`.
- `DIRECT_URL` : la même base, connexion **directe** (même hôte SANS
  `-pooler`) — utilisée uniquement par `prisma migrate` (voir
  `prisma/schema.prisma`, champ `directUrl`) ; indispensable, car les
  migrations DDL derrière le pooler PgBouncer peuvent échouer.
- `STORAGE_ENDPOINT`/`STORAGE_REGION`/`STORAGE_BUCKET` : fournis par Neon
  Object Storage (bucket `uploads`) ; créer un identifiant dédié
  (`storage:read`+`storage:write`) pour obtenir `STORAGE_ACCESS_KEY_ID` et
  `STORAGE_SECRET_ACCESS_KEY` — voir `.env.example` pour le format exact de
  chaque variable.

(Alternative possible sans Neon : [Supabase](https://supabase.com) ou
**Vercel Postgres** pour la base — dans ce cas `STORAGE_*` restent vides et
le fichier Excel original de chaque import n'est simplement pas conservé,
le reste de l'application fonctionne normalement.)

### 2. Code source (une seule fois)

Le dossier est déjà un dépôt Git local (`git init` fait, voir `git log`).
Il ne reste qu'à le pousser vers un hébergeur Git :

```bash
git remote add origin <url-de-votre-depot-github-ou-gitlab>
git push -u origin main
```

### 3. Variables d'environnement (dans le tableau de bord Vercel/Netlify)

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | URL **pooled** Neon (étape 1), avec `pgbouncer=true` |
| `DIRECT_URL` | URL **directe** Neon (étape 1), sans `-pooler` |
| `AUTH_SECRET` | Une valeur aléatoire **différente de celle du `.env.example`** — générer avec `openssl rand -base64 32` (ou `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` sous Windows) |
| `TZ` | Fuseau horaire de l'établissement, ex. `Africa/Abidjan` (impacte le calcul de « aujourd'hui » côté pointage — voir `.env.example`) |
| `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` | Identifiants Neon Object Storage (étape 1) — facultatif, n'active que la conservation du fichier Excel original des imports |

`SEED_ADMIN_USERNAME`/`SEED_ADMIN_PASSWORD` ne sont nécessaires que
ponctuellement, à l'étape 5 — ne pas les laisser définis en permanence sur
la plateforme.

### 4. Premier déploiement

- **Vercel** : importer le dépôt Git sur [vercel.com/new](https://vercel.com/new) — Next.js est détecté automatiquement, aucune configuration
  supplémentaire nécessaire.
- **Netlify** : connecter le dépôt sur
  [app.netlify.com](https://app.netlify.com) — `netlify.toml` (déjà présent)
  installe automatiquement le plugin Next.js officiel.

`npm run postinstall` (déclenché automatiquement après `npm install` par la
plateforme) exécute `prisma generate` — indispensable, car le client Prisma
généré n'est jamais commité dans le dépôt.

### 5. Schéma de base + premier compte administrateur (une seule fois, puis à chaque migration future)

Depuis votre machine, en pointant temporairement vers la base de
**production** :

```bash
DATABASE_URL="<url-de-production>" npm run db:deploy
DATABASE_URL="<url-de-production>" SEED_ADMIN_USERNAME="admin" SEED_ADMIN_PASSWORD="<mot-de-passe-fort>" npm run db:seed
```

(Sous PowerShell, remplacer `VAR="valeur" commande` par
`$env:VAR="valeur"; commande`.) Notez le mot de passe choisi : il n'est
récupérable nulle part ensuite (seule son empreinte est stockée).

### 6. Vérification

- Ouvrir l'URL de production, se connecter avec le compte créé à l'étape 5.
- Créer au moins un professeur, lui définir un PIN, importer un emploi du
  temps, et tester le pointage (`/pointage`) de bout en bout.
- Toute évolution future du schéma (`prisma/schema.prisma`) : générer la
  migration localement (`npm run db:migrate`), commiter le dossier
  `prisma/migrations/`, puis rejouer l'étape 5 (`db:deploy` seul, pas
  `db:seed`) contre la production après le déploiement du nouveau code.

## Ce qui est couvert par ce scaffold

Modèle de données complet, authentification à deux voies (admin/comptable
classique, PIN professeur à usage unique), pointage kiosque de bout en bout
avec design et animations aux couleurs du Collège Privé Kaloh, import
d'emploi du temps (avec rapprochement des noms de classe et éclatement des
créneaux partagés — portage fidèle de LOT 17b/17e), génération des cours,
rapprochement (absences/incomplets), validation automatique + traitement
manuel des anomalies, périodes (clôture/réouverture avec garde-fous),
comptabilisation Permanent/Vacataire, génération et contrôle de rapports
avec empreinte SHA-256, paramètres, gestion des utilisateurs/PIN, audit.

**Stockage objet (Neon Object Storage)** : chaque import d'emploi du temps
conserve son fichier Excel original (`src/lib/storage.ts`) — lien
« Retélécharger le fichier importé » depuis l'écran d'import, via une URL
signée temporaire (10 min, `src/app/api/admin/fichier-import/route.ts`).
Dégrade sans erreur si `STORAGE_*` n'est pas configuré : l'import fonctionne,
seule la conservation du fichier est désactivée.

**Progressive Web App** : `src/app/manifest.ts` (icônes générées à la volée
via `next/og` dans `icon-192/`, `icon-512/`, `icon.tsx`, `apple-icon.tsx`),
service worker `public/sw.js` enregistré par `ServiceWorkerRegister`.
Volontairement prudent : ne met en cache QUE le shell statique (pages de
navigation + assets `_next/static` fingerprintés) en stratégie
réseau-d'abord — jamais `/api/*` ni aucune requête non-GET, pour qu'aucune
donnée de pointage, de session ou d'administration ne soit jamais servie
périmée. Installable sur mobile (icône sur l'écran d'accueil, plein écran).

Particularités métier ajoutées sur demande de l'établissement :
- **Cours enchaînés sans heure creuse** : un professeur qui a plusieurs
  cours consécutifs (ex. 7h30 à 17h sans redescendre) pointe UNE SEULE FOIS
  « début de cours » pour tout le bloc contigu, et UNE SEULE FOIS « fin de
  cours » quand il redescend (avant une heure creuse ou en fin de journée).
  Seul le premier cours du bloc reçoit l'heure réelle d'arrivée (les
  suivants gardent l'heure prévue de leur créneau) ; symétriquement, seul le
  dernier cours du bloc reçoit l'heure réelle de fin. Dès qu'une heure
  creuse existe, le bloc s'arrête : le cours suivant exige un nouveau
  pointage. Logique dans `blocContigu()`, `src/lib/pointage.ts`.
- Les boutons « Pointer mon arrivée » ET « Pointer ma fin de cours » suivent
  la même politique de visibilité : disponibles seulement dans les 5
  dernières minutes avant le début (resp. la fin) du bloc, jamais trop en
  avance (`DELAI_DEBUT_VISIBLE_MIN` / `DELAI_FIN_VISIBLE_MIN`) ; avant cela,
  le professeur voit un écran d'attente listant les sessions concernées.
- **Fiche de paie (Word)** téléchargeable par professeur et par période
  depuis la page Comptabilisation : détail session par session avec la
  matière de chacune (un professeur peut enseigner plusieurs matières),
  sous-totaux par matière, puis récapitulatif de rémunération
  (`src/lib/ficheDePaie.ts`, package `docx`).
- **Enregistrement de plusieurs professeurs en une fois** (page Professeurs,
  un professeur par ligne) en plus du formulaire fiche complète.
- Permissions Comptable vérifiées de bout en bout : un compte Comptable créé
  par un Administrateur voit uniquement les écrans de consultation et
  Comptabilité/Rapports (formulaires de création/modification masqués en
  plus du blocage côté serveur, qui reste la seule protection réelle).
- **Verrouillage du PIN** après 3 échecs : blocage côté SERVEUR (429) pendant
  `DELAI_BLOCAGE_PIN_MIN`, pas seulement un retour à l'écran d'accueil côté
  client (`compteBloquePourPin` dans `src/lib/pointage.ts`).
- **Modifier un professeur** existant (coordonnées, statut, taux, salaire,
  quota) depuis `/admin/professeurs/[id]` — le matricule reste la clé stable,
  non modifiable. Bouton **Réactiver** symétrique du **Désactiver**.
- **Recherche** (nom/prénom/matricule) sur la liste des professeurs.
- **Message « Accès refusé »** explicite (`/login?erreur=role`) quand un
  Comptable tente d'ouvrir une page réservée à l'Administrateur, distinct du
  message d'échec de connexion.
- **Fuseau horaire** documenté dans `.env.example` (`TZ`) avec l'explication
  de son impact sur le calcul de "aujourd'hui" côté pointage.

## Pistes d'amélioration restantes (non implémentées)

- **Export PDF** des rapports officiels et de la fiche de paie (actuellement
  Word uniquement pour la fiche ; le rapport reste JSON canonique + table).
- **Modifier un créneau d'emploi du temps** après import (aujourd'hui :
  import ou saisie initiale uniquement, pas d'édition ligne à ligne).
- **Limitation réseau** du poste de pointage (IP de l'établissement) et
  verrouillage d'écran navigateur dédié — mesure de déploiement, pas de code.
- **Pagination** sur les tables qui peuvent grandir (Cours, Audit) —
  actuellement limitées à 100-200 lignes affichées ; la recherche existe
  déjà pour les Professeurs.
- **Migration des données réelles** depuis `Heures_BE.accdb`.
- **Tests automatisés** (le projet Access en avait ~180 ; aucun ici pour
  l'instant).
