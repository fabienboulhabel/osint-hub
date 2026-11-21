# Politique de confidentialité

**OSINT Hub** · Version 1.0 · Dernière mise à jour : 21 novembre 2026

## En bref

- Pas de compte, pas de cookie, pas de mesure d'audience, pas de serveur appartenant à l'auteur.
- Tes données restent dans ton navigateur, sur ton ordinateur.
- Les photos que tu analyses ne quittent jamais ton ordinateur.
- Certaines fonctions contactent des services tiers (cartes, polices, bibliothèques) : ceux-ci voient ton adresse IP.

## 1. Données enregistrées sur ton appareil

L'outil utilise le stockage local du navigateur (`localStorage`). Ces données ne sont pas synchronisées et ne sont accessibles qu'à ce navigateur, sur cet appareil.

| Donnée | Contenu |
|---|---|
| Enquêtes | Indices, hypothèses, preuves, coordonnées, positions sur le tableau |
| Entraînement | Défis, sessions et scores GeoGuessr, liens de tes cartes |
| Activité | Temps d'entraînement, points d'activité par jour |
| Recherche | Les 8 dernières recherches saisies |
| Carte | Dernière position et dernier fond de carte affichés |
| Réglages | Thème, effets visuels, acceptation des conditions |

Supprimer les données du site dans ton navigateur efface tout. Pense à faire une **sauvegarde .json** (module Enquêtes) si tu veux les conserver.

## 2. Photos

Les images déposées dans le module Photo sont lues localement : affichage, réglages et lecture des métadonnées EXIF. **Elles ne sont envoyées nulle part.** Une image n'est transmise à un service de recherche inversée que si tu la colles ou l'importes toi-même dans ce service.

## 3. Services tiers contactés automatiquement

| Service | Rôle | Ce qu'il reçoit |
|---|---|---|
| Google Fonts | Polices d'écriture | Adresse IP |
| unpkg.com, jsDelivr | Bibliothèques Leaflet, SunCalc, exifr | Adresse IP |
| IGN Géoplateforme, Esri, OpenStreetMap | Fonds de carte | Adresse IP, zone de carte affichée |
| Nominatim (OpenStreetMap) | Recherche d'adresse sur la carte | Texte saisi, adresse IP |
| GitHub Pages | Hébergement du site | Adresse IP, journaux techniques |

## 4. Services ouverts à ta demande

Quand tu cliques sur un outil (Google, Yandex, Street View…), un nouvel onglet s'ouvre avec ta requête. Ce service reçoit alors ta recherche et applique sa propre politique de confidentialité.

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
