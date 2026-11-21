# OSINT Hub

**Carnet de terrain numérique pour s'entraîner à l'OSINT et à la géolocalisation d'images.**
Une application web installable (PWA), sans serveur ni compte : tout reste dans ton navigateur.

![Version](https://img.shields.io/badge/version-6.0.0-ff3b00?style=flat-square)
![HTML](https://img.shields.io/badge/HTML-CSS-JS-0d0d0d?style=flat-square)
![PWA](https://img.shields.io/badge/PWA-installable-0d0d0d?style=flat-square)
![Licence](https://img.shields.io/badge/licence-MIT-0d0d0d?style=flat-square)

> ⚠️ **Usage éthique uniquement.** Cet outil sert à l'apprentissage et à l'aide bénévole encadrée.
> Toute utilisation pour surveiller, traquer ou exposer une personne est interdite.
> Lire les [conditions d'utilisation](CONDITIONS_UTILISATION.md) avant de commencer.

---

## Sommaire

- [Modules](#modules)
- [Entraînement](#entraînement)
- [Démarrage rapide](#démarrage-rapide)
- [Mise en ligne avec GitHub Pages](#mise-en-ligne-avec-github-pages)
- [Installer comme application Windows](#installer-comme-application-windows)
- [Sauvegarde de tes données](#sauvegarde-de-tes-données)
- [Raccourcis](#raccourcis)
- [Structure du projet](#structure-du-projet)
- [Personnalisation](#personnalisation)
- [Tests automatiques](#tests-automatiques)
- [Publier une mise à jour](#publier-une-mise-à-jour)
- [Pourquoi certains sites s'ouvrent dans un onglet](#pourquoi-certains-sites-souvrent-dans-un-onglet)
- [Données et vie privée](#données-et-vie-privée)
- [Services tiers](#services-tiers)
- [Licence](#licence)

---

## Modules

| # | Module | Ce qu'il fait |
|---|---|---|
| 00 | **Accueil** | Globe de la planète (pays, îles et petits territoires, zoom, points enregistrés, recherche mondiale), coupe topographique entre deux points du monde, méthode, règles |
| 01 | **Tableau de bord** | Statistiques, rang et XP, calendrier d'activité, prochaines étapes, conseil du jour |
| 02 | **Recherche** | Détecte pseudo / nom / URL / image et prépare Dorks, WhatsMyName, recherche inversée, archives. Opérateurs avancés : `intitle:`, `inurl:`, `filetype:`, `site:`, exclusions, OR, dates |
| 03 | **Carte GEOINT** | Plan IGN, photo aérienne IGN, satellite Esri ; soleil et ombres ; mesure ; **cercle de rayon** ; **calques Overpass** (arrêts, églises, antennes…) ; **comparaison avant / après** avec les photos aériennes 1950-1965 |
| 04 | **Analyse photo** | Métadonnées EXIF et GPS, loupe, contraste / luminosité / inversion, grille, observations, **création d'une fiche avec la photo** |
| 05 | **Entraînement** | Programme guidé en 5 niveaux, quiz, exercices photo, partie intégrée, suivi GeoGuessr, mémo à révision espacée, badges |
| 06 | **Enquêtes** | Dossiers, fiches **avec images**, tableau à fils rouges, chronologie, **recherche dans toutes les fiches**, rapports **PDF** et Markdown |
| — | **Visionneuse** | Panneau à onglets : Google Maps, satellite, Street View et OpenStreetMap s'affichent dans le hub |
| — | **Menu** | Tuiles avec infos en direct, actions rapides, résumé du jour ; personnalisable |
| — | **À propos** | Conditions, confidentialité, paramètres (thème, effets, sauvegarde automatique, visite guidée, effacement) |

## Entraînement

| Onglet | Contenu |
|---|---|
| **Programme** | 24 étapes en 5 niveaux (Fondations → Méthode d'enquêteur), chacune avec un guide : pourquoi, comment faire, critère de fin, astuce. Validation automatique quand c'est possible. XP, 5 rangs, 12 badges |
| **Exercices** | **Exercice photo** : 5 vraies photos géolocalisées de Wikimedia Commons à situer sur la carte (France ou Lyon / AURA). **5 quiz** jouables au clavier : Départements, Indices France & Lyon, Indices Europe, Outils & méthode, Ombres & heure |
| **GeoGuessr** | Partie intégrée (Street View dans le hub), défi du jour, cartes, sessions, statistiques filtrables, **analyse des lieux les plus ratés** |
| **Mémo indices** | Fiches d'indices par catégorie et zone, recherche, **révision espacée** (les indices sus reviennent dans 1, 3, 7, 15 puis 30 jours) |

Le contenu pédagogique est dans `data.js` : questions, étapes du programme, indices de départ, lieux des parties. Tu peux l'enrichir sans toucher au reste du code.

## Démarrage rapide

Aucune installation : c'est du HTML, CSS et JavaScript.

1. Cloner le dépôt ou télécharger le ZIP.
2. Ouvrir `index.html` dans Edge ou Chrome.
3. Accepter la charte : une visite guidée de 7 étapes présente l'interface.

> En local (`file://`), tout fonctionne sauf l'installation en application, le mode hors ligne et la sauvegarde automatique dans un dossier, qui demandent une adresse **https**.
> Une connexion Internet est nécessaire pour la carte, les polices, la lecture des métadonnées, les altitudes et les exercices en ligne. Un badge **⚠ HORS LIGNE** s'affiche quand ce n'est pas le cas.

### Avec Visual Studio

1. **Fichier › Ouvrir › Dossier…** puis choisir le dossier du projet.
2. Clic droit sur `index.html` › **Open With…** › ajouter `msedge.exe` › **Set as Default**.

## Mise en ligne avec GitHub Pages

1. Pousser le projet sur GitHub.
2. Dans le dépôt : **Settings › Pages**.
3. **Source** : *Deploy from a branch* · branche `main` · dossier `/ (root)` › **Save**.
4. Le site est disponible après une à deux minutes sur `https://<pseudo>.github.io/<nom-du-depot>/`.

> GitHub Pages est gratuit pour les dépôts **publics**. Pour un dépôt privé, un abonnement payant est nécessaire.

## Installer comme application Windows

1. Ouvrir l'adresse GitHub Pages dans **Edge**.
2. **…› Applications › Installer ce site en tant qu'application**.
3. Clic droit sur l'icône dans la barre des tâches › **Épingler**.

## Sauvegarde de tes données

Tes données ne sont **que dans ce navigateur**. Vider le cache ou changer de PC les fait disparaître sans sauvegarde.

| Méthode | Où | Comment |
|---|---|---|
| **Automatique** (recommandée) | À propos › Paramètres › Sauvegarde automatique | Choisis un dossier (OneDrive, clé USB, NAS…) : l'application y écrit une sauvegarde à chaque modification. Après un redémarrage du navigateur, clique « Réactiver » |
| **Manuelle** | Enquêtes ou Paramètres › Sauvegarder | Télécharge un fichier `.json` complet, images comprises |
| **Rappel** | À propos › Paramètres › Rappel | Un bandeau te le rappelle tous les 3, 7, 14 ou 30 jours |

Pour restaurer : **Enquêtes › Restaurer .json**.

## Raccourcis

| Touche | Action |
|---|---|
| `0` à `6` | Aller au module correspondant |
| `Ctrl` + `K` | Palette de commandes |
| `Échap` | Fermer menu, palette, fenêtre ou visite |
| `Entrée` | Accueil : entrer · Recherche : ouvrir l'outil surligné · Quiz : question suivante |
| `1` à `4` | Pendant un quiz : choisir une réponse |
| Bouton retour de la souris | Page précédente |
| `Ctrl` + `V` | Coller une image pour l'analyser, ou dans le formulaire d'une fiche pour la joindre |

## Structure du projet

```
osint-hub/
├── index.html                  Structure de toutes les pages
├── 404.html                    Page « introuvable » pour GitHub Pages
├── styles.css                  Mise en forme (thèmes papier et nuit, mobile)
├── js/                         Code de l'application, un fichier par module (voir js/README.md)
├── data.js                     Contenu pédagogique (questions, programme, départements, indices, lieux)
├── world.js                    Contours des pays pour le globe (Natural Earth, domaine public)
├── land.js                     Terres et îles détaillées (GSHHG) + petits pays et territoires
├── legal.js                    Textes légaux intégrés (copie des fichiers .md)
├── sw.js                       Service worker (hors ligne)
├── manifest.json               Déclaration de l'application installable
├── icons/                      Icônes 192 et 512 px, favicon SVG
├── tests/                      Tests automatiques (vérification des fichiers + navigateur)
├── .github/workflows/          Lancement des tests par GitHub Actions
├── package.json                Outils de test uniquement (le site n'a besoin d'aucune installation)
├── playwright.config.js        Configuration des tests navigateur
├── README.md                   Ce fichier
├── CONDITIONS_UTILISATION.md   Conditions d'utilisation
├── CONFIDENTIALITE.md          Politique de confidentialité
├── CHANGELOG.md                Historique des versions
├── LICENSE                     Licence MIT
├── .gitignore                  Fichiers exclus de Git (dont .vs, node_modules, sauvegardes)
└── .nojekyll                   Publication telle quelle sur GitHub Pages
```

## Personnalisation

| Quoi | Où |
|---|---|
| Ordre et affichage des modules, actions rapides, couleur d'accent | Dans l'application : **MENU › ✎ Personnaliser** |
| Cartes GeoGuessr | Dans l'application : Entraînement › GeoGuessr (bouton ✎ ou « + Carte ») |
| Questions, étapes du programme, indices de départ, lieux des parties | `data.js` |
| Calques Overpass proposés sur la carte | `js/07-carte.js`, liste `OV_PRESETS` |
| Lien vers ton dépôt (pied de page) | `js/01-config.js`, constante `REPO_URL` |
| Polices et couleurs de base | `styles.css`, variables au début du fichier |
| Textes légaux | Les fichiers `.md`. En ligne, l'application les lit directement ; `legal.js` sert de secours en local |

Si tu modifies les conditions de manière importante, augmente `TERMS_VERSION` dans `js/01-config.js` : l'accord sera redemandé.

## Tests automatiques

À chaque envoi sur `main` et à chaque **pull request**, GitHub Actions :

1. vérifie la syntaxe de tous les fichiers JavaScript et la présence de chaque fichier chargé (`tests/check-files.mjs`) ;
2. ouvre le site dans Chromium et vérifie que chaque module s'ouvre sans erreur, qu'on peut créer un dossier et modifier une fiche, et qu'un quiz se joue jusqu'au bout (`tests/app.spec.js`).

Le résultat apparaît dans l'onglet **Actions** du dépôt et directement dans la pull request (✓ vert ou ✗ rouge).

En local (facultatif, nécessite Node.js) :

```bash
node tests/check-files.mjs          # vérification rapide, sans installation
npm install && npx playwright install chromium && npm test   # tests complets
```

## Publier une mise à jour

1. Modifier les fichiers.
2. Si un fichier est ajouté dans `js/`, l'ajouter dans `index.html` et dans `sw.js`.
3. Dans `sw.js`, augmenter le numéro de `CACHE` (par exemple `osint-hub-v11` › `osint-hub-v12`).
4. Commit puis push. Dans le navigateur : `Ctrl` + `F5`.

## Pourquoi certains sites s'ouvrent dans un onglet

Google Search, Yandex, TinEye, GeoGuessr et la plupart des grands sites envoient une consigne de sécurité qui interdit leur affichage à l'intérieur d'un autre site. Aucun site ne peut contourner ce blocage. Pour ceux-là, le plus confortable est l'**écran partagé d'Edge** : le hub d'un côté, l'outil de l'autre.

## Données et vie privée

- Pas de compte, pas de cookie, pas de statistiques de visite.
- Les données sont dans le stockage du navigateur (`localStorage` et `IndexedDB` pour les images) ; les photos analysées ne sont jamais envoyées.
- Sauvegarde automatique dans un dossier de ton choix, ou manuelle au format `.json`.

Détails : [Politique de confidentialité](CONFIDENTIALITE.md).

## Services tiers

| Service | Utilisation |
|---|---|
| [Leaflet](https://leafletjs.com) | Cartes interactives |
| [SunCalc](https://github.com/mourner/suncalc) | Position du soleil (carte et exercice « Ombres & heure ») |
| [exifr](https://github.com/MikeKovarik/exifr) | Lecture des métadonnées photo |
| [IGN Géoplateforme](https://geoservices.ign.fr) | Plan IGN, photographies aériennes actuelles et anciennes |
| Esri World Imagery | Imagerie satellite |
| [OpenStreetMap](https://www.openstreetmap.org) / Nominatim | Recherche de lieux, lien et visionneuse « OpenStreetMap » |
| [Overpass API](https://overpass-api.de) | Calques d'objets OpenStreetMap sur la carte |
| [Wikimedia Commons](https://commons.wikimedia.org) | Photos des exercices de géolocalisation (licences libres, auteur affiché) |
| [Open-Meteo](https://open-meteo.com) | Altitudes (Copernicus DEM GLO-90 © ESA) pour la coupe topographique |
| [Natural Earth](https://www.naturalearthdata.com) | Contours des pays du globe (domaine public) |
| [GSHHG](https://www.soest.hawaii.edu/pwessel/gshhg/) | Terres et îles du globe (licence LGPL) |
| Google Maps (intégration sans clé) | Visionneuse : carte, satellite, Street View |
| Google Fonts | Polices Archivo et JetBrains Mono |

Ressources de formation citées : [Gralhix](https://gralhix.com) (Sofia Santos), [Bellingcat](https://www.bellingcat.com), [GeoGuessr](https://www.geoguessr.com), [WorldGuessr](https://www.worldguessr.com), [ARPD](https://www.arpd.fr).
Le projet n'est affilié à aucun de ces services ou organismes.

## Licence

Code publié sous licence [MIT](LICENSE). Les marques citées appartiennent à leurs titulaires. Les photos des exercices restent la propriété de leurs auteurs, sous leur licence Wikimedia Commons.
