# 📋 Résumé de projet — Riva Encan Silencieux

> **Créé par :** Louis-Nicolas Papin  
> **Date de création :** Juin 2026  
> **URL de production :** `https://riva-encan.vercel.app`  
> **Dépôt GitHub :** `https://github.com/lnpapin/riva-encan`

---

## 🎯 Description du projet

Plateforme web d'encan silencieux développée pour les levées de fonds du **Laboratoire Riva**. Permet aux employés de faire des enchères en ligne sur des lots, avec notifications automatiques par courriel lorsqu'ils sont surpassés.

---

## 🏗️ Architecture technique

### Stack technologique
| Composant | Technologie | Gratuit |
|-----------|-------------|---------|
| Frontend | HTML / CSS / JavaScript vanilla | ✅ |
| Backend (API) | Node.js (Vercel Serverless Functions) | ✅ |
| Base de données | Supabase (PostgreSQL) | ✅ |
| Hébergement | Vercel | ✅ |
| Versionnement | GitHub | ✅ |
| Envoi de courriels | Gmail SMTP (mot de passe d'application) | ✅ |

### Structure des fichiers
```
riva-encan/
├── api/                        → Fonctions serverless (backend)
│   ├── lots.js                 → CRUD des lots + fermeture auto à l'échéance
│   ├── bids.js                 → Enregistrement des enchères + notifications courriel
│   ├── settings.js             → Paramètres (date fermeture, titre événement)
│   └── upload.js               → Upload d'images vers Supabase Storage
├── public/                     → Interface web (frontend)
│   ├── index.html              → Page HTML principale
│   ├── style.css               → Feuille de style complète
│   └── app.js                  → Logique JavaScript (~750 lignes)
├── supabase-schema.sql         → Script de création des tables
├── vercel.json                 → Configuration du déploiement
├── package.json                → Dépendances Node.js
├── DEPLOIEMENT.md              → Guide de déploiement étape par étape
└── RESUME_PROJET.md            → Ce fichier
```

---

## 🗄️ Base de données Supabase

### Projet Supabase
- **Nom du projet :** `riva-encan`
- **URL :** `https://wxldwpbspnyylexurdjz.supabase.co`
- **Région :** US East

### Tables
```sql
lots      → id, num, emoji, image_url, name, description, mise, retail,
            current, status, category, created_at

bids      → id, lot_id (FK), name, amount, email, created_at

settings  → key, value
           Clés utilisées :
           - close_datetime   : Date/heure de fermeture de l'encan (ISO 8601)
           - event_title      : Titre affiché sur la page participants
           - event_subtitle   : Sous-titre affiché sur la page participants
```

### Storage
- **Bucket :** `images` (public)
- **Chemin des images :** `lots/[timestamp]-[random].[ext]`

---

## ⚙️ Variables d'environnement Vercel

| Variable | Description | Où la trouver |
|----------|-------------|---------------|
| `SUPABASE_URL` | URL du projet Supabase | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | Clé service_role Supabase | Supabase → Settings → API → service_role |
| `GMAIL_USER` | Adresse Gmail d'envoi | `encan.riva2026@gmail.com` |
| `GMAIL_PASSWORD` | Mot de passe d'application Gmail (16 car.) | Google Account → Sécurité → Mots de passe des applications |
| `APP_URL` | URL complète de l'application | URL Vercel de production |

> ⚠️ **Important :** Ces variables ne doivent jamais être committées sur GitHub.

---

## 🔐 Accès et mots de passe

| Service | Identifiant | Mot de passe |
|---------|-------------|--------------|
| Admin encan | — | `LabRiva1234` *(à changer avant l'événement)* |
| GitHub | `lnpapin` | *(mot de passe GitHub)* |
| Vercel | Connexion via GitHub | — |
| Supabase | *(courriel utilisé à la création)* | *(mot de passe Supabase)* |
| Gmail envoi | `encan.riva2026@gmail.com` | *(mot de passe Gmail)* |

> 🔒 **Recommandation :** Stocker ces informations dans un gestionnaire de mots de passe sécurisé (ex: 1Password, Bitwarden).

---

## 🖥️ Fonctionnalités

### Interface participants
- ✅ Catalogue de lots avec photos, émojis, filtres par catégorie et recherche
- ✅ Compte à rebours dynamique (jours / heures / minutes / secondes)
- ✅ Enchères publiques — nom et montant visibles de tous
- ✅ Historique complet des offres par lot (classement 🥇🥈🥉)
- ✅ Agrandissement des images en plein écran (lightbox)
- ✅ Notification par courriel optionnelle si surpassé
- ✅ Fermeture automatique des enchères à l'heure configurée
- ✅ Mise à jour automatique des données toutes les 30 secondes

### Interface administrateur (mot de passe requis)
- ✅ Vue d'ensemble : total amassé, valeur des lots, participants, nombre d'offres
- ✅ Personnalisation du titre et sous-titre de l'événement
- ✅ Configuration de la date et heure de fermeture
- ✅ Gestion des lots : ajout, modification, fermeture/réouverture, suppression
- ✅ Upload de photos pour chaque lot
- ✅ Tableau des gagnants par lot avec courriel
- ✅ Export CSV des résultats finaux

### Notifications par courriel
- ✅ Envoi automatique via Gmail SMTP (TLS natif, sans dépendances)
- ✅ Courriel HTML stylisé aux couleurs Riva
- ✅ Affiche : votre offre vs nouvelle offre, nom du surenchérisseur, lien pour enchérir à nouveau
- ✅ Dédoublonnage par courriel (une seule notification par personne par enchère)

---

## 🚀 Processus de mise à jour

### Pour modifier le code et déployer
```bash
# 1. Modifier les fichiers localement sur ton Mac
cd ~/Desktop/riva-encan

# 2. Envoyer sur GitHub (Vercel redéploie automatiquement)
git add .
git commit -m "Description de la modification"
git push
```

### Délai de déploiement
Après un `git push`, Vercel redéploie en **1-2 minutes** automatiquement.

---

## 🎨 Charte graphique

### Couleurs officielles Riva
| Nom | Code HEX | Usage |
|-----|----------|-------|
| Bleu Riva | `#00559f` | Couleur principale, boutons, titres |
| Bleu foncé Riva | `#003d75` | Hover, en-têtes, fonds sombres |
| Cyan Riva | `#2cace3` | Accents, badges, éléments secondaires |
| Blanc | `#ffffff` | Texte sur fond bleu, fonds de cartes |

### Polices
- **Corps :** Arial, Helvetica, sans-serif
- **Icônes :** Tabler Icons (CDN)

---

## 📅 Checklist avant chaque événement

- [ ] Supprimer les lots de démonstration dans l'admin
- [ ] Ajouter tous les vrais lots avec photos et prix
- [ ] Configurer la **date et heure de fermeture** dans l'admin
- [ ] Personnaliser le **titre et sous-titre** de l'événement dans l'admin
- [ ] Tester une enchère complète avec un courriel de notification
- [ ] Partager l'URL `riva-encan.vercel.app` avec les participants
- [ ] À la fermeture : exporter le CSV des gagnants depuis l'onglet Gagnants

---

## 🔧 Dépannage courant

### L'app affiche "Impossible de charger l'encan"
→ Vérifier les variables d'environnement dans Vercel (Settings → Environment Variables)  
→ Vérifier que Supabase est en ligne sur supabase.com

### Les notifications courriel ne partent pas
→ Vérifier que `GMAIL_USER` et `GMAIL_PASSWORD` sont bien configurés dans Vercel  
→ Vérifier que le mot de passe d'application Gmail est toujours actif (Google Account → Sécurité)  
→ Consulter les logs dans Vercel → Logs pour voir les messages d'erreur

### Une modification ne s'affiche pas après déploiement
→ Vider le cache du navigateur (Cmd + Shift + R sur Mac)  
→ Vérifier dans Vercel → Deployments que le dernier déploiement est "Ready" (vert)

### Erreur "rejected" lors du git push
→ Taper `git pull --rebase origin main` puis `git push`

---

## 📞 Ressources utiles

| Service | URL |
|---------|-----|
| Tableau de bord Vercel | https://vercel.com/lnpapin/riva-encan |
| Console Supabase | https://supabase.com/dashboard/project/wxldwpbspnyylexurdjz |
| Dépôt GitHub | https://github.com/lnpapin/riva-encan |
| Logs Vercel | https://vercel.com/lnpapin/riva-encan/logs |
| Compte Gmail envoi | https://mail.google.com (encan.riva2026@gmail.com) |

---

## 📈 Limites des services gratuits

| Service | Limite gratuite | Usage estimé |
|---------|----------------|--------------|
| Vercel | 100 GB bande passante/mois | Très largement suffisant |
| Supabase | 500 MB stockage, 2 GB transfert | Suffisant pour plusieurs événements |
| Gmail SMTP | 500 courriels/jour | Suffisant (encan = quelques dizaines) |
| GitHub | Dépôts privés illimités | ✅ |

---

*Document généré le 3 juin 2026 — Projet développé avec Claude (Anthropic)*
