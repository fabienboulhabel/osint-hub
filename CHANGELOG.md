# Historique des versions

## 6.0.0 — 21/11/2026

### Fiabilité
- Code découpé en 17 modules (`js/`), chargés dans l'ordre ; documentation dans `js/README.md`.
- Bandeau d'erreur : toute erreur s'affiche avec un bouton « Copier le message ».
- Sauvegarde automatique dans un dossier choisi (Edge / Chrome), rappel de sauvegarde réglable, sauvegarde .json avec les images.
- Badge « ⚠ HORS LIGNE » et messages clairs dans les modules qui ont besoin d'Internet.

### Enquêtes et photo
- Images jointes aux fiches (bouton, glisser-déposer, Ctrl+V), visibles sur le tableau et dans la chronologie, agrandissables.
- Recherche dans toutes les fiches de tous les dossiers.
- Rapport PDF mis en page (images comprises).
- Module Photo : « Créer une fiche avec cette photo » (image, observations et GPS recopiés).

### Carte et recherche
- Cercle de rayon autour du point.
- Calques Overpass affichés sur la carte (12 types d'objets + filtre personnalisé).
- Comparaison avant / après avec les photos aériennes IGN 1950-1965 (barre à glisser).
- Recherche : opérateurs avancés (intitle, inurl, filetype, site, OR, exclusions, dates).

### Entraînement
- Exercice photo : 5 vraies photos Wikimedia Commons à géolocaliser, auteur et licence affichés.
- Quiz « Indices Europe » (15 questions).
- Mémo : révision espacée (1, 3, 7, 15, 30 jours).
- Analyse des parties intégrées et exercices photo : erreur moyenne, tendance, lieux les plus ratés.
- Nouvelle étape du programme (24 au total).

### Finition
- Visite guidée de 7 étapes au premier lancement (relançable dans les Paramètres).
- Accessibilité : focus visible, lien « Aller au contenu », boutons nommés pour les lecteurs d'écran, contraste renforcé si demandé par le système.
- Mobile : barre de navigation en bas, panneau de carte repliable, mises en page adaptées.
- Page 404, nouvelle icône et favicon.
- Tests automatiques GitHub Actions à chaque envoi et pull request.
- Correction : le bouton « NUIT » des paramètres était presque invisible en thème papier.

## 5.4.2 — 21/11/2026
- Menu de navigation : suit désormais le thème papier.

## 5.4.1 — 21/11/2026
- Carte : plus d'écran noir au zoom maximal (les dernières tuiles disponibles sont agrandies au lieu d'être demandées dans le vide).
- Carte : fond OpenStreetMap retiré (bloqué par ses serveurs, erreur 403). OpenStreetMap reste disponible dans « Ouvrir ce point dans ».
- Partie intégrée : la carte de réponse utilise le Plan IGN.

## 5.4.0 — 21/11/2026
- Globe : correction du décalage au survol (le globe tournait sous la souris), rotation en pause pendant le survol, coordonnées robustes au zoom du navigateur.
- Globe : îles et terres détaillées (GSHHG), 106 petits pays, territoires et îles nommés (Monaco, Malte, La Réunion, Antilles, Corse…).
- Entraînement › GeoGuessr : partie intégrée jouable dans le hub (Street View + carte de réponse, 5 manches, score enregistrable).
- Enquêtes : suppression de la pastille « Nouveau dossier » (le champ de création suffit).

## 5.3.0 — 21/11/2026
- Globe : la planète entière (177 pays), nom du pays au survol, zoom, sélection d'un point au clic, recherche de lieu dans le monde, points enregistrés.
- Coupe topographique mondiale : départ A et arrivée B au choix (points du globe ou 9 parcours prédéfinis), altitudes réelles (Open-Meteo / Copernicus), distance, D+, position suivie sur le globe.
- Visionneuse intégrée : Google Maps, satellite, Street View et OpenStreetMap s'ouvrent dans un panneau à onglets du hub.
- Enquêtes : fiches modifiables (✎ ou double-clic), liste des dossiers en pastilles, création de dossier fiabilisée.

## 5.2.0 — 21/11/2026
- Accueil : le bandeau défilant est remplacé par une coupe topographique interactive Lyon → Mont Blanc (survol = distance et altitude).
- Programme d'entraînement guidé : chaque étape a un guide dépliable (pourquoi, comment faire pas à pas, critère de fin, astuce, durée indicative).
- Bloc « Ton prochain pas » avec le guide complet de l'étape suivante, mode d'emploi du programme, objectif de chaque niveau.

## 5.1.0 — 21/11/2026
- **Menu repensé** : tuiles par module avec icône, raccourci et infos en direct, actions rapides, résumé du jour.
- **Personnalisation** : ordre et affichage des modules (menu et barre du haut), choix des actions rapides, couleur d'accent (7 couleurs ou couleur libre).
- **Entraînement entièrement refait**, en 4 onglets :
  - Programme en 5 niveaux (23 étapes, validation automatique), XP, 5 rangs, 12 badges ;
  - 4 exercices intégrés : Départements, Indices France & Lyon, Outils & méthode, Ombres & heure ;
  - GeoGuessr : défi du jour, sessions avec mode / durée / notes, statistiques filtrables, objectif sur la courbe ;
  - Mémo d'indices avec recherche, catégories et révision.
- Cartes GeoGuessr « France » et « Lyon / AURA » préconfigurées ; « No Move » devient un mode de session.
- Tableau de bord : XP, rang et prochaines étapes du programme.
- Contenu pédagogique séparé dans `data.js`.
- Sauvegarde .json étendue à toutes les nouvelles données.

## 5.0.0
- Identité visuelle « carnet de terrain », globe interactif, tableau d'enquête à fils, charte et textes légaux, README.

## 4.0.0
- Refonte complète, navigation par ancres, palette de commandes corrigée.

## 3.0.0
- Page d'accueil animée.

## 2.0.0
- Carte intégrée, analyse photo, enquêtes multiples.

## 1.0.0
- Première version : 5 modules, PWA.
