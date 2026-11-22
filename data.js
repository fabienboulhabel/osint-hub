/* =========================================================
   OSINT Hub — contenu pédagogique
   Ce fichier ne contient que des données : tu peux l'enrichir
   (questions, étapes du programme, indices…) sans toucher à app.js.
   ========================================================= */

/* ---------- Départements : [numéro, nom, préfecture] ---------- */
window.DEPTS = [
  ["01", "Ain", "Bourg-en-Bresse"], ["02", "Aisne", "Laon"], ["03", "Allier", "Moulins"],
  ["04", "Alpes-de-Haute-Provence", "Digne-les-Bains"], ["05", "Hautes-Alpes", "Gap"], ["06", "Alpes-Maritimes", "Nice"],
  ["07", "Ardèche", "Privas"], ["08", "Ardennes", "Charleville-Mézières"], ["09", "Ariège", "Foix"],
  ["10", "Aube", "Troyes"], ["11", "Aude", "Carcassonne"], ["12", "Aveyron", "Rodez"],
  ["13", "Bouches-du-Rhône", "Marseille"], ["14", "Calvados", "Caen"], ["15", "Cantal", "Aurillac"],
  ["16", "Charente", "Angoulême"], ["17", "Charente-Maritime", "La Rochelle"], ["18", "Cher", "Bourges"],
  ["19", "Corrèze", "Tulle"], ["2A", "Corse-du-Sud", "Ajaccio"], ["2B", "Haute-Corse", "Bastia"],
  ["21", "Côte-d'Or", "Dijon"], ["22", "Côtes-d'Armor", "Saint-Brieuc"], ["23", "Creuse", "Guéret"],
  ["24", "Dordogne", "Périgueux"], ["25", "Doubs", "Besançon"], ["26", "Drôme", "Valence"],
  ["27", "Eure", "Évreux"], ["28", "Eure-et-Loir", "Chartres"], ["29", "Finistère", "Quimper"],
  ["30", "Gard", "Nîmes"], ["31", "Haute-Garonne", "Toulouse"], ["32", "Gers", "Auch"],
  ["33", "Gironde", "Bordeaux"], ["34", "Hérault", "Montpellier"], ["35", "Ille-et-Vilaine", "Rennes"],
  ["36", "Indre", "Châteauroux"], ["37", "Indre-et-Loire", "Tours"], ["38", "Isère", "Grenoble"],
  ["39", "Jura", "Lons-le-Saunier"], ["40", "Landes", "Mont-de-Marsan"], ["41", "Loir-et-Cher", "Blois"],
  ["42", "Loire", "Saint-Étienne"], ["43", "Haute-Loire", "Le Puy-en-Velay"], ["44", "Loire-Atlantique", "Nantes"],
  ["45", "Loiret", "Orléans"], ["46", "Lot", "Cahors"], ["47", "Lot-et-Garonne", "Agen"],
  ["48", "Lozère", "Mende"], ["49", "Maine-et-Loire", "Angers"], ["50", "Manche", "Saint-Lô"],
  ["51", "Marne", "Châlons-en-Champagne"], ["52", "Haute-Marne", "Chaumont"], ["53", "Mayenne", "Laval"],
  ["54", "Meurthe-et-Moselle", "Nancy"], ["55", "Meuse", "Bar-le-Duc"], ["56", "Morbihan", "Vannes"],
  ["57", "Moselle", "Metz"], ["58", "Nièvre", "Nevers"], ["59", "Nord", "Lille"],
  ["60", "Oise", "Beauvais"], ["61", "Orne", "Alençon"], ["62", "Pas-de-Calais", "Arras"],
  ["63", "Puy-de-Dôme", "Clermont-Ferrand"], ["64", "Pyrénées-Atlantiques", "Pau"], ["65", "Hautes-Pyrénées", "Tarbes"],
  ["66", "Pyrénées-Orientales", "Perpignan"], ["67", "Bas-Rhin", "Strasbourg"], ["68", "Haut-Rhin", "Colmar"],
  ["69", "Rhône", "Lyon"], ["70", "Haute-Saône", "Vesoul"], ["71", "Saône-et-Loire", "Mâcon"],
  ["72", "Sarthe", "Le Mans"], ["73", "Savoie", "Chambéry"], ["74", "Haute-Savoie", "Annecy"],
  ["75", "Paris", "Paris"], ["76", "Seine-Maritime", "Rouen"], ["77", "Seine-et-Marne", "Melun"],
  ["78", "Yvelines", "Versailles"], ["79", "Deux-Sèvres", "Niort"], ["80", "Somme", "Amiens"],
  ["81", "Tarn", "Albi"], ["82", "Tarn-et-Garonne", "Montauban"], ["83", "Var", "Toulon"],
  ["84", "Vaucluse", "Avignon"], ["85", "Vendée", "La Roche-sur-Yon"], ["86", "Vienne", "Poitiers"],
  ["87", "Haute-Vienne", "Limoges"], ["88", "Vosges", "Épinal"], ["89", "Yonne", "Auxerre"],
  ["90", "Territoire de Belfort", "Belfort"], ["91", "Essonne", "Évry-Courcouronnes"], ["92", "Hauts-de-Seine", "Nanterre"],
  ["93", "Seine-Saint-Denis", "Bobigny"], ["94", "Val-de-Marne", "Créteil"], ["95", "Val-d'Oise", "Cergy"],
  ["971", "Guadeloupe", "Basse-Terre"], ["972", "Martinique", "Fort-de-France"], ["973", "Guyane", "Cayenne"],
  ["974", "La Réunion", "Saint-Denis"], ["976", "Mayotte", "Mamoudzou"]
];
window.AURA = ["01", "03", "07", "15", "26", "38", "42", "43", "63", "69", "73", "74"];

/* ---------- Banques de questions : [question, bonne réponse, [3 mauvaises], explication] ---------- */
window.BANK_FRANCE = [
  ["Plaque française récente (format SIV) : que contient la bande bleue de droite ?", "Un numéro de département et le logo d'une région", ["Le code postal complet", "L'année de mise en circulation", "Le drapeau tricolore seul"], "Le numéro de département y est choisi par le propriétaire : il n'indique pas forcément où vit la voiture."],
  ["Quel est le format des plaques françaises depuis 2009 ?", "AA-123-AA", ["123 AB 69", "AB-12-34", "69-ABC-12"], "« 123 AB 69 » est l'ancien format (FNI), où le département était à la fin."],
  ["Couleur du fond des plaques françaises actuelles ?", "Blanc à l'avant et à l'arrière", ["Blanc devant, jaune derrière", "Jaune devant et derrière", "Noir avec caractères blancs"], "Les plaques arrière jaunes appartiennent à l'ancien système ; on en croise encore sur de vieux véhicules."],
  ["Cartouche d'une route départementale (D) ?", "Fond jaune, texte noir", ["Fond rouge, texte blanc", "Fond vert, texte blanc", "Fond bleu, texte blanc"], "Jaune = D. C'est l'un des indices les plus fréquents dans la campagne française."],
  ["Cartouche d'une route nationale (N) ?", "Fond rouge, texte blanc", ["Fond jaune, texte noir", "Fond vert, texte blanc", "Fond blanc, texte noir"], "Les autoroutes (A) utilisent aussi un cartouche rouge."],
  ["Cartouche d'une route européenne (E) ?", "Fond vert, texte blanc", ["Fond rouge, texte blanc", "Fond jaune, texte noir", "Fond bleu, texte jaune"], "Le numéro E s'affiche souvent à côté du numéro A ou N."],
  ["Panneaux directionnels d'autoroute en France ?", "Fond bleu", ["Fond vert", "Fond blanc", "Fond jaune"], "Bleu = autoroute, vert = itinéraire principal, blanc = destination locale."],
  ["Panneaux directionnels vers un itinéraire principal (hors autoroute) ?", "Fond vert", ["Fond bleu", "Fond marron", "Fond rouge"], "Le marron est réservé aux indications touristiques."],
  ["Panneau d'entrée d'agglomération ?", "Fond blanc, bordure rouge, nom en noir", ["Fond jaune, nom en noir", "Fond bleu, nom en blanc", "Fond vert, nom en blanc"], "Le même panneau barré de rouge signale la sortie."],
  ["Borne kilométrique au sommet rouge : quel type de route ?", "Route nationale", ["Route départementale", "Voie communale", "Route forestière"], "Sommet jaune = route départementale."],
  ["Borne kilométrique au sommet jaune : quel type de route ?", "Route départementale", ["Route nationale", "Autoroute", "Route européenne"], "Rouge = nationale, jaune = départementale."],
  ["Couleur des lignes de marquage habituelles sur la chaussée ?", "Blanche", ["Jaune", "Orange", "Bleue"], "Le marquage jaune est temporaire : il signale des travaux."],
  ["De quel côté circule-t-on en France ?", "À droite", ["À gauche", "Ça dépend des régions", "À gauche en Corse"], "Partout en France, y compris en Corse et outre-mer."],
  ["Panneaux souvent bilingues avec le breton : quelle région ?", "Bretagne", ["Normandie", "Pays de la Loire", "Nouvelle-Aquitaine"], "On trouve aussi des panneaux bilingues au Pays basque, en Alsace et en Corse."],
  ["Maisons à colombages colorées et villages en « -heim » ou « -willer » ?", "Alsace", ["Bretagne", "Provence", "Landes"], "Ces terminaisons d'origine germanique sont typiques de l'Alsace et de la Moselle."],
  ["Toits de tuiles rouges à faible pente, pins et végétation sèche ?", "Sud méditerranéen", ["Nord de la France", "Bretagne", "Vosges"], "Plus on monte vers le nord, plus les toits deviennent pentus et sombres (ardoise)."],
  ["Les noms de communes en « -ac » sont très fréquents dans…", "le Sud-Ouest et le Massif central", ["l'Alsace", "le Nord", "la Bretagne"], "Héritage gallo-romain, typique d'Occitanie, Nouvelle-Aquitaine et Auvergne."],
  ["Enseigne des pharmacies en France ?", "Une croix verte", ["Une croix rouge", "Un caducée bleu", "Une croix blanche sur fond bleu"], "Elle est souvent lumineuse et animée."],
  ["Préfecture de la région Auvergne-Rhône-Alpes ?", "Lyon", ["Grenoble", "Clermont-Ferrand", "Saint-Étienne"], "Lyon est aussi la préfecture du Rhône (69)."],
  ["Lyon se trouve au confluent de…", "le Rhône et la Saône", ["la Loire et l'Allier", "le Rhône et l'Isère", "la Saône et le Doubs"], "La pointe de la Presqu'île s'appelle d'ailleurs « Confluence »."],
  ["Nom du réseau de transports en commun lyonnais ?", "TCL", ["RTM", "TAN", "RATP"], "RTM = Marseille, TAN = Nantes, RATP = Paris."],
  ["Comment sont nommées les lignes de métro à Lyon ?", "Par des lettres : A, B, C, D", ["Par des numéros de 1 à 14", "M1 à M4", "Par des couleurs uniquement"], "Paris numérote ses lignes ; Lyon utilise des lettres."],
  ["Basilique qui domine Lyon depuis sa colline ouest ?", "Notre-Dame de Fourvière", ["Le Sacré-Cœur", "Notre-Dame de la Garde", "Saint-Sernin"], "La Garde est à Marseille, le Sacré-Cœur à Paris."],
  ["Quelle colline lyonnaise est surnommée « la colline qui travaille » ?", "La Croix-Rousse", ["Fourvière", "Montchat", "Le mont Cindre"], "Surnom hérité des canuts, les ouvriers de la soie. Fourvière, elle, est « la colline qui prie »."]
];

window.BANK_EUROPE = [
  ["Plaques à fond jaune à l'avant comme à l'arrière : quel pays ?", "Pays-Bas", ["Belgique", "Allemagne", "Italie"], "Le Luxembourg utilise aussi des plaques jaunes. Au Royaume-Uni, seule la plaque arrière est jaune."],
  ["Plaques blanches avec des caractères rouges : quel pays ?", "Belgique", ["Suisse", "Espagne", "Pays-Bas"], "Les plaques belges sont blanches à lettres rouge bordeaux, avec la bande européenne à gauche."],
  ["Plaque blanche avant, plaque jaune arrière : quel pays ?", "Royaume-Uni", ["Irlande", "Pays-Bas", "Danemark"], "C'est aussi le seul grand pays d'Europe de l'Ouest où l'on roule à gauche, avec l'Irlande, Malte et Chypre."],
  ["Plaques sans bande bleue européenne, avec le code du canton et son blason : quel pays ?", "Suisse", ["Autriche", "Allemagne", "Italie"], "La Suisse ne fait pas partie de l'Union européenne : pas de bande bleue."],
  ["Plaque au format « AA 123 AA » avec une bande bleue de chaque côté : quel pays ?", "Italie", ["France", "Espagne", "Portugal"], "Le format italien ressemble au français. La bande de droite peut porter l'année et le code de la province."],
  ["Plaque au format « 1234 BCD », bande européenne uniquement à gauche : quel pays ?", "Espagne", ["Portugal", "Italie", "France"], "Le format espagnol commence par quatre chiffres, sans indication de région."],
  ["Plaque avec un code de ville en lettres et des vignettes rondes : quel pays ?", "Allemagne", ["Autriche", "Suisse", "Pays-Bas"], "Les vignettes rondes sont le contrôle technique et le cachet du Land. Le code au début indique la ville d'immatriculation (B = Berlin, M = Munich)."],
  ["En Italie, de quelle couleur sont les panneaux de direction d'autoroute ?", "Vert", ["Bleu", "Blanc", "Jaune"], "C'est l'inverse de la France : en Italie, vert = autoroute, bleu = autres routes principales."],
  ["En Suisse, de quelle couleur sont les panneaux de direction d'autoroute ?", "Vert", ["Bleu", "Jaune", "Blanc"], "Comme en Italie : vert pour l'autoroute, bleu pour les routes principales."],
  ["En Allemagne, de quelle couleur sont les panneaux d'entrée d'agglomération ?", "Jaune", ["Blanc à bordure rouge", "Bleu", "Vert"], "Panneau jaune avec le nom en noir : un indice très fréquent dans GeoGuessr."],
  ["En Allemagne, de quelle couleur sont les panneaux de direction d'autoroute ?", "Bleu", ["Vert", "Jaune", "Blanc"], "Bleu pour l'Autobahn, jaune pour les routes fédérales et la plupart des autres routes."],
  ["Pistes cyclables très souvent revêtues d'asphalte rouge : quel pays ?", "Pays-Bas", ["Espagne", "Italie", "Suisse"], "Le réseau cyclable néerlandais est le plus dense d'Europe, souvent en enrobé rouge."],
  ["Panneaux bilingues français–néerlandais : quel pays ?", "Belgique", ["Suisse", "Luxembourg", "Pays-Bas"], "À Bruxelles, les panneaux sont bilingues. En Flandre, ils sont en néerlandais seul ; en Wallonie, en français."],
  ["Dans quel pays parle-t-on officiellement allemand, français, italien et romanche ?", "Suisse", ["Belgique", "Luxembourg", "Autriche"], "La langue des panneaux suisses indique la région : allemand au nord et au centre, français à l'ouest, italien au Tessin."],
  ["Dans lequel de ces pays roule-t-on à gauche ?", "Malte", ["Portugal", "Grèce", "Croatie"], "En Europe, on roule à gauche au Royaume-Uni, en Irlande, à Malte et à Chypre."]
];

window.BANK_OSINT = [
  ["Quel outil sert surtout à trouver la première apparition d'une image en ligne ?", "TinEye", ["SunCalc", "Overpass Turbo", "Cartoradio"], "TinEye classe les résultats par date : pratique pour remonter à la source."],
  ["Quel outil calcule la position du soleil pour un lieu, une date et une heure ?", "SunCalc", ["TinEye", "WhatsMyName", "Wayback Machine"], "Indispensable pour la chronolocalisation à partir des ombres."],
  ["Où consulter les antennes relais en France ?", "Cartoradio", ["Overpass Turbo", "Géoportail", "Mapillary"], "Cartoradio est le site public de l'Agence nationale des fréquences (ANFR)."],
  ["Quel outil interroge OpenStreetMap par requêtes (ex. tous les arrêts de bus d'une zone) ?", "Overpass Turbo", ["Google Lens", "SunCalc", "TinEye"], "Idéal pour croiser plusieurs éléments visibles sur une photo."],
  ["Comment créer une preuve horodatée d'une page web ?", "L'archiver (Wayback Machine, archive.today)", ["Faire un marque-page", "La copier dans un e-mail", "La partager sur un réseau social"], "Une archive publique est vérifiable par un tiers, contrairement à une simple capture."],
  ["Quel outil vérifie sur quels sites un pseudo existe ?", "WhatsMyName", ["TinEye", "SunCalc", "Cartoradio"], "Un pseudo est souvent réutilisé d'une plateforme à l'autre."],
  ["Opérateur Google pour limiter la recherche à un site ?", "site:", ["inurl:", "from:", "domain="], "Exemple : \"jean dupont\" site:linkedin.com"],
  ["Comment chercher une expression exacte sur Google ?", "La mettre entre guillemets", ["Ajouter un +", "La mettre entre parenthèses", "Ajouter exact:"], "Sans guillemets, Google peut séparer ou remplacer les mots."],
  ["Opérateur Google pour chercher un type de fichier précis (PDF…) ?", "filetype:", ["ext=", "type:", "format:"], "Exemple : filetype:pdf rapport annuel"],
  ["Quel délai attendre avant de signaler une disparition ?", "Aucun : appeler le 17 immédiatement", ["24 heures", "48 heures", "72 heures"], "Le délai de 24 ou 48 heures est une idée reçue."],
  ["Tu trouves une information utile sur une disparition réelle. Que fais-tu ?", "La transmettre aux enquêteurs ou à l'association", ["La publier sur les réseaux", "Contacter la personne recherchée", "Aller vérifier sur place"], "Ne jamais diffuser d'hypothèse ni mener d'enquête parallèle."],
  ["Les photos publiées sur les réseaux sociaux contiennent-elles leurs données GPS ?", "Généralement non : elles sont supprimées à l'envoi", ["Toujours", "Seulement sur Instagram", "Seulement en haute définition"], "D'où l'importance de l'observation du décor."],
  ["Quel moteur est souvent le plus efficace pour reconnaître un lieu à partir d'une image ?", "Yandex", ["Bing", "DuckDuckGo", "Qwant"], "Google Lens est aussi très bon : croise toujours plusieurs moteurs."],
  ["Bonne pratique OPSEC pour tes recherches ?", "Navigateur dédié et comptes neutres", ["Utiliser ton compte personnel", "Désactiver ton antivirus", "Partager tes résultats en public"], "Sépare toujours tes recherches de ta vie numérique personnelle."],
  ["Dans quel ordre documenter une démarche ?", "Indice → Hypothèse → Preuve → Coordonnées", ["Hypothèse → Indice → Coordonnées → Preuve", "Preuve → Indice → Hypothèse → Coordonnées", "Coordonnées → Preuve → Indice → Hypothèse"], "On part de ce qui est observé, jamais de ce qu'on suppose."],
  ["Que signifie OSINT ?", "Renseignement en sources ouvertes", ["Opération de surveillance internet", "Outil de sécurité informatique", "Organisme de signalement"], "Open Source INTelligence : uniquement des informations publiquement accessibles."],
  ["Quelle loi protège les lanceurs d'alerte en France ?", "La loi Sapin 2, renforcée en 2022", ["La loi Informatique et libertés", "La loi Evin", "La loi Hadopi"], "Elle protège les signalements faits de bonne foi."],
  ["À qui Frances Haugen a-t-elle transmis les documents internes de Facebook en 2021 ?", "Au gendarme boursier américain (SEC) et au Wall Street Journal", ["À Wikileaks", "À la CNIL", "À un forum anonyme"], "Elle était cheffe de produit dans l'équipe « Intégrité civique »."],
  ["Deux indices faibles qui concordent valent…", "souvent mieux qu'un indice fort isolé", ["toujours moins qu'un indice fort", "rien sans preuve GPS", "une certitude absolue"], "Recouper reste la règle : note un niveau de confiance pour chaque hypothèse."]
];

/* ---------- Villes pour l'exercice « Ombres & heure » : [nom, latitude, longitude] ---------- */
window.SHADOW_CITIES = [
  ["Lyon", 45.764, 4.8357], ["Paris", 48.8566, 2.3522], ["Marseille", 43.2965, 5.3698], ["Lille", 50.6292, 3.0573],
  ["Brest", 48.3904, -4.4861], ["Strasbourg", 48.5734, 7.7521], ["Bordeaux", 44.8378, -0.5792], ["Grenoble", 45.1885, 5.7245]
];

/* ---------- Programme d'entraînement guidé ----------
   Chaque étape contient :
     t      : titre de l'étape            xp   : points gagnés
     time   : durée indicative             why  : à quoi ça sert
     how    : étapes à suivre (liste)      done : comment savoir que c'est terminé
     tip    : astuce (facultatif)
   auto: true → validée automatiquement par l'application
   quiz / url / go / gg / memo → bouton d'action affiché sous le guide */
window.PROGRAM = [
  { name: "Fondations", desc: "Préparer ton poste de travail et apprendre les 3 réflexes de base : chercher, archiver, comparer.",
    goal: "À la fin de ce niveau, tu as un navigateur dédié, tu sais archiver une preuve et lancer une recherche précise.", items: [
    { id: "opsec1", t: "Créer un profil de navigateur dédié à tes recherches", xp: 20, time: "10 min",
      why: "Tes recherches ne doivent jamais être mélangées à ta vie numérique : historique, comptes connectés, suggestions personnalisées. Un profil séparé évite aussi de « voir » des résultats influencés par ton propre profil.",
      how: ["Dans Edge : menu « … » › Paramètres › Profils › « Ajouter un profil ».",
        "Nomme-le « OSINT » et choisis une couleur bien différente de ton profil habituel.",
        "Dans ce profil : n'importe aucun favori ni mot de passe, désactive la synchronisation.",
        "Ajoute en favoris uniquement les outils de terrain (ce site, Wayback Machine, Géoportail…)."],
      done: "Tu ouvres ce profil à chaque séance, et il n'est connecté à aucun de tes comptes personnels.",
      tip: "Épingle ce profil dans la barre des tâches : un clic droit sur l'icône Edge montre directement tes profils." },
    { id: "opsec2", t: "Préparer des comptes neutres, sans lien avec ta vie personnelle", xp: 20, time: "20 min",
      why: "Certains sites (réseaux sociaux, GeoGuessr) demandent un compte pour consulter. Un compte neutre te permet de regarder sans exposer ton identité ni te faire suggérer comme « contact ».",
      how: ["Crée une adresse e-mail dédiée, sans ton nom ni ta date de naissance.",
        "Utilise-la uniquement dans ton profil de navigateur « OSINT ».",
        "Ne mets ni vraie photo, ni vraie ville, ni lien vers tes comptes personnels.",
        "Ne t'en sers que pour consulter : jamais pour contacter, commenter ou suivre quelqu'un."],
      done: "Tu as un e-mail neutre et, au besoin, un compte de consultation sur les plateformes utiles.",
      tip: "Un compte neutre sert à observer, pas à tromper : créer un faux profil pour approcher une personne est interdit (voir la charte)." },
    { id: "rev1", t: "Passer la même image dans Lens, Yandex et TinEye, puis comparer", xp: 30, time: "15 min", url: "https://tineye.com/",
      why: "Chaque moteur de recherche inversée a ses forces : Lens reconnaît les objets et les lieux, Yandex est souvent meilleur sur les bâtiments et paysages, TinEye retrouve la première apparition d'une image. Comparer t'apprend lequel utiliser selon la situation.",
      how: ["Prends une photo publique d'un monument ou d'une rue (par exemple une photo de Lyon sur Wikimedia Commons).",
        "Module Photo : glisse l'image, puis « Copier l'image ».",
        "Colle-la dans Google Lens, puis dans Yandex Images, puis dans TinEye.",
        "Note pour chacun : a-t-il trouvé le lieu ? la source d'origine ? des photos similaires ?"],
      done: "Tu sais dire, avec tes propres mots, dans quel cas tu utiliseras d'abord chacun des trois.",
      tip: "Recadre l'image sur un détail (une enseigne, un clocher) : les résultats changent souvent du tout au tout." },
    { id: "arch1", t: "Archiver une page avec la Wayback Machine et garder l'URL d'archive", xp: 20, time: "5 min", url: "https://web.archive.org/",
      why: "Une publication peut être modifiée ou supprimée à tout moment. Une archive publique et horodatée est une preuve vérifiable par n'importe qui, contrairement à une simple capture d'écran.",
      how: ["Va sur web.archive.org.",
        "Dans la case « Save Page Now », colle l'adresse d'une page publique (un article de presse par exemple).",
        "Lance l'archivage et attends la fin (parfois une minute).",
        "Copie l'adresse obtenue (elle commence par web.archive.org/web/ suivi d'une date) et colle-la dans une fiche d'enquête, champ « Preuve »."],
      done: "Tu as une fiche avec une preuve sous forme d'URL d'archive datée.",
      tip: "Module Recherche : colle une URL de page, le bouton « Archiver maintenant » fait la même chose en un clic." },
    { id: "dork1", t: "Écrire trois requêtes avancées : guillemets, site:, filetype:", xp: 30, time: "15 min", go: "search",
      why: "Les opérateurs de recherche transforment des milliers de résultats inutiles en quelques résultats pertinents. C'est la base de toute recherche en sources ouvertes.",
      how: ["Guillemets : cherche \"basilique de Fourvière\" avec puis sans guillemets, et compare.",
        "site: : cherche la même expression avec site:fr.wikipedia.org pour ne garder qu'un site.",
        "filetype: : cherche plan de prévention filetype:pdf site:gouv.fr pour ne trouver que des PDF officiels.",
        "Module Recherche : coche des réseaux dans « Cibler » et regarde la requête générée s'écrire toute seule."],
      done: "Tu sais écrire sans aide une requête qui combine guillemets, site: et filetype:.",
      tip: "Le signe moins exclut un mot : \"lyon\" -football retire les résultats sur le club." }] },

  { name: "Lire la France", desc: "Reconnaître une région au premier coup d'œil : plaques, panneaux, bornes, architecture.",
    goal: "À la fin de ce niveau, tu identifies le type de route et la grande région d'une image de France en quelques secondes.", items: [
    { id: "gg1", t: "Jouer 5 parties GeoGuessr en mode Move", xp: 30, time: "5 × 10 min", auto: true, gg: true,
      why: "Le mode Move (déplacement libre) est le plus simple : tu peux avancer jusqu'à un panneau. C'est idéal pour apprendre à chercher les bons indices avant de passer aux modes plus durs.",
      how: ["Onglet GeoGuessr › « Mes cartes » › ouvre la carte France.",
        "Avant de bouger : fais un tour à 360° et regarde le marquage, les bornes, la végétation.",
        "Avance ensuite jusqu'au premier panneau ou carrefour.",
        "Après la partie, reviens ici : « Nouvelle session », choisis le mode Move, entre le score et note ce qui t'a aidé ou trompé."],
      done: "Automatique dès que 5 sessions en mode Move sont enregistrées.",
      tip: "Le champ « Ce qui m'a aidé / trompé » est le plus important : c'est là que tu progresses." },
    { id: "fr1", t: "Obtenir au moins 8/10 au quiz « Indices France & Lyon »", xp: 40, time: "5 min par essai", auto: true, quiz: "france",
      why: "Ce quiz couvre les indices les plus rentables en France : couleur des routes, plaques, bornes, panneaux, architecture régionale et repères lyonnais.",
      how: ["Lance le quiz avec le bouton ci-dessous (ou l'onglet Exercices).",
        "Réponds avec les touches 1 à 4, puis Entrée pour continuer.",
        "Lis chaque explication, même quand tu as juste.",
        "À la fin, relis la liste de tes erreurs et rejoue : les questions changent à chaque partie."],
      done: "Automatique dès que ton record atteint 8/10.",
      tip: "Ajoute au Mémo chaque indice que tu ne connaissais pas : il servira aussi pour l'étape « 10 indices personnels »." },
    { id: "dep1", t: "Obtenir au moins 8/10 au quiz « Départements »", xp: 40, time: "5 min par essai", auto: true, quiz: "dep",
      why: "Le numéro de département apparaît sur les plaques, les panneaux de chantier, les camions, les enseignes. Le connaître réduit instantanément la zone de recherche.",
      how: ["Commence par l'option « Auvergne-Rhône-Alpes » (12 départements) pour prendre confiance.",
        "Passe ensuite à « France entière ».",
        "Le quiz mélange 4 types de questions : numéro → nom, nom → numéro, préfecture, et l'inverse.",
        "Fais-le une fois par jour plutôt que dix fois d'affilée : c'est la répétition espacée qui fait retenir."],
      done: "Automatique dès que ton record atteint 8/10 (n'importe quelle option).",
      tip: "Attention : sur une plaque récente, le numéro est choisi par le propriétaire. Il indique une attache, pas une preuve de localisation." },
    { id: "fr2", t: "Ajouter 10 indices personnels dans le Mémo", xp: 30, time: "au fil des parties", auto: true, memo: true,
      why: "Les indices que tu découvres toi-même se retiennent beaucoup mieux que ceux qu'on te donne. Le Mémo devient ton propre guide de terrain.",
      how: ["Onglet Mémo indices › « Nouvel indice ».",
        "Choisis la catégorie (Plaques, Panneaux, Végétation…) et la zone (une région, un département, une ville).",
        "Décris l'indice de façon vérifiable : « poteaux électriques en béton à trous en Bretagne » plutôt que « ça ressemblait à la Bretagne ».",
        "Ajoute une source si possible (lien vers l'image ou l'article)."],
      done: "Automatique dès que 10 indices personnels sont enregistrés (les indices de base ne comptent pas).",
      tip: "Utilise « Tirer une carte » pour réviser : l'indice s'affiche, tu dois deviner la zone." }] },

  { name: "Outils cartographiques", desc: "Passer de « je pense que c'est ici » à « je l'ai vérifié ».",
    goal: "À la fin de ce niveau, tu sais confirmer un lieu avec au moins deux outils différents.", items: [
    { id: "map1", t: "Retrouver le lieu d'une photo d'exercice avec Street View", xp: 30, time: "20 min", go: "map",
      why: "Street View sert à confirmer une hypothèse : si le décor correspond exactement (bâtiments, poteaux, trottoirs), le lieu est vérifié.",
      how: ["Prends un défi de géolocalisation public (Gralhix, ou une photo de rue de Lyon sur Wikimedia Commons).",
        "Note 3 indices dans la Grille d'observation du module Photo.",
        "Module Carte : place un point sur ton hypothèse, puis « Street View ».",
        "Compare au moins 3 éléments fixes (façade, mobilier urbain, relief). Si tout colle, crée une fiche avec les coordonnées."],
      done: "Tu as une fiche d'enquête avec coordonnées et au moins 3 éléments de correspondance notés.",
      tip: "Compare des éléments qui ne bougent pas : bâtiments, poteaux, bordures. Les voitures et les commerces changent." },
    { id: "map2", t: "Comparer un relief avec Google Earth en 3D", xp: 30, time: "15 min", url: "https://earth.google.com/web/",
      why: "La forme des montagnes à l'horizon est une signature presque unique. En 3D, tu peux te placer au point de vue supposé et vérifier que la ligne de crête correspond.",
      how: ["Choisis une photo de paysage avec des montagnes (Alpes, Massif central).",
        "Dans Google Earth, va à l'endroit supposé et incline la vue (touche Maj + glisser).",
        "Place-toi à hauteur d'homme, orienté dans la même direction que la photo.",
        "Compare la ligne d'horizon : sommets, cols, creux. Ajuste la position jusqu'à ce qu'elle se superpose."],
      done: "Tu as retrouvé un point de vue où la ligne de crête correspond à la photo.",
      tip: "Module Carte : place un point puis « Google Earth », la vue s'ouvre directement au bon endroit." },
    { id: "map3", t: "Explorer le Géoportail IGN : sentiers, forêts, photos aériennes", xp: 30, time: "15 min", url: "https://www.geoportail.gouv.fr/",
      why: "Le Géoportail montre ce que Google ne montre pas : chemins forestiers, sentiers de randonnée, lieux-dits, et d'anciennes photos aériennes pour voir comment un lieu a changé.",
      how: ["Ouvre le Géoportail et cherche une commune que tu connais.",
        "Ajoute la couche « Cartes IGN » : repère les sentiers et les lieux-dits.",
        "Ajoute « Photographies aériennes » et compare avec la carte.",
        "Teste l'outil de comparaison de dates (photos anciennes) si disponible sur la zone."],
      done: "Tu sais afficher les cartes IGN et les photos aériennes, et retrouver un sentier ou un lieu-dit.",
      tip: "Le module Carte de ce site affiche déjà le Plan IGN et la Photo aérienne IGN (bouton des calques en haut à gauche)." },
    { id: "map4", t: "Estimer l'heure d'une prise de vue avec SunCalc", xp: 40, time: "20 min", url: "https://www.suncalc.org/",
      why: "La direction et la longueur des ombres dépendent de l'heure et de la date. C'est la base de la chronolocalisation : dater une photo à partir de la lumière.",
      how: ["Prends une photo extérieure ensoleillée dont tu connais le lieu.",
        "Repère une ombre nette (poteau, mur) et estime sa direction par rapport aux rues.",
        "Module Carte : place un point sur le lieu, règle la date et fais varier l'heure.",
        "Quand la ligne d'ombre tracée correspond à celle de la photo, tu as ton heure estimée."],
      done: "Tu as estimé l'heure d'une photo à environ une heure près, avec ton raisonnement noté dans une fiche.",
      tip: "Entraîne-toi d'abord avec l'exercice « Ombres & heure » de l'onglet Exercices." },
        { id: "map5", t: "Lancer une requête Overpass Turbo (ex. arrêts de bus d'un quartier)", xp: 40, time: "25 min", url: "https://overpass-turbo.eu/",
      why: "Overpass interroge OpenStreetMap comme une base de données. Exemple : « tous les endroits où une église est à moins de 100 m d'un pont ». Quand une photo montre plusieurs éléments, ça peut réduire la zone de toute une ville à quelques rues.",
      how: ["Module Carte : place un point dans un quartier de Lyon, puis « Overpass Turbo ».",
        "Une requête d'exemple est déjà écrite (arrêts de bus dans un rayon de 500 m). Clique « Exécuter ».",
        "Remplace highway=bus_stop par amenity=pharmacy puis par amenity=place_of_worship et relance.",
        "Observe les points obtenus sur la carte."],
      done: "Tu as lancé une requête, modifié le type d'objet et obtenu des résultats sur la carte.",
      tip: "La liste des étiquettes OpenStreetMap (amenity=…, shop=…) est sur le wiki OSM : cherche « Map features »." },
    { id: "map6", t: "Repérer les antennes relais d'une commune sur Cartoradio", xp: 20, time: "10 min", url: "https://www.cartoradio.fr/",
      why: "Une antenne visible sur une photo est un repère fixe et recensé publiquement. Cartoradio (site de l'Agence nationale des fréquences) indique leur emplacement exact.",
      how: ["Ouvre Cartoradio et cherche une commune.",
        "Clique sur un support d'antenne : regarde son type (pylône, toit, château d'eau) et sa hauteur.",
        "Compare avec Street View : retrouve visuellement ce support.",
        "Note dans le Mémo à quoi ressemblent les différents types de supports."],
      done: "Tu as identifié au moins un support sur Cartoradio et l'as retrouvé sur Street View.",
      tip: "Un château d'eau avec antennes est un excellent repère : il se voit de loin." }] },

  { name: "Précision", desc: "Travailler sans pouvoir bouger, comme face à une vraie photo, et dater une scène.",
    goal: "À la fin de ce niveau, tu tires un maximum d'informations d'une image fixe.", items: [
    { id: "nm1", t: "Jouer 5 parties en No Move", xp: 40, time: "5 × 10 min", auto: true, gg: true,
      why: "En No Move, tu ne peux pas te déplacer : tu n'as que l'image de départ, comme face à une photo publiée sur un réseau social. C'est l'entraînement le plus proche du réel.",
      how: ["Dans GeoGuessr, lance une partie sur la carte France et active l'option qui interdit le déplacement (No Move).",
        "Avant de cliquer, remplis mentalement : pays → région → département → type de lieu.",
        "Tu peux tourner et zoomer : examine le sol, les poteaux, l'horizon.",
        "Enregistre ici la session en choisissant le mode « No Move »."],
      done: "Automatique dès que 5 sessions en mode No Move sont enregistrées.",
      tip: "Le mode NMPZ (ni déplacement, ni rotation, ni zoom) est l'étape suivante : garde-le pour plus tard." },
    { id: "nm2", t: "Jouer 5 parties sur ta carte Lyon / AURA", xp: 40, time: "5 × 10 min", auto: true, gg: true,
      why: "Connaître finement ta région est le plus utile pour aider localement. À cette échelle, les indices changent : noms de rues, réseau TCL, relief des Monts du Lyonnais, Alpes à l'horizon.",
      how: ["Onglet GeoGuessr › « Mes cartes » › Lyon / AURA.",
        "Repère les indices locaux : arrêts TCL, plaques de rue lyonnaises, Fourvière ou les Alpes à l'horizon.",
        "Enregistre chaque partie en choisissant la carte « Lyon / AURA » (n'importe quel mode).",
        "Note dans le Mémo chaque indice local nouveau, avec la zone précise (ex. « Lyon 7e »)."],
      done: "Automatique dès que 5 sessions sont enregistrées sur la carte Lyon / AURA.",
      tip: "Le quiz « Départements », option Auvergne-Rhône-Alpes, se marie bien avec cette étape." },
    { id: "sh1", t: "Obtenir au moins 7/10 à l'exercice « Ombres & heure »", xp: 50, time: "10 min par essai", auto: true, quiz: "shadow",
      why: "Savoir lire une ombre permet d'estimer l'heure d'une photo et de vérifier un témoignage (« la photo a été prise le matin »).",
      how: ["Retiens la règle de base : l'ombre part toujours à l'opposé du soleil.",
        "Le matin, le soleil est à l'est : les ombres partent vers l'ouest. Le soir, c'est l'inverse.",
        "Autour du midi solaire (entre 12 h 30 et 14 h 30 en France), les ombres pointent vers le nord et sont les plus courtes.",
        "Ombre longue = soleil bas = début ou fin de journée, ou hiver."],
      done: "Automatique dès que ton record atteint 7/10.",
      tip: "Si tu bloques, ouvre le module Carte, place un point et fais varier l'heure : regarde la ligne d'ombre tourner." },
    { id: "pe1", t: "Obtenir au moins 12 000 points à un exercice photo", xp: 50, time: "15 min", auto: true, go: "training",
      why: "Les exercices photo utilisent de vraies images prises par des photographes, sans panneau garanti ni déplacement possible. C'est la situation la plus proche d'une photo publiée sur un réseau social.",
      how: ["Onglet Exercices › « Exercice photo », zone France pour commencer.",
        "Avant de cliquer, observe dans l'ordre : relief et végétation, architecture, mobilier urbain, textes visibles.",
        "Place ta réponse, puis lis le titre et la description de la photo sur Commons : ils expliquent souvent ce que tu n'as pas vu.",
        "Enregistre l'exercice dans tes sessions à la fin des 5 photos."],
      done: "Automatique dès qu'un exercice photo enregistré atteint 12 000 points.",
      tip: "Les photos de monuments sont plus faciles : commence par repérer clocher, château ou pont, puis cherche-le avec Google Lens." },
    { id: "nm3", t: "Dépasser 20 000 points sur une partie", xp: 50, time: "variable", auto: true, gg: true,
      why: "20 000 points sur 25 000, c'est en moyenne 4 000 par manche : la bonne région presque à chaque fois. C'est un bon repère de niveau solide.",
      how: ["Joue sur la carte où tu es le plus à l'aise.",
        "Applique la méthode : indices globaux (route, plaques) → région → indices fins (noms, relief).",
        "En cas de doute entre deux régions, clique entre les deux plutôt qu'au hasard dans l'une.",
        "Enregistre ta session : l'étape se valide dès qu'un score dépasse 20 000."],
      done: "Automatique dès qu'une session dépasse 20 000 points.",
      tip: "Regarde ta courbe et ta tendance dans « Statistiques » : la régularité compte plus qu'un coup de chance." }] },

  { name: "Méthode d'enquêteur", desc: "Assembler les indices dans une démarche documentée, de l'observation au rapport.",
    goal: "À la fin de ce niveau, tu sais mener un exercice complet et produire un rapport clair et vérifiable.", items: [
    { id: "gr1", t: "Résoudre 3 défis Gralhix", xp: 60, time: "3 × 30 min", url: "https://gralhix.com",
      why: "Les défis de Sofia Santos sont conçus pour enseigner une technique à chaque fois, avec une solution détaillée. C'est la meilleure transition entre le jeu et l'enquête réelle.",
      how: ["Ouvre gralhix.com et choisis un défi de géolocalisation.",
        "Crée un nouveau dossier ici (module Enquêtes) au nom du défi.",
        "Note chaque étape sous forme de fiche : indice → hypothèse → preuve → coordonnées.",
        "Compare ensuite avec la solution officielle : note dans le Mémo ce que tu as raté."],
      done: "Tu as 3 dossiers de défis Gralhix, chacun avec au moins une fiche aux coordonnées finales. Coche l'étape toi-même.",
      tip: "Ne regarde la solution qu'après au moins 30 minutes d'effort : c'est la recherche qui fait progresser." },
    { id: "bc1", t: "Lire 2 guides Bellingcat et appliquer une technique", xp: 40, time: "1 h", url: "https://www.bellingcat.com/category/resources/how-tos/",
      why: "Bellingcat est une référence de l'enquête en sources ouvertes. Leurs guides expliquent des techniques réelles, utilisées dans des enquêtes publiées.",
      how: ["Ouvre la page des guides (How-to) de Bellingcat.",
        "Choisis-en deux sur la géolocalisation, la chronolocalisation ou la vérification d'images.",
        "Résume chaque guide en 3 points dans le Mémo (catégorie « Autre »).",
        "Applique une des techniques sur un défi Gralhix ou une photo d'exercice."],
      done: "2 résumés dans le Mémo et une technique appliquée dans un dossier. Coche l'étape toi-même.",
      tip: "Les guides sont en anglais : la traduction intégrée d'Edge (clic droit › Traduire) fait très bien l'affaire." },
    { id: "rep1", t: "Monter un dossier de 5 fiches reliées par au moins 4 fils", xp: 60, time: "45 min", auto: true, go: "cases",
      why: "Relier les indices montre ton raisonnement : quelle observation mène à quelle hypothèse, et quelle preuve la confirme. Un tiers doit pouvoir suivre ta démarche.",
      how: ["Module Enquêtes : crée un dossier pour un exercice (défi Gralhix, photo d'exercice).",
        "Ajoute au moins 5 fiches : des indices, des hypothèses, des preuves (archives), des coordonnées.",
        "Mode Tableau : « Relier des fiches », puis clique deux fiches pour tirer un fil.",
        "Relie chaque hypothèse aux indices qui la soutiennent, et chaque preuve à l'hypothèse qu'elle confirme."],
      done: "Automatique dès qu'un dossier contient au moins 5 fiches et 4 fils.",
      tip: "Note un niveau de confiance honnête : une hypothèse à 2 étoiles est utile tant qu'elle est indiquée comme telle." },
    { id: "rep2", t: "Exporter le rapport d'un dossier (.md)", xp: 20, time: "5 min", auto: true, go: "cases",
      why: "Un rapport propre permet de transmettre ton travail : à un formateur, ou, dans un cas réel, aux enquêteurs ou à l'association, et à eux seuls.",
      how: ["Module Enquêtes : sélectionne ton dossier le plus complet.",
        "Clique « Rapport .md » : un fichier se télécharge.",
        "Ouvre-le (Bloc-notes, Visual Studio ou VS Code) et relis : chaque hypothèse doit avoir sa preuve.",
        "Supprime ensuite les dossiers d'exercice dont tu n'as plus besoin."],
      done: "Automatique dès que tu as exporté un rapport.",
      tip: "Rappel de la charte : un rapport sur une situation réelle ne se publie jamais, il se transmet aux personnes habilitées." }] }
];

/* ---------- Rangs : [XP minimum, nom, chiffre romain] ---------- */
window.RANKS = [[0, "Observateur", "I"], [120, "Repéreur", "II"], [320, "Analyste", "III"], [600, "Géolocalisateur", "IV"], [900, "Enquêteur", "V"]];

/* ---------- Mémo : indices de départ ---------- */
window.MEMO_CATS = ["Plaques", "Panneaux", "Marquage", "Bornes & poteaux", "Végétation", "Architecture", "Langue", "Autre"];
window.MEMO_BUILTIN = [
  { cat: "Plaques", zone: "France", text: "Fond blanc devant et derrière. Bande bleue à gauche (F + étoiles UE) et à droite (numéro de département + logo de région). Format AA-123-AA depuis 2009." },
  { cat: "Panneaux", zone: "France", text: "Cartouche jaune texte noir = route départementale (D). Rouge texte blanc = nationale (N) ou autoroute (A). Vert = route européenne (E)." },
  { cat: "Panneaux", zone: "France", text: "Directions : bleu = autoroute, vert = itinéraire principal, blanc = destination locale, marron = tourisme." },
  { cat: "Panneaux", zone: "France", text: "Entrée d'agglomération : fond blanc, bordure rouge, nom en noir. Sortie : même panneau barré de rouge." },
  { cat: "Bornes & poteaux", zone: "France", text: "Borne kilométrique : sommet rouge = nationale, sommet jaune = départementale." },
  { cat: "Marquage", zone: "France", text: "Lignes blanches. Un marquage jaune est temporaire (travaux)." },
  { cat: "Langue", zone: "Bretagne", text: "Panneaux souvent bilingues français–breton." },
  { cat: "Architecture", zone: "Alsace", text: "Maisons à colombages colorées, villages en -heim ou -willer." },
  { cat: "Architecture", zone: "Sud méditerranéen", text: "Toits de tuiles rouges à faible pente, pins, végétation sèche." },
  { cat: "Autre", zone: "France", text: "Pharmacie : enseigne en croix verte, souvent lumineuse." },
  { cat: "Autre", zone: "Lyon", text: "Réseau TCL, métro A, B, C, D. Basilique de Fourvière sur la colline ouest, confluence du Rhône et de la Saône." }
];

/* ---------- Défi GeoGuessr du jour : contraintes possibles ---------- */
window.GG_CONSTRAINTS = [
  "Pas de zoom : observe d'abord tout le décor",
  "90 secondes maximum par manche",
  "Avant de cliquer, note 3 indices dans le Mémo",
  "Vise d'abord la bonne région, puis le département",
  "Repère le sens des ombres à chaque manche",
  "Ne te fie qu'aux panneaux et au marquage",
  "Pas plus de 5 déplacements par manche",
  "Annonce ta zone à voix haute avant de cliquer"
];

/* ---------- Partie intégrée : lieux (centres-villes, généralement couverts par Street View) ----------
   [ville, latitude, longitude] — tu peux en ajouter. */
window.PLAY_AURA = [
  ["Lyon — Bellecour", 45.7578, 4.8320], ["Lyon — Croix-Rousse", 45.7745, 4.8316], ["Villeurbanne — Gratte-Ciel", 45.7676, 4.8800], ["Lyon — Part-Dieu", 45.7606, 4.8590],
  ["Saint-Étienne", 45.4400, 4.3871], ["Grenoble", 45.1907, 5.7267], ["Annecy", 45.8992, 6.1294], ["Chambéry", 45.5646, 5.9178], ["Valence", 44.9334, 4.8924],
  ["Clermont-Ferrand", 45.7772, 3.0819], ["Le Puy-en-Velay", 45.0434, 3.8858], ["Aurillac", 44.9264, 2.4400], ["Bourg-en-Bresse", 46.2052, 5.2255], ["Vichy", 46.1277, 3.4260],
  ["Montluçon", 46.3403, 2.6027], ["Moulins", 46.5660, 3.3330], ["Privas", 44.7353, 4.5990], ["Aubenas", 44.6200, 4.3903], ["Montélimar", 44.5581, 4.7508],
  ["Vienne", 45.5255, 4.8742], ["Villefranche-sur-Saône", 45.9890, 4.7190], ["Roanne", 46.0360, 4.0680], ["Thonon-les-Bains", 46.3705, 6.4794], ["Chamonix", 45.9237, 6.8694],
  ["Albertville", 45.6755, 6.3925], ["Annonay", 45.2397, 4.6707], ["Voiron", 45.3640, 5.5900], ["Bourgoin-Jallieu", 45.5863, 5.2740], ["Oyonnax", 46.2567, 5.6556],
  ["Issoire", 45.5440, 3.2490], ["Romans-sur-Isère", 45.0430, 5.0510], ["Givors", 45.5905, 4.7690], ["Tarare", 45.8960, 4.4330], ["Belley", 45.7590, 5.6880]
];
window.PLAY_FR = [
  ["Paris", 48.8606, 2.3376], ["Marseille", 43.2951, 5.3740], ["Bordeaux", 44.8412, -0.5800], ["Toulouse", 43.6045, 1.4440], ["Nantes", 47.2133, -1.5584],
  ["Rennes", 48.1113, -1.6800], ["Brest", 48.3904, -4.4861], ["Lille", 50.6365, 3.0635], ["Strasbourg", 48.5818, 7.7509], ["Nancy", 48.6936, 6.1830],
  ["Dijon", 47.3220, 5.0415], ["Besançon", 47.2378, 6.0241], ["Limoges", 45.8336, 1.2611], ["Poitiers", 46.5802, 0.3404], ["La Rochelle", 46.1591, -1.1520],
  ["Pau", 43.2951, -0.3708], ["Perpignan", 42.6986, 2.8956], ["Montpellier", 43.6085, 3.8800], ["Nice", 43.6966, 7.2711], ["Ajaccio", 41.9192, 8.7386],
  ["Rouen", 49.4404, 1.0939], ["Caen", 49.1829, -0.3707], ["Amiens", 49.8941, 2.2958], ["Reims", 49.2583, 4.0317], ["Metz", 49.1193, 6.1757],
  ["Orléans", 47.9029, 1.9093], ["Tours", 47.3941, 0.6848], ["Le Mans", 48.0061, 0.1996], ["Angers", 47.4784, -0.5632], ["Quimper", 47.9960, -4.1020],
  ["Bayonne", 43.4929, -1.4748], ["Carcassonne", 43.2130, 2.3491], ["Avignon", 43.9493, 4.8055], ["Colmar", 48.0794, 7.3585], ["Troyes", 48.2973, 4.0744],
  ["Chartres", 48.4469, 1.4890], ["Saint-Malo", 48.6493, -2.0257], ["Cherbourg", 49.6386, -1.6164], ["Arras", 50.2910, 2.7775], ["Calais", 50.9513, 1.8587],
  ["Toulon", 43.1242, 5.9280], ["Nîmes", 43.8367, 4.3601], ["Albi", 43.9289, 2.1464], ["Agen", 44.2033, 0.6163], ["Périgueux", 45.1847, 0.7214]
];
/* Pays frontaliers + Royaume-Uni : [ville (pays), latitude, longitude] */
window.PLAY_EU = [
    ["Bruxelles (Belgique)", 50.8467, 4.3525], ["Liège (Belgique)", 50.6326, 5.5797], ["Gand (Belgique)", 51.0543, 3.7174], ["Namur (Belgique)", 50.4674, 4.8718],
    ["Luxembourg", 49.6116, 6.1319],
    ["Genève (Suisse)", 46.2044, 6.1432], ["Lausanne (Suisse)", 46.5197, 6.6323], ["Bâle (Suisse)", 47.5596, 7.5886], ["Zurich (Suisse)", 47.3769, 8.5417],
    ["Fribourg-en-Brisgau (Allemagne)", 47.9990, 7.8421], ["Sarrebruck (Allemagne)", 49.2402, 6.9969], ["Karlsruhe (Allemagne)", 49.0069, 8.4037], ["Cologne (Allemagne)", 50.9375, 6.9603],
    ["Turin (Italie)", 45.0703, 7.6869], ["Aoste (Italie)", 45.7376, 7.3172], ["Gênes (Italie)", 44.4056, 8.9463], ["Milan (Italie)", 45.4642, 9.1900], ["Vintimille (Italie)", 43.7903, 7.6075],
    ["Barcelone (Espagne)", 41.3874, 2.1686], ["Saint-Sébastien (Espagne)", 43.3183, -1.9812], ["Pampelune (Espagne)", 42.8125, -1.6458], ["Gérone (Espagne)", 41.9794, 2.8214], ["Saragosse (Espagne)", 41.6488, -0.8891],
    ["Monaco", 43.7384, 7.4246], ["Andorre-la-Vieille (Andorre)", 42.5063, 1.5218],
    ["Londres (Royaume-Uni)", 51.5072, -0.1276], ["Douvres (Royaume-Uni)", 51.1279, 1.3134], ["Brighton (Royaume-Uni)", 50.8225, -0.1372], ["Portsmouth (Royaume-Uni)", 50.8198, -1.0880],
    ["Canterbury (Royaume-Uni)", 51.2802, 1.0789], ["Oxford (Royaume-Uni)", 51.7520, -1.2577], ["Southampton (Royaume-Uni)", 50.9097, -1.4044],
    ["Cardiff (Royaume-Uni)", 51.4816, -3.1791], ["Bristol (Royaume-Uni)", 51.4545, -2.5879], ["Saint-Hélier (Jersey)", 49.1858, -2.1100], ["Douglas (île de Man)", 54.1500, -4.4820]
];

/* Zones de jeu : nom, liste de lieux, distance qui fait chuter le score (km), vue de départ de la carte [lat, lng, zoom] */
window.PLAY_ZONES = {
    fr: { name: "France", pool: () => window.PLAY_FR, scale: 1250, view: [46.6, 2.4, 5] },
    aura: { name: "Lyon / AURA", pool: () => window.PLAY_AURA, scale: 400, view: [45.6, 4.9, 7] },
    eu: { name: "Pays frontaliers + Royaume-Uni", pool: () => window.PLAY_EU, scale: 1800, view: [47.5, 3.5, 4] }
};