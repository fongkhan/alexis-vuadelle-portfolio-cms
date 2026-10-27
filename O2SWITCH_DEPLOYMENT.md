# Déploiement du CMS (Payload) sur o2switch avec PostgreSQL

Puisque nous utilisons Phusion Passenger et PostgreSQL intégrés à o2switch, voici la procédure complète de déploiement et de mise à jour.

---

## 1. Créer la base de données PostgreSQL sur o2switch (cPanel)

1. Connectez-vous à votre **cPanel o2switch** et ouvrez l'outil **Bases de données PostgreSQL** (PostgreSQL Databases).
2. Créez une nouvelle base de données (ex: `fongkhan_portfolio`).
3. Créez un utilisateur PostgreSQL (ex: `fongkhan_pguser`) avec un mot de passe fort.
4. **Important** : Dans la section *"Ajouter un utilisateur à la base de données"*, associez l'utilisateur `fongkhan_pguser` à la base `fongkhan_portfolio`.

Votre URI de connexion sera alors :
```env
DATABASE_URI=postgresql://fongkhan_pguser:VOTRE_MOT_DE_PASSE@127.0.0.1:5432/fongkhan_portfolio
```
*(Si votre mot de passe contient des caractères spéciaux comme `@`, `#`, `/`, encodez-les en URL ou utilisez un mot de passe alphanumérique).*

---

## 2. Configurer le fichier `.env` sur o2switch

```bash
cd /home/fongkhan/repositories/alexis-vuadelle-portfolio-cms
nano .env
```

Mettez le contenu suivant :

```env
NODE_ENV=production
DATABASE_URI=postgresql://fongkhan_pguser:VOTRE_MOT_DE_PASSE@127.0.0.1:5432/fongkhan_portfolio
PAYLOAD_SECRET=votre_cle_secrete_hyper_longue_et_aleatoire
PAYLOAD_PUBLIC_SERVER_URL=https://cms.alexis-vuadelle.com
WEBHOOK_URL=https://alexis-vuadelle.com/webhook-payload.php
WEBHOOK_SECRET=MY_SUPER_SECRET_TOKEN_2026
```

---

## 3. Installer, Synchroniser la BDD et Builder le CMS

Connectez-vous en SSH à votre serveur o2switch :

```bash
# Ajouter Node 22 au PATH
export PATH="$PATH:/opt/alt/alt-nodejs22/root/usr/bin/"

# Se rendre dans le dossier du CMS
cd /home/fongkhan/repositories/alexis-vuadelle-portfolio-cms

# Récupérer les dernières mises à jour
git pull

# Installer les dépendances
npm install

# Synchroniser automatiquement le schéma PostgreSQL (plus besoin de lancer npm run dev et faire Ctrl+C !)
npm run db:sync

# Compiler le CMS pour la production
npm run build

# Redémarrer Phusion Passenger
mkdir -p tmp
touch tmp/restart.txt
```

---

## 4. Configurer le Sous-domaine (`.htaccess`)

Assurez-vous que le fichier `.htaccess` de votre sous-domaine CMS contient :

```apache
PassengerEnabled on
PassengerAppType node
PassengerNodejs /opt/alt/alt-nodejs22/root/usr/bin/node
PassengerAppRoot /home/fongkhan/repositories/alexis-vuadelle-portfolio-cms
PassengerStartupFile server.js
```
