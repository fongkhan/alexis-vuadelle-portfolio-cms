# Explication du bug SQLite : Dev vs Production

## Le Problème

Le CMS fonctionnait parfaitement en **mode développement** (`npm run dev`), mais crashait systématiquement en **mode production** (`NODE_ENV=production`) avec l'erreur :

```
SQLITE_ERROR: no such table: users
```

## La Cause

Le problème venait d'une seule ligne dans `payload.config.ts` :

```ts
// ❌ AVANT (bugué)
url: dbUri || `file:${path.resolve(dirname, '../../payload.db')}`
```

### Que fait `dirname` ?

`dirname` est calculé à partir de `import.meta.url`, qui représente le chemin physique du fichier source en cours d'exécution.

### En Mode Développement

Next.js exécute directement le fichier TypeScript original situé dans `src/` :

```
dirname = /home/fongkhan/repositories/alexis-vuadelle-portfolio-cms/src/

Résolution du chemin :
  src/ + ../../payload.db
  = /home/fongkhan/repositories/payload.db  ← La base est créée ICI
```

✅ Ça marche, les tables sont créées, tout fonctionne.

### En Mode Production

Quand on lance `npm run build`, Next.js compile tout le code TypeScript en JavaScript optimisé et le place dans le dossier `.next/server/`. Le fichier `payload.config.ts` est intégré dans un chunk comme `.next/server/chunks/6175.js`.

Quand Passenger démarre l'application en production, `import.meta.url` pointe maintenant vers ce fichier compilé :

```
dirname = /home/fongkhan/repositories/alexis-vuadelle-portfolio-cms/.next/server/chunks/

Résolution du chemin :
  .next/server/chunks/ + ../../payload.db
  = /home/fongkhan/repositories/alexis-vuadelle-portfolio-cms/.next/payload.db  ← Fichier INEXISTANT !
```

❌ Le mode production cherche la base de données à un endroit complètement différent. Comme il n'y a rien là-bas, Payload essaie de faire une requête SQL sur une base vide → **crash**.

### Schéma Récapitulatif

```
repositories/
├── payload.db                          ← Créée par le mode DEV (../../ depuis src/)
└── alexis-vuadelle-portfolio-cms/
    ├── src/
    │   └── payload.config.ts           ← dirname = ici en DEV
    ├── payload.db                      ← Où la PROD devrait chercher
    └── .next/
        └── server/
            └── chunks/
                └── 6175.js             ← dirname = ici en PROD
```

## La Solution

Remplacer `dirname` par `process.cwd()` :

```ts
// ✅ APRÈS (corrigé)
url: dbUri || `file:${path.resolve(process.cwd(), 'payload.db')}`
```

`process.cwd()` retourne toujours le **répertoire de travail courant**, c'est-à-dire le dossier depuis lequel la commande `node` a été lancée. Que ce soit en dev ou en production, ce sera toujours :

```
process.cwd() = /home/fongkhan/repositories/alexis-vuadelle-portfolio-cms/
```

Le fichier `payload.db` sera donc toujours cherché (et créé) au même endroit :

```
/home/fongkhan/repositories/alexis-vuadelle-portfolio-cms/payload.db
```

## Actions effectuées

1. **Correction du code** : Remplacement de `dirname` par `process.cwd()` dans `payload.config.ts`.
2. **Migration de la base** : Copie du fichier `payload.db` depuis son ancien emplacement (`/home/fongkhan/repositories/payload.db`) vers la racine du projet CMS.
3. **Recompilation** : `npm run build` pour régénérer le dossier `.next` avec le nouveau chemin.
4. **Redémarrage** : `touch tmp/restart.txt` pour que Phusion Passenger prenne en compte les changements.

## Leçon à retenir

> ⚠️ **Ne jamais utiliser `import.meta.url` ou `__dirname` pour résoudre des chemins vers des fichiers de données (bases de données, fichiers de config, uploads, etc.) dans un projet Next.js.**
>
> Ces valeurs changent entre le mode développement (fichiers sources) et le mode production (fichiers compilés dans `.next/`). Utilisez toujours `process.cwd()` pour pointer vers la racine du projet de manière fiable.
