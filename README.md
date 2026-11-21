# OSINT Hub

**Carnet de terrain numérique pour s'entraîner à l'OSINT et à la géolocalisation d'images.**
Une application web installable (PWA), sans serveur ni compte : tout reste dans ton navigateur.

![HTML](https://img.shields.io/badge/HTML-CSS-JS-0d0d0d?style=flat-square)
![PWA](https://img.shields.io/badge/PWA-installable-ff3b00?style=flat-square)
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
- [Raccourcis](#raccourcis)
- [Structure du projet](#structure-du-projet)
- [Personnalisation](#personnalisation)
- [Publier une mise à jour](#publier-une-mise-à-jour)
- [Données et vie privée](#données-et-vie-privée)
- [Services tiers](#services-tiers)
- [Licence](#licence)

---

## Modules

| # | Module | Ce qu'il fait |
|---|---|---|
| 00 | **Accueil** | Globe interactif, présentation des modules, méthode, règles de terrain |
| 01 | **Tableau de bord** | Statistiques, rang et XP, calendrier d'activité, prochaines étapes, conseil du jour |
| 02 | **Recherche** | Détecte pseudo / nom / URL / image et prépare Dorks, WhatsMyName, recherche inversée, archives |
| 03 | **Carte GEOINT** | Fonds IGN, satellite, OSM ; outils ouverts sur le point choisi ; soleil et ombres ; mesure de distance |
| 04 | **Analyse photo** | Métadonnées EXIF et GPS, loupe, réglages contraste/luminosité/inversion, grille, observations |
| 05 | **Entraînement** | Programme en 5 niveaux, exercices intégrés, suivi GeoGuessr, mémo d'indices, badges |
| 06 | **Enquêtes** | Chronologie et **tableau d'enquête** (fiches déplaçables reliées par des fils), exports |
| — | **Menu** | Tuiles avec infos en direct, actions rapides, résumé du jour ; personnalisable |
| — | **À propos** | Conditions, confidentialité, paramètres (thème, effets, sauvegarde, effacement) |

## Entraînement

| Onglet | Contenu |
|---|---|
| **Programme** | 23 étapes réparties en 5 niveaux (Fondations → Méthode d'enquêteur). Certaines se valident automatiquement (quiz réussi, nombre de parties GeoGuessr, dossier complet…). XP, 5 rangs et 12 badges |
| **Exercices** | 4 quiz de 10 questions, jouables au clavier (touches 1 à 4) : Départements (numéro, nom, préfecture, option Auvergne-Rhône-Alpes), Indices France & Lyon, Outils & méthode, Ombres & heure (calculé avec SunCalc) |
| **GeoGuessr** | Tes cartes, défi du jour (carte, mode, objectif, contrainte), journal des sessions avec mode, durée et notes, statistiques filtrables, courbe avec objectif |
| **Mémo indices** | Fiches d'indices par catégorie et zone, recherche, mode révision façon flashcards |

Le contenu pédagogique se trouve dans `data.js` : tu peux ajouter des questions, des étapes ou des indices sans toucher au reste du code.

## Démarrage rapide

Aucune installation : c'est du HTML, CSS et JavaScript.

1. Cloner le dépôt ou télécharger le ZIP.
2. Ouvrir `index.html` dans Edge ou Chrome.

> En local (`file://`), tout fonctionne sauf l'installation en application et le mode hors ligne, qui demandent une adresse **https**.
> Une connexion Internet est nécessaire pour la carte, les polices, la lecture des métadonnées et l'exercice « Ombres & heure ».

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

## Raccourcis

| Touche | Action |
|---|---|
| `0` à `6` | Aller au module correspondant |
| `Ctrl` + `K` | Palette de commandes |
| `Échap` | Fermer menu, palette ou fenêtre |
| `Entrée` | Accueil : entrer · Recherche : ouvrir l'outil surligné · Quiz : question suivante |
| `1` à `4` | Pendant un quiz : choisir une réponse |
| Bouton retour de la souris | Page précédente |
| `Ctrl` + `V` | Coller une image pour l'analyser |

## Structure du projet

```
osint-hub/
├── index.html                  Structure de toutes les pages
├── styles.css                  Mise en forme (thèmes papier et nuit)
├── app.js                      Logique de l'application
├── data.js                     Contenu pédagogique (questions, programme, départements, indices)
├── legal.js                    Textes légaux intégrés (copie des fichiers .md)
├── sw.js                       Service worker (hors ligne)
├── manifest.json               Déclaration de l'application installable
├── icons/                      Icônes 192 et 512 px
├── README.md                   Ce fichier
├── CONDITIONS_UTILISATION.md   Conditions d'utilisation
├── CONFIDENTIALITE.md          Politique de confidentialité
├── CHANGELOG.md                Historique des versions
├── LICENSE                     Licence MIT
├── .gitignore                  Fichiers exclus de Git (dont .vs de Visual Studio)
└── .nojekyll                   Publication telle quelle sur GitHub Pages
```

## Personnalisation

| Quoi | Où |
|---|---|
| Ordre et affichage des modules, actions rapides, couleur d'accent | Dans l'application : **MENU › ✎ Personnaliser** |
| Cartes GeoGuessr | Dans l'application : Entraînement › GeoGuessr (bouton ✎ ou « + Carte ») |
| Questions, étapes du programme, indices de départ | `data.js` |
| Lien vers ton dépôt (pied de page) | `app.js`, constante `REPO_URL` tout en haut |
| Polices et couleurs de base | `styles.css`, variables au début du fichier |
| Textes légaux | Les fichiers `.md`. En ligne, l'application les lit directement ; `legal.js` sert de secours en local |

Si tu modifies les conditions de manière importante, augmente `TERMS_VERSION` dans `app.js` : l'accord sera redemandé.

## Publier une mise à jour

1. Modifier les fichiers.
2. Dans `sw.js`, augmenter le numéro de `CACHE` (par exemple `osint-hub-v6` › `osint-hub-v7`).
3. Commit puis push. Dans le navigateur : `Ctrl` + `F5`.

## Données et vie privée

- Pas de compte, pas de cookie, pas de statistiques de visite.
- Les données sont dans le `localStorage` du navigateur et les photos ne sont jamais envoyées.
- Sauvegarde et restauration au format `.json` depuis le module Enquêtes ou les Paramètres.

Détails : [Politique de confidentialité](CONFIDENTIALITE.md).

## Services tiers

| Service | Utilisation |
|---|---|
| [Leaflet](https://leafletjs.com) | Carte interactive |
| [SunCalc](https://github.com/mourner/suncalc) | Position du soleil (carte et exercice « Ombres & heure ») |
| [exifr](https://github.com/MikeKovarik/exifr) | Lecture des métadonnées photo |
| [IGN Géoplateforme](https://geoservices.ign.fr) | Plan IGN et photographies aériennes |
| [OpenStreetMap](https://www.openstreetmap.org) / Nominatim | Fond de carte, recherche d'adresse |
| Esri World Imagery | Imagerie satellite |
| Google Fonts | Polices Archivo et JetBrains Mono |

Ressources de formation citées : [Gralhix](https://gralhix.com) (Sofia Santos), [Bellingcat](https://www.bellingcat.com), [GeoGuessr](https://www.geoguessr.com), [WorldGuessr](https://www.worldguessr.com), [ARPD](https://www.arpd.fr).
Le projet n'est affilié à aucun de ces services ou organismes.

## Licence

Code publié sous licence [MIT](LICENSE). Les marques citées appartiennent à leurs titulaires.
