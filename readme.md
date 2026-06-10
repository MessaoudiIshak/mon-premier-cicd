[![CI Pipeline](https://github.com/MessaoudiIshak/mon-premier-cicd/actions/workflows/ci.yml/badge.svg)](https://github.com/MessaoudiIshak/mon-premier-cicd/actions)

## Description
Premier pipeline CI/CD avec GitHub Actions, Node.js, Jest et ESLint.

## Lancer les tests
```bash
npm ci && npm test
```

---

## Sécurité DevSecOps

Le pipeline intègre 3 couches de sécurité complémentaires :

| Couche | Outil | Détecte |
|---|---|---|
| Secrets dans le code | Gitleaks | Clés API, tokens, mots de passe hardcodés |
| Vulnérabilités npm | npm audit | CVEs dans les dépendances JavaScript |
| Vulnérabilités image | Trivy | CVEs dans l'image Docker (OS + packages) |

---

### Interpréter les alertes de sécurité

#### npm audit

Lancé dans le job `lint` avec `--audit-level=high`.

```
found 2 vulnerabilities (1 high, 1 critical)
```

- **LOW / MODERATE** : le pipeline continue. Traiter dans le sprint suivant.
- **HIGH / CRITICAL** : le pipeline **bloque**. Action requise avant merge.

Pour corriger : `npm audit fix` (mises à jour mineures) ou `npm audit fix --force` (mises à jour majeures — vérifier les breaking changes).

#### Trivy

Lancé dans le job `security` après le build Docker. Analyse `CRITICAL` et `HIGH` uniquement, ignore les CVEs sans correctif upstream (`ignore-unfixed: true`).

Les résultats sont visibles dans :
1. **GitHub Security Tab** → Security → Code scanning alerts (format SARIF uploadé automatiquement)
2. **Logs du job** `security` → étape "Trivy — Enforce security gate"

Si Trivy bloque le pipeline :
- CVE dans une dépendance npm → `npm update <package>` puis rebuild
- CVE dans l'image de base → mettre à jour `FROM node:18-alpine` vers une version plus récente, ou ajouter au `.trivyignore` avec justification datée

#### Gitleaks

Lancé dans le job `gitleaks` (scan de tout l'historique git) et en pre-commit local.

Si Gitleaks détecte un secret :
```
Finding: AWS_ACCESS_KEY_ID = AKIAIOSFODNN7EXAMPLE
File: src/config.js
```

**Procédure immédiate :**
1. **Invalider le secret** auprès du provider (AWS, GitHub, Slack…) — NE PAS attendre
2. Supprimer le fichier du code source
3. Réécrire l'historique git :
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch src/config.js" \
     --prune-empty --tag-name-filter cat -- --all
   git push --force
   ```
4. Vérifier via `gitleaks detect --source . -v` que le secret a bien disparu

---

### Procédure en cas de CVE critique

**Délais cibles :** CVE critique → correctif déployé en < 24h

1. **Triage** (< 30 min) : lire le CVE, évaluer si notre usage est vulnérable (le vecteur d'attaque s'applique-t-il ?)
2. **Mitigation temporaire** : si une config contourne la vulnérabilité, la déployer immédiatement
3. **Correctif** :
   - CVE npm : `npm update <package>` + tests + pipeline
   - CVE image de base : `docker pull node:18-alpine` (version patchée), rebuild et push
4. **Validation** : pipeline doit passer, Trivy ne doit plus reporter la CVE
5. **Post-mortem** : documenter dans le ticket, mettre à jour `.trivyignore` si suppression d'une exception

**Si aucun correctif n'est disponible :**
- Ajouter au `.trivyignore` avec justification, date de revue (3 mois max)
- Créer un ticket de suivi pour monitorer la disponibilité du patch
- Évaluer des mitigations alternatives (WAF, réseau isolé, fonctionnalité désactivée)
