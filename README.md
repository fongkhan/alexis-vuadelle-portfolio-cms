# Alexis Vuadelle - Portfolio CMS

Ce dépôt contient le backend et l'interface d'administration du portfolio d'Alexis Vuadelle. Il est construit avec **Payload CMS v3** et utilise **SQLite** comme base de données pour un hébergement simple et stable.

## 🚀 Architecture

Ce projet fonctionne en tandem avec le frontend **Astro**. L'architecture globale est la suivante :
1. **CMS (Payload)** : Gère le contenu (Projets, Médias, Pages). Il tourne sous Node.js.
2. **Base de données** : SQLite (fichier local `payload.db` à la racine).
3. **Webhook de Build** : À chaque modification (sauvegarde, suppression) d'un projet ou d'une donnée globale dans le CMS, un **Webhook** est déclenché silencieusement en arrière-plan. Ce Webhook appelle un script PHP sur le frontend qui recompile le site Astro instantanément (SSG).

## 💻 Développement Local

### Prérequis
- Node.js (v20 ou v22 recommandé)
- npm, pnpm ou yarn

### Installation
```bash
# 1. Cloner le projet
git clone <votre_url_git>
cd alexis-vuadelle-portfolio-cms

# 2. Installer les dépendances
npm install

# 3. Créer le fichier d'environnement
cp .env.example .env
# N'oubliez pas de générer un PAYLOAD_SECRET dans votre .env !

# 4. Lancer le serveur de développement
npm run dev
```

Une fois lancé, rendez-vous sur `http://localhost:3000/admin` pour accéder à l'interface de Payload.

## ☁️ Déploiement

Ce projet est conçu pour être hébergé sur o2switch en utilisant l'intégration **Phusion Passenger**. 

> 👉 **Pour les instructions complètes de déploiement sur o2switch, consultez le fichier [O2SWITCH_DEPLOYMENT.md](./O2SWITCH_DEPLOYMENT.md).**
