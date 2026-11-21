# Politique de confidentialité

**OSINT Hub** · Version 1.2 · Dernière mise à jour : 21 novembre 2026

## En bref

- Pas de compte, pas de cookie, pas de mesure d'audience, pas de serveur appartenant à l'auteur.
- Tes données restent dans ton navigateur, sur ton ordinateur.
- Les photos que tu analyses ne quittent jamais ton ordinateur.
- Certaines fonctions contactent des services tiers (cartes, polices, bibliothèques) : ceux-ci voient ton adresse IP.

## 1. Données enregistrées sur ton appareil

L'outil utilise le stockage local du navigateur (`localStorage`). Ces données ne sont pas synchronisées et ne sont accessibles qu'à ce navigateur, sur cet appareil.

| Donnée | Contenu |
|---|---|
| Enquêtes | Indices, hypothèses, preuves, coordonnées, positions et fils du tableau |
| Entraînement | Étapes du programme, résultats des exercices, badges, défis perso |
| GeoGuessr | Liens de tes cartes, sessions (carte, mode, score, durée, notes), objectif |
| Mémo | Indices de géolocalisation que tu as notés |
| Activité | Temps d'entraînement, points d'activité par jour |
| Recherche | Les 8 dernières recherches saisies |
| Carte | Dernière position et dernier fond de carte affichés |
| Globe et coupe | Points enregistrés sur le globe, départ et arrivée de la coupe, altitudes déjà téléchargées (cache) |
| Réglages | Thème, effets, couleur d'accent, ordre du menu, actions rapides, acceptation des conditions |

Supprimer les données du site dans ton navigateur efface tout. Pense à faire une **sauvegarde .json** (module Enquêtes ou Paramètres) si tu veux les conserver.

## 2. Photos

Les images déposées dans le module Photo sont lues localement : affichage, réglages et lecture des métadonnées EXIF. **Elles ne sont envoyées nulle part.** Une image n'est transmise à un service de recherche inversée que si tu la colles ou l'importes toi-même dans ce service.

## 3. Services tiers contactés automatiquement

| Service | Rôle | Ce qu'il reçoit |
|---|---|---|
| Google Fonts | Polices d'écriture | Adresse IP |
| unpkg.com, jsDelivr | Bibliothèques Leaflet, SunCalc, exifr | Adresse IP |
| IGN Géoplateforme, Esri | Fonds de carte | Adresse IP, zone de carte affichée |
| Nominatim (OpenStreetMap) | Recherche de lieu (carte, globe) et nom du point cliqué sur le globe | Texte saisi ou coordonnées, adresse IP |
| Open-Meteo | Altitudes de la coupe topographique | Coordonnées des 100 points du trajet, adresse IP |
| GitHub Pages | Hébergement du site | Adresse IP, journaux techniques |

## 4. Services ouverts à ta demande

Quand tu cliques sur un outil, il s'ouvre soit dans la **visionneuse intégrée** (Google Maps, vue satellite, Street View, OpenStreetMap), soit dans un nouvel onglet pour les sites qui interdisent l'intégration (Google, Yandex, GeoGuessr…). Dans les deux cas, ce service reçoit ta requête et applique sa propre politique de confidentialité. La visionneuse peut être désactivée dans les Paramètres.

Bonne pratique (OPSEC) : utilise un navigateur dédié et des comptes neutres, jamais tes profils personnels.

## 5. Informations sur d'autres personnes

Tes notes peuvent contenir des informations sur d'autres personnes. Applique le principe de minimisation :

- ne note que ce qui est strictement utile à l'exercice ;
- n'enregistre aucune donnée sensible (santé, opinions, vie intime…) ;
- supprime les données dès que l'exercice est terminé ;
- ne partage pas tes exports.

Dans un cas réel, transmets les informations aux enquêteurs ou à l'association concernée, puis supprime-les de l'outil.

## 6. Effacer tes données

- Dans l'application : **À propos › Paramètres › Effacer toutes les données**.
- Ou dans le navigateur : paramètres du site › effacer les données.

L'auteur ne détient aucune de tes données : il ne peut ni y accéder, ni les supprimer pour toi.

## 7. Contact

Pour toute question : ouvrir une « Issue » sur le dépôt GitHub du projet.
