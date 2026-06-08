# 📝 Rapport d'Évaluation CI/CD — Séances 9 & 10
**Étudiant :** MESSAOUDI Ishak  
**Dépôt :** messaoudiishak/mon-premier-cicd  

---

## 📝 EX.1 — Questions de cours

### Partie A — Concepts fondamentaux

#### Q1: Différence entre un linter (ESLint) et un formatter (Prettier), conflits, et résolution
* [cite_start]**Linter (ESLint) :** Réalise une analyse statique du code pour en vérifier la qualité logique[cite: 43, 427]. [cite_start]Il cherche les bugs potentiels, les variables non déclarées ou inutilisées, et impose des règles de programmation strictes[cite: 30, 43, 427].
* [cite_start]**Formatter (Prettier) :** Se concentre uniquement sur l'apparence visuelle et le style (espacements, retours à la ligne, guillemets)[cite: 83, 428]. [cite_start]Il réaligne le code automatiquement de façon homogène[cite: 83].
* [cite_start]**Conflits & Résolution :** Ils peuvent entrer en conflit si ESLint tente d'imposer des règles de mise en page opposées à celles de Prettier[cite: 121]. [cite_start]On résout cela en installant `eslint-config-prettier`, qui désactive toutes les règles de style d'ESLint pour laisser Prettier gérer le formatage en toute exclusivité[cite: 121].

#### Q2: Les 3 composantes de SemVer appliquées à l'API calculatrice
* [cite_start]**MAJOR (X.0.0) :** Changement cassant et incompatible avec les versions précédentes[cite: 222, 223]. [cite_start]*Exemple :* Supprimer complètement la route de division ou renommer l'endpoint `/calculator/add` en `/api/addition`[cite: 225, 227]. [cite_start]Les utilisateurs doivent modifier leur propre code pour utiliser cette mise à jour[cite: 229].
* [cite_start]**MINOR (0.X.0) :** Ajout d'une nouvelle fonctionnalité rétrocompatible[cite: 231]. [cite_start]*Exemple :* Ajouter une nouvelle route `/calculator/power` pour calculer les puissances sans impacter les fonctionnalités existantes[cite: 233].
* [cite_start]**PATCH (0.0.X) :** Correction de bug rétrocompatible[cite: 239]. [cite_start]*Exemple :* Corriger un bug d'overflow sur la division ou intercepter correctement une erreur de division par zéro sans changer l'interface de l'API[cite: 241, 262].

#### Q3: Définition et utilité d'un Conventional Commit
[cite_start]Un Conventional Commit est un message de validation Git respectant une structure stricte préfixée par un type (`feat:`, `fix:`, `chore:`, etc.)[cite: 249, 251]. [cite_start]Ce format standardisé permet à des moteurs automatisés (comme `git-cliff`) de lire l'historique Git sans intervention humaine, afin de calculer automatiquement le prochain saut de version s'il détecte un ajout ou une correction, tout en générant un fichier de notes (`CHANGELOG.md`) parfaitement trié[cite: 250, 283, 362].

### Partie B — Vrai / Faux (Justifié)

1. [cite_start]**FAUX.** Un code peut s'exécuter parfaitement dans l'environnement de production tout en échouant au script `npm run lint` s'il contient des variables mortes, des mots-clés obsolètes comme `var` ou des syntaxes de comparaison non strictes (`==`)[cite: 47, 51, 56].
2. [cite_start]**FAUX.** Prettier n'analyse jamais la logique interne d'exécution ou les variables du code pour traquer les bugs applicatifs ; il ne s'occupe que du reformatage cosmétique des espaces et de l'alignement des blocs textuels[cite: 428, 429].
3. [cite_start]**FAUX.** Les modifications portant sur la documentation (`docs:`) n'altèrent aucunement le code source de l'application ou le binaire final[cite: 481, 482]. [cite_start]Selon SemVer, elles ne déclenchent aucun changement de version et n'apparaissent pas dans le CHANGELOG de l'utilisateur[cite: 471, 483].
4. [cite_start]**VRAI.** Associer le tag Git (ex: `v2.0.0`) et la création de l'image Docker (ex: `:v2.0.0`) au sein du même pipeline garantit une traçabilité totale[cite: 307, 308]. [cite_start]Cela certifie que le conteneur en production correspond au code exact figé dans l'historique Git à cet instant précis[cite: 324].
5. [cite_start]**FAUX.** La commande standard `git push` n'envoie que les commits de la branche de travail actuelle sur GitHub, elle ignore délibérément les tags[cite: 351]. [cite_start]Il faut exécuter explicitement `git push origin --tags` pour les pousser sur le dépôt distant[cite: 354].

---

## ⚙️ EX.2 — ESLint + Prettier dans le pipeline

### Q4: Choix lors de l'initialisation d'ESLint
[cite_start]Nous avons installé manuellement les packages d'ESLint et configuré un fichier d'architecture plate (`eslint.config.mjs`)[cite: 118]. [cite_start]Nous y avons injecté les configurations recommandées pour JavaScript, défini l'environnement cible en CommonJS en important les variables globales de Node et Jest pour éviter les faux-positifs d'environnement, puis ajouté la configuration Prettier tout à la fin pour neutraliser les conflits de style[cite: 121].

### Q5: Simulation de violations ESLint
[cite_start]En insérant volontairement un `var test = 5;` et un bloc `if (test == "5")`, l'exécution locale de la commande renvoie immédiatement des erreurs bloquantes dans le terminal[cite: 47, 51, 56]. [cite_start]ESLint isole précisément le fichier, la ligne exacte, et remonte les identifiants de règles enfreints (`no-var`, `no-unused-vars`, `eqeqeq`), provoquant l'arrêt immédiat du script avec un code de sortie en échec[cite: 47, 51, 56].

### Q6: Configuration de Prettier (.prettierrc)
* [cite_start]`"semi": true` : Impose la présence de points-virgules pour éviter toute ambiguïté d'interprétation[cite: 109].
* [cite_start]`"singleQuote": true` : Force l'usage des guillemets simples pour unifier les chaînes de caractères de l'équipe[cite: 110].
* [cite_start]`"tabWidth": 2` : Configure l'indentation à exactement 2 espaces pour garder un code compact et lisible[cite: 112].
* [cite_start]`"printWidth": 100` : Enroule automatiquement les lignes de code dépassant 100 caractères de large[cite: 111].

### Q7: Structure du job lint dans ci.yml
[cite_start]Le job récupère le dépôt (`checkout`), prépare l'environnement Node.js v20 avec son système de cache npm, installe proprement les dépendances de développement via `npm ci`, puis exécute séquentiellement l'analyse de structure logique avec ESLint, suivie de la vérification cosmétique de Prettier[cite: 164, 167, 168, 170, 172, 174]. [cite_start]Cet ordre permet de valider la propreté du code en moins de 15 secondes avant de lancer des tâches de builds plus lourdes[cite: 187].

### Q8: Comportement lors d'une violation poussée dans la CI
[cite_start]Lorsqu'un commit non conforme est poussé, le job `🔍 Quality & Style Check` passe instantanément au rouge au niveau du step en échec[cite: 128]. Comme les blocs suivants (`test` et `docker`) dépendent directement de sa réussite via l'instruction `needs:`, ils sont immédiatement annulés et passés au statut de skip, empêchant toute publication d'une image Docker défectueuse sur GHCR.

### Q9: Réponse face à l'argument de tolérer les warnings (--max-warnings=5)
[cite_start]Je refuse catégoriquement cette proposition[cite: 190]. [cite_start]Autoriser ne serait-ce que 5 avertissements ouvre la porte à l'accumulation continue de dette technique[cite: 190]. [cite_start]Les développeurs finiront par s'habituer aux alertes, le seuil de tolérance augmentera progressivement à 10 puis 20 pour éviter de bloquer la CI, et des bugs logiques ou des failles de sécurité masqués sous forme de simples warnings finiront par corrompre la production[cite: 190]. [cite_start]La règle doit rester : tolérance zéro[cite: 190].

---

## ⏱ EX.3 — SemVer & Conventional Commits

### Q10: Liste des 4 messages de commits conventionnels
* [cite_start]`chore: configure prettier structure options and json configurations` (Mise en place de l'outillage de style)[cite: 268].
* [cite_start]`refactor: externalize quality validation shortcuts inside npm scripts` (Réorganisation des scripts sans toucher aux fonctionnalités)[cite: 277].
* [cite_start]`fix: resolve node environment global visibility within lint runner` (Correction d'un bug d'environnement)[cite: 262].
* [cite_start]`feat: restructure quality pipeline stages to implement fail-fast architecture` (Ajout d'une nouvelle mécanique de pipeline)[cite: 259].

### Q11: Test de commit invalide avec CommitLint et Husky
[cite_start]Lorsqu'on tente de valider un message libre comme `"added some code changes"`, le hook local `commit-msg` géré par Husky intercepte la demande[cite: 497, 500]. [cite_start]CommitLint analyse la chaîne, détecte l'absence de type et de structure, renvoie des alertes claires et annule l'enregistrement du commit[cite: 497]. [cite_start]Pour le corriger, il faut utiliser la commande `git commit --amend` pour réécrire un message valide[cite: 501].

### Q12: Analyse de l'historique et calcul de la version
[cite_start]L'analyse de l'historique de notre dépôt avec `git log --oneline` montre des tâches de maintenance (`chore`), des restructurations de scripts (`refactor`), des correctifs de configuration (`fix`), et de nouvelles étapes de pipeline (`feat`)[cite: 343, 344]. [cite_start]Aucun commit ne contient de point d'exclamation (`!`) ou de mention `BREAKING CHANGE`[cite: 339]. [cite_start]En appliquant les règles SemVer, la présence de types `feat` impose un incrément **MINEUR**, ce qui nous amène à définir notre première version fonctionnelle stable à **`v1.1.0`**[cite: 340].

### Q13: Ajout d'un paramètre optionnel : MINOR ou MAJOR ?
[cite_start]C'est un changement **MINOR**[cite: 234]. [cite_start]Comme le nouveau paramètre ajouté à l'endpoint de l'API est entièrement *optionnel*, les anciens clients de l'application peuvent continuer à envoyer leurs requêtes exactement comme avant sans subir le moindre dysfonctionnement[cite: 231, 462]. [cite_start]La rétrocompatibilité est totale, il n'y a aucune rupture, le choix d'une version MAJOR serait donc une erreur méthodologique[cite: 462].

---

## 🚀 EX.4 — Release automatique sur GitHub

### Q14: Structure du fichier release.yml et permissions requis
[cite_start]Le workflow s'active uniquement lors d'un push de tag Git sous le format `v*.*.*`[cite: 291, 294]. [cite_start]Il requiert deux droits explicites : `contents: write` pour pouvoir éditer la page du dépôt et y créer officiellement la Release GitHub avec ses notes textuelles [cite: 298, 299][cite_start], et `packages: write` pour s'authentifier auprès de GHCR afin d'y téléverser les conteneurs Docker de production[cite: 298, 300].

### Q15: Déroulement étape par étape du pipeline de release
1. [cite_start]Le runner démarre sur une machine virtuelle Linux propre et clone le code avec l'historique complet (`fetch-depth: 0`)[cite: 297, 302, 304].
2. [cite_start]Il s'authentifie sur la base de registre GitHub Container Registry à l'aide des jetons éphémères du pipeline[cite: 300, 301].
3. [cite_start]Il compile l'image Docker de production et l'envoie sur GHCR sous deux étiquettes différentes : le numéro de tag extrait (`v1.1.0`) et le tag glissant (`latest`)[cite: 307, 308, 309].
4. [cite_start]Le moteur `git-cliff` s'exécute, balaie les commits conventionnels depuis la version précédente, et génère un texte Markdown ordonné[cite: 310, 311, 362].
5. [cite_start]L'action finale crée la Release officielle sur GitHub en y injectant le CHANGELOG généré[cite: 328, 329, 331].

### Q16: Analyse du CHANGELOG auto-généré sur GitHub
[cite_start]La Release présente un tableau propre classé de façon logique avec des titres clairs pour les **Features** et les **Bug Fixes**[cite: 356, 377]. L'historique est parfaitement conforme à nos actions. [cite_start]Les tâches internes de maintenance ou de refactorisation (`chore`, `refactor`) ont été automatiquement filtrées et exclues, évitant ainsi de polluer les notes de version destinées aux utilisateurs externes[cite: 387, 390].

### Q17: Importance de maintenir conjointement les tags :latest et :v1.1.0
* [cite_start]**Le tag spécifique (:v1.1.0) :** Représente un instantané immuable et figé du code[cite: 336, 337]. [cite_start]C'est l'étiquette indispensable pour les serveurs de production réels afin de garantir que l'application déployée ne changera jamais de comportement de manière imprévue[cite: 337].
* [cite_start]**Le tag glissant (:latest) :** Représente la version stable la plus récente issue de l'usine logicielle[cite: 396]. Il est idéal pour les environnements de staging ou les machines de développement local pour récupérer automatiquement la dernière version du conteneur sans modifier manuellement les scripts de déploiement à chaque mise à jour.

---

## 🔍 EX.5 — Réflexion & Recherche

### 5A — Réflexion

### Q18: Arguments objectifs pour convaincre un senior d'adopter Prettier
[cite_start]Je lui expliquerais que Prettier ne remet pas en cause son style ou ses compétences de codeur[cite: 82, 83]. [cite_start]L'objectif est d'éliminer définitivement les débats stériles et chronophages sur le formatage lors des revues de code, qui représentent en moyenne 40 % du temps des Pull Requests[cite: 25, 26]. [cite_start]De plus, uniformiser automatiquement la mise en page supprime les faux conflits de merge dans Git générés par les différences de configurations des éditeurs de l'équipe, rendant le `git blame` propre et l'onboarding des nouveaux développeurs immédiat[cite: 32, 33, 36, 37].

### Q19: Gestion d'un breaking change accidentel sur la branche principale
[cite_start]Ayant cassé par inadvertance la compatibilité avec l'ancienne version de l'API lors de la fusion, nous devons impérativement acter une rupture rétrocompatible selon les règles SemVer[cite: 222, 223]. [cite_start]L'application doit donc passer d'un saut majeur direct vers la version **`v4.0.0`**[cite: 222, 392]. [cite_start]Il conviendra de documenter précisément la nature de la rupture dans les notes de version, de fournir un guide de migration clair pour les utilisateurs de l'API, et de communiquer officiellement une date de dépréciation (sunset) pour l'ancienne version v3 afin de laisser le temps aux clients de s'adapter[cite: 229].

### 5B — Recherche autonome

### Q20: Différence fonctionnelle entre git-cliff et semantic-release
* [cite_start]**git-cliff :** Est un outil spécialisé axé uniquement sur la lecture de l'historique et la mise en forme automatique d'un fichier de CHANGELOG en Markdown[cite: 311, 362]. [cite_start]Il s'intègre dans un pipeline mais nécessite que le tag Git ait déjà été créé par l'utilisateur ou par un script externe[cite: 316].
* [cite_start]**semantic-release :** Est un framework d'automatisation complet et autonome[cite: 558]. [cite_start]Il analyse les commits, calcule tout seul le numéro de version, met à jour les fichiers de configuration, génère le changelog, crée le tag Git à la volée, et publie la Release sur GitHub de bout en bout sans aucune action manuelle du développeur[cite: 558].

### Q21: Configuration d'une contrainte de taille de message dans CommitLint
Pour imposer une longueur minimale de 10 caractères sur le sujet du message, il faut configurer l'objet de règles personnalisé dans le fichier `commitlint.config.js` comme ceci :
```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-min-length': [2, 'always', 10]
  }
};