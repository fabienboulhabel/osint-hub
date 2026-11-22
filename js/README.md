# Code de l'application

Un fichier par module. Ils sont chargés **dans l'ordre des numéros** par `index.html` et partagent les mêmes variables : un module peut utiliser une fonction d'un autre, à condition de ne l'appeler qu'après le chargement complet (au clic, à l'ouverture d'une page, ou dans `16-demarrage.js`).

| Fichier | Rôle |
|---|---|
| `00-base.js` | Bandeau d'erreur, base IndexedDB (images, dossier de sauvegarde), état de la connexion. Chargé avant tout le reste. |
| `01-config.js` | Version, utilitaires, réglages et personnalisation, calendrier d'activité |
| `02-navigation.js` | Navigation par ancres, barre du haut, menu plein écran, visionneuse intégrée |
| `03-decor.js` | Courbes de niveau animées en arrière-plan (désactivées : remplacées par `18-reseau.js`) |
| `04-accueil.js` | Globe interactif, coupe topographique, animations de l'accueil |
| `05-chrono.js` | Chronomètre d'entraînement |
| `06-recherche.js` | Module Recherche et opérateurs avancés |
| `07-carte.js` | Carte GEOINT : fonds, soleil, mesure, rayon, comparaison avant / après, fiches des objets OpenStreetMap |
| `08-photo.js` | Analyse photo (EXIF, réglages, observations) |
| `09-entrainement.js` | Programme, quiz, GeoGuessr, partie intégrée, exercice photo, défis perso, mémo et révision espacée |
| `10-enquetes.js` | Dossiers, fiches (images comprises), tableau à fils, recherche globale, rapports |
| `11-sauvegarde.js` | Sauvegarde / restauration, rappel, sauvegarde automatique dans un dossier |
| `12-tableau-de-bord.js` | Tableau de bord |
| `13-parametres.js` | À propos, textes légaux, paramètres, charte |
| `14-palette.js` | Palette de commandes (Ctrl+K) et raccourcis clavier |
| `15-visite.js` | Visite guidée, barre de navigation mobile, accessibilité |
| `16-demarrage.js` | Initialisation de l'application |
| `17-voyage.js` | Transition « voyage » entre les pages : globe 3D (globe.gl), avion, traînée, cycle jour / nuit ; version légère de secours |
| `18-reseau.js` | Fond animé : graphe d'enquête |
| `19-mobilite.js` | Module Mobilité (page Recherche) : zone atteignable, test de signalement, météo, liens |
| `20-lieux.js` | Recherche de lieux : catalogue de calques, aperçu Nominatim, Overpass, import d'un résultat Overpass Turbo ; branche aussi les onglets « Transports proches » et « Points utiles » de Mobilité. À charger **en dernier** : il remplace des gestionnaires définis dans `07-carte.js` et `19-mobilite.js` |

Pour ajouter un module : crée `NN-nom.js`, ajoute la balise `<script>` à sa place dans `index.html` et le nom du fichier (sans `.js`) dans la liste `JS` de `sw.js`. Le test automatique GitHub échoue s'il manque à l'un des deux endroits.
