# Changelog

Toutes les modifications notables apportées à ce projet seront documentées dans ce fichier.

## [Unreleased]

### Ajouté
- **Gestion de l'affichage des images de projet** : Ajout d'un nouveau champ `imageDisplayMode` (Cover ou Contain) dans la collection `Projects` pour permettre de choisir si l'image de couverture doit être recadrée (cover) ou affichée en entier (contain).
- **Génération automatique des formats WebP** : Configuration de la collection `Media` pour générer automatiquement des images redimensionnées aux formats `thumbnail` (400px), `card` (768px), et `hero` (1200px) afin d'optimiser les performances.

### Modifié
- **Performance - Cache HTTP** : Ajout de règles `Cache-Control` dans `next.config.ts` (`max-age=31536000, immutable`) pour le chemin `/api/media/file/*` afin d'améliorer la note PageSpeed.
- **Support SQLite en Production** : Correction des problèmes de chemin de base de données en utilisant `process.cwd()` au lieu de `dirname` pour garantir que la DB fonctionne correctement sur l'environnement mutualisé (o2switch / Phusion Passenger).

### Supprimé
- Configuration `formatOptions` invalide retirée de `Media.ts` qui causait le crash de l'interface d'administration.
