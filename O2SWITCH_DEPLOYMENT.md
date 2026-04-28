# Déploiement du CMS (Payload) sur o2switch via SSH

Puisque nous utilisons Phusion Passenger intégré à o2switch, il est possible de déployer et de configurer le CMS **entièrement via le terminal SSH**, sans même avoir besoin de cPanel.

Voici les instructions pas à pas.

---

## 1. Préparer l'environnement et le code

Connectez-vous en SSH à votre serveur o2switch. Nous allons utiliser **Node.js 22**, qui est déjà installé sur les serveurs o2switch.

```bash
# Ajouter Node 22 au PATH pour la session actuelle
export PATH="$PATH:/opt/alt/alt-nodejs22/root/usr/bin/"

# Se rendre dans le dossier du CMS (à adapter si nécessaire)
cd /home/fongkhan/repositories/alexis-vuadelle-portfolio-cms

# Récupérer les dernières mises à jour du code
git pull

# Installer les dépendances et builder le CMS
npm install
npm run build
```

---

## 2. Créer le fichier `.env`

Contrairement au développement local, cPanel ne sera pas là pour injecter les variables d'environnement. Il faut les définir manuellement à la racine du dépôt.

```bash
cd /home/fongkhan/repositories/alexis-vuadelle-portfolio-cms
nano .env
```

Mettez le contenu suivant dans le fichier `.env` :

```env
NODE_ENV=production
PAYLOAD_SECRET=votre_cle_secrete_hyper_longue_et_aleatoire
PAYLOAD_PUBLIC_SERVER_URL=https://admin.alexis-vuadelle.com
```

*(La base de données étant désormais sur SQLite, la variable `DATABASE_URI` n'est plus requise).*

---

## 3. Configurer le Sous-domaine (`.htaccess`)

Il faut relier votre sous-domaine (ex: `admin.alexis-vuadelle.com`) au code du CMS. Phusion Passenger s'active automatiquement dès qu'il détecte des directives spécifiques dans le fichier `.htaccess` du dossier public de votre sous-domaine.

1. Rendez-vous dans le dossier de votre sous-domaine (ex: `/home/fongkhan/admin.alexis-vuadelle.com/`).
2. Ouvrez (ou créez) le fichier `.htaccess` :
   ```bash
   nano /home/fongkhan/admin.alexis-vuadelle.com/.htaccess
   ```
3. Ajoutez les lignes suivantes :

```apache
# Activer Phusion Passenger pour Node.js
PassengerEnabled on
PassengerAppType node

# Pointer vers l'exécutable Node.js 22 d'o2switch
PassengerNodejs /opt/alt/alt-nodejs22/root/usr/bin/node

# Indiquer le chemin absolu vers le dossier contenant le code du CMS
PassengerAppRoot /home/fongkhan/repositories/alexis-vuadelle-portfolio-cms

# Indiquer le fichier de démarrage (celui situé à la racine du CMS)
PassengerStartupFile server.js
```

---

## 4. Démarrer et Redémarrer l'application

Pour dire à Phusion Passenger de prendre en compte vos modifications et de (re)démarrer l'application Node.js, il suffit de "toucher" un fichier `restart.txt` dans le dossier `tmp/` de votre CMS.

```bash
# Depuis le dossier du CMS
mkdir -p tmp
touch tmp/restart.txt
```

Votre CMS est maintenant en ligne ! Rendez-vous sur `https://admin.alexis-vuadelle.com` pour vous connecter.

---

## 🛑 En cas de problème d'accès aux fichiers statiques du CMS

Si l'interface d'administration de Payload s'affiche mal (pas de CSS, erreurs 404 sur les JS), cela signifie qu'Apache intercepte les fichiers statiques avant Passenger.

Dans ce cas, ajoutez cette règle tout en haut de votre `.htaccess` :

```apache
# Forcer toutes les requêtes à passer par l'application Node (Passenger)
RewriteEngine On
RewriteRule ^(.*)$ - [L]
```
