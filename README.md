# Portfolio Génie Électrique

Site portfolio statique (HTML / CSS / JS pur, **aucune dépendance**), clair et minimaliste.
Conçu pour un étudiant en génie électrique, **modifiable directement dans le navigateur** via un mode édition protégé par un code.

## Ouvrir le site
Double-cliquer sur `index.html` (s'ouvre dans n'importe quel navigateur).
Aucun serveur ni installation nécessaire.

## Mode édition (pour le bénéficiaire)
1. Cliquer sur l'icône **cadenas** en haut à droite.
2. Saisir le **code d'accès**. Code par défaut : **`1234`**.
3. Les textes deviennent modifiables (cliquer dessus pour écrire).
   - Boutons **« + Ajouter »** pour ajouter compétences, projets ou étapes de parcours.
   - Croix **×** pour supprimer un élément.
4. Une barre apparaît en bas :
   - **Enregistrer** : sauvegarde (aussi automatique à chaque frappe).
   - **Exporter** : télécharge le contenu en fichier `portfolio-data.json` (sauvegarde ou transfert).
   - **Importer** : recharge un fichier `.json` exporté précédemment.
   - **Changer le code** : définir un nouveau code d'accès.
   - **Réinitialiser** : revenir au contenu d'origine.
   - **Quitter** : sortir du mode édition.

> ⚠️ **Changer le code par défaut dès la première utilisation** (bouton « Changer le code »).

## Où sont stockées les données ?
Deux modes selon la configuration :

- **En ligne (Supabase)** — recommandé pour un site publié. Le contenu est stocké
  dans une base, donc **les modifications du proprio sont visibles par tous les visiteurs**,
  depuis n'importe quel appareil. C'est le mode « autonomie totale ». Voir ci-dessous.
- **Local (par défaut si Supabase non configuré)** — les modifications restent dans le
  **navigateur** (localStorage), sur l'appareil utilisé. Pour transférer : **Exporter** le
  `.json` ici, puis **Importer** là-bas.

## Activer le mode en ligne (Supabase)
1. Créer un projet gratuit sur [supabase.com](https://supabase.com) (idéalement **séparé**
   des autres projets).
2. **SQL Editor** > New query > coller le contenu de `supabase-setup.sql` > **Run**.
3. **Settings > API** : copier **Project URL** et la clé **anon public**.
4. Dans `script.js`, remplacer les deux constantes en haut :
   ```js
   const SUPABASE_URL = "https://xxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJ....";  // clé anon (publique, sans droit d'écriture)
   ```
5. Recharger le site : il lit désormais le contenu en ligne. En mode édition, le bouton
   **Enregistrer** publie pour tout le monde.

> La clé **anon** est publique par nature. Grâce au RLS, elle ne permet que la **lecture** ;
> toute écriture passe par des fonctions serveur qui **vérifient le code** (bcrypt).
> Le code par défaut reste **`1234`** — à changer dès la première connexion.

## Héberger en ligne (GitHub Pages)
1. Créer un repo GitHub et y pousser les fichiers de ce dossier.
2. **Settings > Pages** > Source : branche `main`, dossier `/root` > Save.
3. Le site est publié sur `https://<compte>.github.io/<repo>/`.

Alternative sans compte : glisser le dossier sur **Netlify Drop** (netlify.com/drop).
Tout fonctionne tel quel, sans build.

## Fichiers
- `index.html` : structure
- `styles.css` : design (palette, mise en page, responsive)
- `script.js` : données par défaut, rendu, mode édition et connexion Supabase
- `supabase-setup.sql` : script à exécuter une fois pour activer le mode en ligne
