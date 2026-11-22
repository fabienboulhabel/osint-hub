# Code de l'application

Un fichier par module. Ils sont chargés **dans l'ordre des numéros** par `index.html` et partagent les mêmes variables : un module peut utiliser une fonction d'un autre, à condition de ne l'appeler qu'après le chargement complet (au clic, à l'ouverture d'une page, ou dans `16-demarrage.js`).

| Fichier | Rôle |
|---|---|
| `00-base.js` | Bandeau d'erreur, base IndexedDB (images, dossier de sauvegarde), état de la connexion. Chargé avant tout le reste. |
| `01-config.js` | Version, utilitaires, réglages et personnalisation, calendrier d'activité |
| `02-navigation.js` | Navigation par ancres, barre du haut, menu plein écran, visionneuse intégrée |
| `03-decor.js` | Courbes de niveau animées en arrière-plan |
| `04-accueil.js` | Globe interactif, coupe topographique, animations de l'accueil |
| `05-chrono.js` | Chronomètre d'entraînement |
| `06-recherche.js` | Module Recherche et opérateurs avancés |
| `07-carte.js` | Carte GEOINT : fonds, soleil, mesure, rayon, calques Overpass, avant / après |
| `08-photo.js` | Analyse photo (EXIF, réglages, observations) |
| `09-entrainement.js` | Programme, quiz, GeoGuessr, partie intégrée, exercice photo, mémo et révision espacée |
| `10-enquetes.js` | Dossiers, fiches (images comprises), tableau à fils, recherche globale, rapports |
| `11-sauvegarde.js` | Sauvegarde / restauration, rappel, sauvegarde automatique dans un dossier |
| `12-tableau-de-bord.js` | Tableau de bord |
| `13-parametres.js` | À propos, textes légaux, paramètres, charte |
| `14-palette.js` | Palette de commandes (Ctrl+K) et raccourcis clavier |
| `15-visite.js` | Visite guidée, barre mobile, accessibilité |
| `16-demarrage.js` | Initialisation : toujours en dernier |
| `17-voyage.js` | Transition « voyage » entre les pages |
| `18-reseau.js` | Fond animé : graphe d'enquête |

Pour ajouter un module : crée `NN-nom.js`, ajoute la balise `<script>` à sa place dans `index.html` et le fichier dans la liste `FILES` de `sw.js`.
