# Réponses TP — Sécurité DevSecOps & Monitoring

## EX.1 — Questions de cours

### Partie A — Concepts

**Q1 — npm audit vs Trivy**

| Critère | npm audit | Trivy |
|---|---|---|
| Périmètre | Dépendances npm (package-lock.json) | Image Docker entière : OS, libs système, packages npm, configs |
| Source CVE | Base npm Advisory | NVD, GHSA, OS advisories (Alpine, Debian…) |
| Vitesse | Très rapide (~5s) | Plus lent (télécharge la DB, analyse les layers) |
| Quand | Avant le build Docker | Après le build Docker |

**Ordre dans le pipeline :** `npm audit` en premier dans le job `lint` (avant build, coût zéro), puis `Trivy` dans le job `security` après le push de l'image. La logique est *fail-fast* : on rejette les dépendances vulnérables sans perdre du temps à builder une image qu'on va de toute façon rejeter.

---

**Q2 — Moindre privilège appliqué aux secrets**

Principe : chaque composant du pipeline ne reçoit que les droits strictement nécessaires à son rôle, rien de plus.

Exemple 1 — **Permissions GitHub Actions par job :**
```yaml
# job lint : lecture seule, pas besoin d'écrire sur GHCR
permissions:
  contents: read

# job docker : écriture sur GHCR uniquement
permissions:
  contents: read
  packages: write
```

Exemple 2 — **Secrets scindés par usage :**
- `RENDER_DEPLOY_HOOK` : accessible uniquement dans `deploy-production`, pas dans `lint` ni `test`. Un job compromis ne peut pas déclencher un déploiement.
- `SLACK_WEBHOOK_URL` : accessible uniquement dans les jobs `notify-*`, jamais exposé dans les jobs de build.

---

**Q3 — Les 4 métriques DORA**

| Métrique | Définition | Niveau élite | Contribution du pipeline CI/CD |
|---|---|---|---|
| **Deployment Frequency** | Fréquence des déploiements en production | Plusieurs fois par jour | Chaque push sur `main` déclenche un déploiement automatique |
| **Lead Time for Changes** | Délai du 1er commit jusqu'au déploiement prod | < 1 heure | Pipeline automatisé ~5-10 min, pas d'intervention manuelle |
| **Change Failure Rate** | % de déploiements causant un incident | 0–15 % | Tests automatiques, scan Trivy, npm audit bloquent les régressions avant prod |
| **MTTR** (Mean Time To Restore) | Temps pour restaurer le service après incident | < 1 heure | Fix → commit → pipeline → prod en ~10 min ; health check post-déploiement intégré |

---

### Partie B — Vrai / Faux

1. **FAUX** — `npm audit --audit-level=high` fait échouer le pipeline pour les vulnérabilités **HIGH et CRITICAL** (les deux niveaux supérieurs ou égaux à `high`).

2. **VRAI** — Trivy analyse le contenu de chaque layer de l'image Docker et peut détecter des patterns de secrets (clés API, tokens) hardcodés dans des fichiers copiés avec `COPY`.

3. **FAUX** — `if: failure()` sur un **job** s'exécute si l'un des **jobs listés dans `needs:`** a échoué, pas les steps du même job. Pour les steps, `if: failure()` évalue les steps précédents du même job — mais la question parle d'un *job*, où la référence est toujours les jobs parents (`needs`).

4. **VRAI** — Dependabot crée automatiquement des Pull Requests mais ne les merge **jamais** sans intervention humaine par défaut. Il faut configurer `automerge` explicitement (via une GitHub Action dédiée) pour activer le merge automatique.

5. **FAUX** — Un secret exposé dans un commit **reste permanent dans l'historique git** même après `git rm`. Le fichier est supprimé du working tree mais le commit contenant le secret est toujours accessible via `git log`. Il faut : (1) **invalider immédiatement le secret** auprès du provider, (2) réécrire l'historique avec `git filter-branch` ou `BFG Repo-Cleaner`, (3) force-push, (4) vérifier que tous les forks/clones sont mis à jour.

---

## EX.2 — npm audit + Trivy

**Q4 — Résultat npm audit local**

```
$ npm audit
found 0 vulnerabilities
```

Le projet n'a **aucune vulnérabilité connue** dans ses dépendances directes (`express`) ni transitives. Toutes les dépendances de développement (`jest`, `eslint`, `prettier`, `husky`) sont également propres. Ce résultat est attendu sur un projet récent avec peu de dépendances.

---

**Q5 — Choix de `--audit-level`**

Choix : `--audit-level=high`

**Justification :**
- **HIGH/CRITICAL** = risque d'exploitation réelle en production (RCE, injection, élévation de privilèges). Ces CVEs bloquent le pipeline.
- **LOW/MODERATE** = souvent limitées à des scénarios très spécifiques (ex: ReDoS sur des inputs contrôlés, XSS dans un serveur de dev qui n'est jamais exposé). Bloquer sur ces niveaux créerait du bruit constant sans réduire le risque réel.
- Cohérence avec Trivy qui utilise également `severity: CRITICAL,HIGH`.

**Implémentation dans `ci.yml` :**
```yaml
- name: Audit Dependencies (npm audit)
  run: npm audit --audit-level=high
```

---

**Q6 — Paramètres Trivy configurés**

```yaml
- uses: aquasecurity/trivy-action@master
  with:
    image-ref: '${{ env.FULL_IMAGE }}:latest'  # image buildée dans le job docker
    format: 'sarif'                             # rapport machine-readable pour GitHub Security Tab
    output: 'trivy-results.sarif'               # fichier de sortie
    severity: 'CRITICAL,HIGH'                   # cohérent avec npm audit --audit-level=high
    ignore-unfixed: true                        # ignore CVEs sans correctif upstream disponible
    exit-code: '0'                              # ne bloque pas pour le SARIF (step séparé enforce)
```

- `image-ref` : pointe sur l'image qui vient d'être pushée dans GHCR, avec le tag `latest`
- `severity: CRITICAL,HIGH` : aligné sur la politique npm audit, évite le bruit des LOW/MEDIUM
- `ignore-unfixed: true` : CVEs sans fix disponible ne peuvent pas être corrigées par l'équipe — les signaler sans bloquer (sinon le pipeline ne passe jamais sur une image de base non patchée)
- Deux passes : une pour SARIF (upload GitHub Security Tab), une pour `exit-code: 1` (enforcement du gate)

---

**Q7 — Dépendance `needs: [docker]` pour le job security**

L'ordre est **obligatoire** car Trivy doit télécharger l'image depuis GHCR pour l'analyser. Si le job `security` démarrait avant `docker`, l'image n'existerait pas encore dans le registre — Trivy échouerait avec une erreur `image not found`. L'image doit d'abord être buildée et **pushée** (pas seulement buildée en local) pour être accessible au runner du job `security`.

---

**Q8 — Gestion de 3 CVE HIGH dans node:18-alpine sans fix disponible**

Stratégie en 3 temps :

1. **Court terme — Ne pas bloquer :** `ignore-unfixed: true` est déjà configuré. Trivy ignore automatiquement les CVEs sans correctif upstream. Le pipeline continue.

2. **Moyen terme — Documenter et suivre :** Ajouter les CVEs dans `.trivyignore` avec une justification datée et une date de révision (ex : tous les 3 mois). Créer un ticket dans le backlog pour suivre la disponibilité du correctif.

3. **Long terme — Migrer l'image de base :** Passer à `node:20-alpine` (LTS plus récent, généralement moins de CVEs) ou utiliser `node:18-alpine` avec un digest SHA fixé et surveiller les nouvelles releases via Dependabot.

```
# .trivyignore
# CVE-2024-XXXXX  # node:18-alpine, pas de fix | reviewed: 2026-06-10 | next review: 2026-09-10
```

---

## EX.3 — Notifications Slack

**Q9 — Implémentation notify-failure**

```yaml
notify-failure:
  needs: [ gitleaks, lint, test, docker, security, deploy-staging, deploy-production ]
  if: always() && contains(needs.*.result, 'failure')
  steps:
    - name: Send Slack failure notification
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
      run: |
        jq -n \
          --arg repo "${{ github.repository }}" \
          --arg branch "${{ github.ref_name }}" \
          --arg sha "${GITHUB_SHA:0:7}" \
          --arg url "...actions/runs/${{ github.run_id }}" \
          '{ "blocks": [...] }' | curl -X POST -H 'Content-type: application/json' -d @- "$SLACK_WEBHOOK_URL"
```

Points clés :
- `if: always() && contains(needs.*.result, 'failure')` : s'exécute même si d'autres jobs sont skippés (PR vs main), ne se déclenche que sur un vrai échec
- `jq -n` construit le JSON proprement, pas de risque d'injection shell
- `SHORT_SHA="${GITHUB_SHA:0:7}"` : SHA court plus lisible
- Contenu : repo, branche, SHA, lien direct vers les logs du pipeline

---

**Q10 — Test avec erreur ESLint**

Pour tester : ajouter `var x = 1` dans `src/server.js` (viole la règle `no-var` d'ESLint) et pousser.

Le job `lint` échoue sur `npm run lint`. Le job `notify-failure` se déclenche car `contains(needs.*.result, 'failure')` est vrai.

**Contenu de la notification reçue :**
```
🔴 Pipeline FAILED
Repository: MessaoudiIshak/mon-premier-cicd
Branch: main
Commit: abc1234
Logs: [Voir les logs] → lien vers GitHub Actions run
```

---

**Q11 — notify-success vs notify-failure**

| Aspect | notify-failure | notify-success |
|---|---|---|
| Déclencheur | `if: failure()` sur n'importe quel job | `if: success()` après `deploy-production` |
| Condition branche | Tous les événements | `main` uniquement |
| Lien principal | Logs du pipeline (pour diagnostiquer) | URL de l'application en production |
| Bouton d'action | "Voir les logs" | "Voir l'application" + "Logs du pipeline" |
| Informations supplémentaires | — | URL de l'app déployée, confirmation du health check |
| Urgence perçue | Critique — action requise | Informatif — confirmation de succès |

---

**Q12 — Réduire la notification fatigue (50 notifs/jour)**

1. **Filtrage par branche/environnement :** N'envoyer les notifications de failure que pour `main` (prod). Les branches de feature peuvent poster dans un canal séparé `#ci-dev` moins surveillé.

2. **Consolidation temporelle :** Si 3 commits consécutifs échouent en 10 minutes, envoyer une seule notification "Pipeline en échec (3 runs)" plutôt que 3 messages séparés. Implementable via un API call qui check si une alerte similaire a déjà été envoyée dans les 10 dernières minutes.

3. **Seuil de sévérité et canal dédié :** Créer 3 canaux : `#alerts-prod` (failures prod uniquement, notifications activées), `#alerts-ci` (tout le pipeline, muté par défaut), `#deploys` (succès uniquement). Les membres s'abonnent selon leur rôle.

---

## EX.4 — Observabilité & Métriques DORA

**Q13 — Métriques DORA du projet**

Données calculées à partir de `git log` :

| Métrique | Valeur mesurée | Niveau élite | Analyse |
|---|---|---|---|
| **Deployment Frequency** | ~20 commits poussés sur `main`, plusieurs le même jour (2026-06-08) | Multiple/jour | ✅ Elite — chaque push → déploiement auto |
| **Lead Time for Changes** | Pipeline CI/CD : ~5-10 min | < 1 heure | ✅ Elite |
| **Change Failure Rate** | ~8 commits "fix:" sur ~30 commits = **~27%** | 0–15% | ⚠️ Medium performer |
| **MTTR** | Temps entre un commit "bug" et le commit "fix:" suivant : ~5-15 min | < 1 heure | ✅ Elite |

**Amélioration pour Change Failure Rate (27% → < 15%) :**
- Ajouter des tests d'intégration pour couvrir les cas limites (l'historique montre plusieurs fix: successifs)
- Pratiquer le TDD pour ne pousser que du code testé
- Activer la règle ESLint `no-unused-vars` + coverage gate Jest à 80%

---

**Q14 — Configuration UptimeRobot** → voir [SETUP_GUIDE_EXTERNE.md](SETUP_GUIDE_EXTERNE.md)

**Paramètres choisis :**
- Intervalle : **5 minutes** (équilibre entre détection rapide et limites du plan gratuit : 50 monitors, intervalle min 5 min)
- Type : **HTTP(S)** avec keyword monitoring sur `"status":"ok"` (vérifie que l'app répond ET que le body est correct)
- Alerte : email + Slack webhook
- Timeout : 30 secondes

**Justification de 5 min :** Pour une app de TP, 5 min de downtime avant alerte est acceptable. En production critique, on passerait à 1 min (plan payant) ou on complèterait avec des health checks internes.

---

**Q15 — Informations supplémentaires pour diagnostiquer un incident**

UptimeRobot dit *quand* l'app est tombée, pas *pourquoi*. Pour diagnostiquer rapidement :

| Information | Source |
|---|---|
| Logs applicatifs (stacktrace, erreurs) | Render → service logs / stdout |
| Dernier déploiement (qui a déployé quoi) | GitHub Deployments API (tracé par `bobheadxi/deployments` dans notre pipeline) |
| Métriques système (CPU, RAM, réseau) | Render dashboard → service metrics |
| Historique des requêtes HTTP (status codes, latence) | Render access logs ou middleware de logging Express |
| Alertes de base de données | Provider DB (si applicable) |
| Diff du dernier commit | GitHub → lien du SHA dans la notification Slack |

---

## EX.5 — Réflexion & Recherche

**Q16 — Réponse au CTO "Désactivons Trivy"**

Je ne désactiverais pas Trivy, mais je proposerais de **l'optimiser** pour ne plus bloquer la vélocité :

1. **`ignore-unfixed: true`** (déjà en place) : supprime les CVEs sans correctif disponible — ces CVEs ne peuvent pas être corrigées aujourd'hui de toute façon
2. **`.trivyignore` documenté** : supprime les faux positifs ou les CVEs acceptées avec justification écrite et date de révision
3. **Parallélisation** : lancer Trivy en parallèle du déploiement staging au lieu de le bloquer → gain de temps sans perdre la visibilité
4. **Mode warning vs bloquant** : `severity: CRITICAL` bloque le pipeline ; `severity: HIGH` génère une alerte Slack sans bloquer

Argument clé : une CVE exploitée en production coûte bien plus (temps, réputation, données) que 2 minutes de pipeline. Le scan n'est pas le problème — c'est la gouvernance des exceptions qui manque.

---

**Q17 — Réduire le MTTR de 4h à 15 min**

1. **Observabilité temps réel** : logs centralisés (ex: Datadog, Sentry) avec alertes automatiques < 1 min après l'incident — actuellement l'équipe découvre les problèmes par les utilisateurs
2. **Runbooks documentés** : pour chaque type d'incident connu (DB timeout, OOM, cert expiré), un playbook avec les commandes exactes à exécuter — zéro temps de recherche ad hoc
3. **Feature flags + rollback instantané** : via LaunchDarkly ou flipt, désactiver une feature défectueuse en < 30s sans re-déployer
4. **On-call rotation structurée** : personne clairement identifiée 24/7 avec accès SSH/Cloud — pas de "qui est responsable ?" pendant 40 min
5. **Déploiements canary** : déployer sur 5% du trafic d'abord, monitorer les error rates, rollback automatique si > seuil — MTTR → 0 pour 95% des utilisateurs

---

**Q18 — Gitleaks**

Gitleaks (github.com/gitleaks/gitleaks) est un outil SAST spécialisé dans la **détection de secrets hardcodés** dans les repos git (clés API, tokens OAuth, mots de passe, certificats privés, etc.) via des règles regex configurables.

**Intégration GitHub Actions :**
```yaml
- uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    # GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}  # requis pour repos privés
```
L'action scanne tout l'historique git (avec `fetch-depth: 0`) et peut aussi analyser uniquement les nouveaux commits (mode `protect`).

**Complémentarité avec npm audit et Trivy :**
| Outil | Détecte |
|---|---|
| npm audit | Vulnérabilités dans les *dépendances* npm |
| Trivy | CVEs dans l'*image Docker* (OS + packages) |
| Gitleaks | Secrets hardcodés dans le *code source* |

Les trois outils couvrent des surfaces d'attaque orthogonales — aucun ne remplace les autres.

---

**Q19 — GitHub Secret Scanning**

GitHub Secret Scanning détecte automatiquement des patterns de tokens pour **plus de 200 providers** : AWS, Azure, Google Cloud, GitHub PAT, Stripe, Slack, Twilio, SendGrid, npm, PyPI, Shopify, etc.

**Disponibilité :**
- **Repos publics** : Secret Scanning activé automatiquement et gratuitement (inclus dans tous les plans)
- **Repos privés plan gratuit** : **NON disponible** sans GitHub Advanced Security (GHAS). GHAS est inclus dans GitHub Enterprise et GitHub Team/Enterprise Cloud — payant pour les repos privés sur le plan Free.

**Différence avec Gitleaks :** GitHub Secret Scanning s'exécute côté serveur au moment du push (pas dans un workflow), peut bloquer le push via *push protection*, et notifie automatiquement les providers partenaires (ex: AWS révoque le token détecté). Gitleaks s'exécute dans le pipeline CI/CD et permet une configuration plus fine des règles.
