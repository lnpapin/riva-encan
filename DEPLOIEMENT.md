# 🚀 Guide de déploiement — Riva Encan Silencieux

## Structure du projet

```
riva-encan/
├── api/
│   ├── lots.js        → Gérer les lots
│   ├── bids.js        → Gérer les enchères
│   ├── settings.js    → Paramètres (date fermeture)
│   └── upload.js      → Upload d'images
├── public/
│   ├── index.html     → Page principale
│   ├── style.css      → Styles
│   └── app.js         → Logique frontend
├── supabase-schema.sql → Script base de données
├── vercel.json         → Config déploiement
└── package.json
```

---

## ÉTAPE 1 — Créer la base de données Supabase

1. Va sur https://supabase.com et connecte-toi (ou crée un compte gratuit)
2. Clique **New Project**
3. Donne un nom : `riva-encan`
4. Choisis un mot de passe fort (note-le quelque part)
5. Région : **US East** (ou Canada si disponible)
6. Clique **Create new project** (attendre ~2 minutes)

### Créer les tables

7. Dans le menu gauche, clique **SQL Editor**
8. Clique **New query**
9. Copie-colle tout le contenu du fichier `supabase-schema.sql`
10. Clique **Run** (bouton vert)
11. Tu devrais voir "Success" pour chaque ligne

### Créer le bucket d'images

12. Dans le menu gauche, clique **Storage**
13. Clique **New bucket**
14. Nom : `images`
15. Coche **Public bucket**
16. Clique **Save**

### Récupérer tes clés

17. Dans le menu gauche, clique **Settings** → **API**
18. Note ces deux valeurs :
    - **Project URL** (ex: `https://abcxyz.supabase.co`)
    - **service_role key** (la clé longue, sous "Project API keys")

---

## ÉTAPE 2 — Mettre le code sur GitHub

Dans le Terminal, dans le dossier `riva-encan` :

```bash
git init
git add .
git commit -m "Premier déploiement — Riva Encan"
git branch -M main
git remote add origin https://github.com/TON-USERNAME/riva-encan.git
git push -u origin main
```

> Remplace `TON-USERNAME` par ton nom d'utilisateur GitHub.
> Si le dépôt n'existe pas encore : va sur github.com → New repository → nom : `riva-encan` → Create.

---

## ÉTAPE 3 — Déployer sur Vercel

1. Va sur https://vercel.com et connecte-toi avec GitHub
2. Clique **Add New Project**
3. Trouve `riva-encan` dans la liste → clique **Import**
4. Dans **Environment Variables**, ajoute ces 2 variables :

   | Nom | Valeur |
   |-----|--------|
   | `SUPABASE_URL` | `https://TON-ID.supabase.co` |
   | `SUPABASE_SERVICE_KEY` | `ta-clé-service-role-ici` |

5. Clique **Deploy**
6. Attends 1-2 minutes → Vercel te donne une URL comme `riva-encan.vercel.app`

---

## ÉTAPE 4 — Tester

1. Ouvre l'URL Vercel dans ton navigateur
2. Tu devrais voir la plateforme avec les lots de démonstration
3. Teste une enchère pour vérifier que les données sont bien enregistrées
4. Va dans l'admin (⚙️ Admin, mot de passe : `LabRiva1234`) pour vérifier

---

## Mises à jour futures

Pour mettre à jour l'application après des modifications :

```bash
git add .
git commit -m "Description de la modification"
git push
```
Vercel redéploie automatiquement en 1-2 minutes !

---

## 🔒 Sécurité recommandée (après lancement)

- Changer le mot de passe admin depuis le code (`app.js` ligne avec `LabRiva1234`)
- Activer l'authentification Supabase pour l'admin
- Configurer un domaine personnalisé sur Vercel

---

## Support

En cas de problème, vérifier :
- Les variables d'environnement dans Vercel (Settings → Environment Variables)
- Les logs d'erreur dans Vercel (menu Deployments → cliquer le déploiement → View logs)
- La console Supabase pour les erreurs de base de données
