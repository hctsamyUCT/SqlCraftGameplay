# 🎮 SQL Craft — Le Minecraft du BUT Science des Données

[![Three.js](https://img.shields.io/badge/Three.js-WebGL-black?logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-Build_Tool-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![BUT Science des Données](https://img.shields.io/badge/BUT-Science_des_Donn%C3%A9es-0284c7)](https://www.enseignementsup-recherche.gouv.fr/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Projet pédagogique — Module PPP (Projet Personnel et Professionnel)**  
> *Vulgarisation des bases de données et du langage SQL auprès des lycéens qui envisagent de rejoindre le BUT Science des Données.*

![SQL Craft Gameplay](./public/screenshots/gameplay.jpg)

---

## 💡 Le Concept : "Comprendre en agissant"

En **BUT Science des Données**, la manipulation des données est au cœur de tous les métiers (Data Analyst, Data Engineer, Machine Learning Specialist). 

**SQL Craft** a été conçu pour faire découvrir le SQL aux lycéens sans aucun prérequis :
- **Zéro cours abstrait au départ** : Le joueur explore un monde en 3D inspiré de Minecraft.
- **Feedback instantané** : Chaque bloc posé, peint ou détruit exécute en direct la vraie requête SQL équivalente dans une console interactive.
- **Prise en main en moins d'une minute** : Contrôles FPS intuitifs (ZQSD/WASD, souris, hotbar 1 à 7).

---

## 🗺️ Le Monde 3D Voxel (3 Zones Colossales & 7 056 Cases)

- **Monde immense étendu (36x196 cases = 7 056 cases)** : Un gigantesque continent d'expérimentation avec une hauteur de construction débloquée jusqu'à **40 blocs** pour ériger des méga-bâtiments, gratte-ciel et châteaux monumentaux.
- **Zone 1 (`id: 1`) — Zone Nord (Plaine Verdoyante)** : **2 304 cases** d'herbe émeraude, chênes voxel, pâquerettes et totem de données vert.
- **Rivière 1** : Frontière naturelle avec 3 ponts en bois reliant les Zones 1 et 2.
- **Zone 2 (`id: 2`) — Zone Sud (Rivage Cristallin)** : **2 304 cases** de sable et cristaux azur, arbres de quartz et totem de données bleu.
- **Grand Canal Royal 2** : Majestueux cours d'eau avec 3 ponts royaux dorés reliant les Zones 2 et 3.
- **Zone 3 (`id: 3`) — Zone Mégalopole (Plateau des Bâtisseurs)** : **2 304 cases** recouvertes de dalles de marbre et pierre architecturale avec dorures, obélisques monumentaux et totem de données doré.
- **Ergonomie & Raccourcis Clavier fluides** :
  - **`Tab`** : Libérer / capturer la souris pour cliquer librement sur l'interface (réduire les fenêtres, cliquer sur les boutons BDD/Aide/Couleurs).
  - **`Entrée`** ou **`/`** : Ouvrir et taper directement une commande SQL dans la console interactive, puis valider avec Entrée.
  - **`M`** : Réduire ou agrandir instantanément le volet des Missions BUT SD.
  - **`J`** ou boutons d'en-tête : Téléportation rapide instantanée entre les Zones 1, 2 et 3.
  - **`C`** : Changer de couleur de bloc / peinture.
  - **`T`** : Ouvrir l'explorateur relationnel de tables.

---

## 🛠️ Hotbar & Mapping SQL (Cœur Pédagogique)

Chaque action dans l'univers de jeu met immédiatement à jour une base de données relationnelle en mémoire (`blocs`) et affiche la requête correspondante :

| Touche | Outil en jeu | Action en jeu | Requête SQL exécutée en direct | Concept Pédagogique (CRUD) |
| :---: | :---: | :---: | :--- | :--- |
| **1** | 🏠 **Maison** | Clic pour poser | `INSERT INTO blocs (type, couleur, x, y, z, zone_id) VALUES ('maison', 'rouge', ...);` | **Create (INSERT)** : Ajout d'une ligne avec clé primaire (`id`). |
| **2** | 🗼 **Tour** | Clic pour poser | `INSERT INTO blocs (...) VALUES ('tour', ...);` | **Create (INSERT)** : Empilement en hauteur (`y`). |
| **3** | 🌾 **Ferme** | Clic pour poser | `INSERT INTO blocs (...) VALUES ('ferme', ...);` | **Create (INSERT)**. |
| **4** | 🌉 **Pont** | Clic pour poser | `INSERT INTO blocs (...) VALUES ('pont', ...);` | **Create (INSERT)** : Construction au-dessus de la rivière. |
| **5** | 🎨 **Pinceau** | Viser un bloc + clic | `UPDATE blocs SET couleur = 'bleu' WHERE id = 3;` | **Update (UPDATE)** : Modification ciblée par clé primaire. |
| **6** | 🪓 **Hache** | Viser un bloc + clic | `DELETE FROM blocs WHERE id = 2;` | **Delete (DELETE)** : Suppression de ligne avec explosion de débris. |
| **7** | 🔍 **Loupe** | Clic sur des blocs | `SELECT * FROM blocs WHERE id IN (1, 4);` | **Read (SELECT)** : Sélection avec halos lumineux et tags 3D. |
| **🔍 > 📋** | **Afficher** | Clic sur la toolbar | `SELECT * FROM blocs WHERE id IN (...);` | **Read (SELECT)** : Consultation des données brutes. |
| **🔍 > 🔍** | **Filtrer** | Menu déroulant | `SELECT * FROM blocs WHERE type = 'maison';` | Clause **WHERE** (filtre par type ou par couleur). |
| **🔍 > ↕️** | **Trier** | Menu déroulant | `SELECT * FROM blocs ORDER BY x ASC;` | Clause **ORDER BY** (badges numérotés 3D en jeu). |
| **🔍 > 🔢** | **Compter** | Bouton | `SELECT COUNT(*) FROM blocs;` | Fonction d'agrégation **COUNT()**. |
| **🔍 > 🔗** | **Relier** | Bouton | `SELECT blocs.id, zones.nom FROM blocs JOIN zones ON zones.id = blocs.zone_id;` | **Jointure relationnelle (JOIN)** : Faisceaux laser 3D reliant les blocs aux totems de zone et entre Nord et Sud ! |

---

## 🗄️ Explorateur de Base de Données (Touche T)

En appuyant sur **`T`** ou via le bouton **📊 Base de Données** dans l'en-tête, les élèves accèdent à un inspecteur visuel :

![Explorateur de Base de Données](./public/screenshots/dataviewer.jpg)

1. **Table `blocs`** : Visualisation des lignes avec badges explicites :
   - <span style="background:#16a34a;color:white;padding:2px 6px;border-radius:4px;font-size:12px;">PK</span> **`id`** : Clé primaire, identifiant unique de chaque ligne.
   - <span style="background:#0284c7;color:white;padding:2px 6px;border-radius:4px;font-size:12px;">FK</span> **`zone_id`** : Clé étrangère pointant vers la table `zones`.
   - *Cliquer sur une ligne de la table surligne instantanément le bloc correspondant dans le monde 3D !*
2. **Table `zones`** : Table de référence décrivant les deux régions du monde (Plaine Verdoyante / Rivage Cristallin).
3. **Vue Relationnelle (`JOIN`)** : Présentation du résultat fusionné sans duplication inutile de données.

---

## 🎯 Système de Missions & Diplôme BUT SD

Un panneau de quêtes guide le joueur à travers 5 missions progressives :
- [x] **Mission 1 : Le Bâtisseur (INSERT)** — Pose 3 blocs sur le terrain.
- [x] **Mission 2 : L'Artiste (UPDATE)** — Repeins un bloc avec le Pinceau (touche 5).
- [x] **Mission 3 : Le Démolisseur (DELETE)** — Détruis un bloc avec la Hache (touche 6).
- [x] **Mission 4 : L'Analyste (SELECT & COUNT)** — Sélectionne des blocs avec la Loupe (touche 7) et compte-les.
- [x] **Mission 5 : L'Architecte Données (JOIN)** — Pose au moins un bloc au Nord et un au Sud, puis clique sur **Relier** !

🎉 **Récompense finale** : Pluie de confettis, fanfare de victoire et affichage d'un diplôme d'initiation présentant les débouchés passionnants du **BUT Science des Données** (Big Data, Intelligence Artificielle, Python, Dataviz).

---

## 🕹️ Commandes du Joueur

| Touche / Action | Effet |
| :--- | :--- |
| **Z / Q / S / D** ou **W / A / S / D** | Déplacement du personnage |
| **Espace** | Sauter (sur le sol ou sur les blocs posés) |
| **Majuscule (Shift)** | Courir / Sprint |
| **Souris** | Orienter le regard (Pointer Lock) |
| **Clic Gauche** | Interagir avec le bloc visé par la croix |
| **1 à 7** / **Molette** | Changer d'outil dans la hotbar |
| **Touche C** | Changer la couleur active (Rouge, Bleu, Vert, Jaune) |
| **Touche T** | Ouvrir / fermer l'explorateur de base de données |
| **Échap** | Libérer le curseur de la souris |

---

## 💻 Stack Technique

- **Moteur 3D :** [Three.js](https://threejs.org/) (WebGL, ombres douces, brouillard d'horizon, animations procédurales).
- **Textures :** Générées dynamiquement par Canvas HTML5 (pixel-art rétro, zéro asset externe lourd, chargement instantané).
- **Moteur Audio :** [Web Audio API](https://developer.mozilla.org/fr/docs/Web/API/Web_Audio_API) (synthétiseur temps-réel sans fichier MP3 à charger).
- **Base de Données Client :** Moteur relationnel in-memory avec émission d'événements SQL.
- **Interface & HUD :** HTML5 / CSS3 Vanilla avec Glassmorphism et polices Outfit / Fira Code.
- **Build & Dev Server :** [Vite](https://vitejs.dev/).

---

## 🚀 Installation & Démarrage Local

### 📋 Prérequis (à installer une seule fois sur le PC)

Avant de lancer le jeu pour la première fois, il faut installer les outils suivants :

| Logiciel | Rôle | Version minimale | Téléchargement |
| :--- | :--- | :---: | :--- |
| **Node.js** | Exécute le projet et le serveur de développement (`npm run dev`) | **v20.19** ou **v22.12+** (LTS conseillé) | [nodejs.org](https://nodejs.org/) |
| **npm** | Gestionnaire de paquets (installé **automatiquement avec Node.js**) | Fourni avec Node.js | — |
| **Git** | Récupère le code source du projet (`git clone`) | Toute version récente | [git-scm.com](https://git-scm.com/) |
| **Navigateur Web** | Affiche le jeu (WebGL requis) | Chrome, Edge ou Firefox à jour | — |

> 💡 **Aucun autre logiciel n'est nécessaire** : les bibliothèques (Three.js, Vite…) s'installent automatiquement via `npm install`.

**Vérifier que Node.js est bien installé** (ouvrir un terminal et taper) :
```bash
node --version   # doit afficher v20.19.x ou supérieur
npm --version    # doit afficher une version (ex: 10.x)
```

### ⚙️ Étapes de lancement

```bash
# 1. Cloner le dépôt
git clone https://github.com/samyhouchat/SqlCraftGameplay.git
cd SqlCraftGameplay

# 2. Installer les dépendances (à faire une seule fois)
npm install

# 3. Lancer le serveur de développement
npm run dev
```

L'application s'ouvre automatiquement sur `http://localhost:5173/` !

Pour générer la version de production optimisée :
```bash
npm run build
```

> ❓ **Pas de Git ?** Il est aussi possible de télécharger le projet au format ZIP depuis GitHub (*Bouton vert « Code » → Download ZIP*), puis de décompresser le dossier avant de lancer `npm install`.

---

## 🎓 À Propos du BUT Science des Données
Le **Bachelor Universitaire de Technologie en Science des Données** (anciennement STID) forme des spécialistes capables de :
- Collecter, nettoyer et structurer les données massives (**Big Data & SQL/NoSQL**).
- Programmer des algorithmes d'analyse et d'**Intelligence Artificielle** (**Python, R**).
- Créer des visualisations interactives pour éclairer les prises de décision (**Dataviz & BI**).
