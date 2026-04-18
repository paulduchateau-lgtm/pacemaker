# Validation — Chantier 01 (Entité Mission multi-tenant)

**Branche** : `feat/chantier-01-mission-entity`
**Scope** : transforme Pacemaker d'une app mono-mission (agirc-arrco) en copilote multi-mission. Toutes les tables mission-spécifiques portent désormais une colonne `mission_id`, le routage est scopé via `/admin/missions/[slug]/*` et `/client/[slug]/*`, et chaque route API résout la mission active via cookie → query → header → `DEFAULT_MISSION_SLUG`.

---

## 1. Préalables avant de jouer les tests

1. **DB locale dédiée** : la branche assume que `TURSO_DATABASE_URL` dans `.env.local` pointe vers une DB de dev isolée (par défaut `pacemaker-dev`, copie du dump prod du 2026-04-18 stocké dans `backups/prod-20260418.sql`).
2. **Dump prod fait** : `turso db shell pacemaker ".dump" > backups/prod-YYYYMMDD.sql` **avant** d'exécuter la migration en prod.
3. **Dev server** : `npm run dev` (port 3004 via `/Users/paulduchateau/projects/.claude/launch.json` ou 3000 localement).
4. **État attendu dans pacemaker-dev** : 7 weeks, 31 tasks, 7 risks, 20 livrables, 7 rapports, 7 events, 12 documents, 26 generations, 4 corrections.

---

## 2. Exécution de la migration

### Test 2.1 — Migration chantier 01 (run initial)

```bash
curl -s -X POST http://localhost:3004/api/migrate/chantier-01 | jq
```

**Attendu** :
- `ok: true`
- `missionId: "mission-agirc-arrco-2026"`
- `orphanTotal: 0`
- `log` contient `OK: mission agirc-arrco-2026 seeded ...` + une entrée `OK: <table>.mission_id added` pour chacune des 10 tables scopées + un backfill non-zéro.

### Test 2.2 — Idempotence

Rejouer la même commande.

**Attendu** :
- `ok: true`
- Toutes les entrées de log passent en `skip: ...` ou `OK: <table> backfill (0 rows)`.
- Aucune erreur SQL.

### Test 2.3 — Vérifier les row-counts côté DB

```bash
turso db shell pacemaker-dev "
SELECT 'weeks' t, COUNT(*) c, COUNT(*) - COUNT(mission_id) orphans FROM weeks
UNION ALL SELECT 'tasks', COUNT(*), COUNT(*) - COUNT(mission_id) FROM tasks
UNION ALL SELECT 'risks', COUNT(*), COUNT(*) - COUNT(mission_id) FROM risks
UNION ALL SELECT 'livrables', COUNT(*), COUNT(*) - COUNT(mission_id) FROM livrables
UNION ALL SELECT 'rapports', COUNT(*), COUNT(*) - COUNT(mission_id) FROM rapports
UNION ALL SELECT 'events', COUNT(*), COUNT(*) - COUNT(mission_id) FROM events
UNION ALL SELECT 'documents', COUNT(*), COUNT(*) - COUNT(mission_id) FROM documents
UNION ALL SELECT 'generations', COUNT(*), COUNT(*) - COUNT(mission_id) FROM generations
UNION ALL SELECT 'corrections', COUNT(*), COUNT(*) - COUNT(mission_id) FROM corrections
UNION ALL SELECT 'schedule_changes', COUNT(*), COUNT(*) - COUNT(mission_id) FROM schedule_changes;"
```

**Attendu** : colonne `orphans = 0` sur chaque ligne.

---

## 3. Redirections middleware

### Test 3.1 — Legacy → scopé

```bash
for path in "/admin" "/admin/risques" "/admin/journal" "/admin/capture" "/admin/docs" "/admin/contexte" "/admin/regles" "/client"; do
  curl -s -o /dev/null -w "$path -> %{http_code} %{redirect_url}\n" http://localhost:3004$path
done
```

**Attendu** :
- `/admin → 307 /admin/missions`
- `/admin/risques → 307 /admin/missions/agirc-arrco-2026/risques`
- (idem pour les 5 autres pages admin)
- `/client → 307 /client/agirc-arrco-2026`

### Test 3.2 — Pages scopées accessibles directement

```bash
for path in "/admin/missions" "/admin/missions/new" "/admin/missions/agirc-arrco-2026" "/admin/missions/agirc-arrco-2026/risques" "/admin/missions/agirc-arrco-2026/journal" "/admin/missions/agirc-arrco-2026/docs" "/client/agirc-arrco-2026"; do
  curl -s -o /dev/null -w "$path -> %{http_code}\n" http://localhost:3004$path
done
```

**Attendu** : `200` sur chaque ligne.

### Test 3.3 — Mission inconnue → 404

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3004/admin/missions/ne-existe-pas
```

**Attendu** : `404` ou `500` (suivant comment Next gère l'erreur du `requireMissionBySlug`). Dans les deux cas, l'accès est refusé.

---

## 4. API mission-scopées

### Test 4.1 — Résolution de la mission active

Par défaut (cookie absent, fallback sur `agirc-arrco-2026`) :

```bash
curl -s http://localhost:3004/api/data/tasks | jq 'length'
curl -s http://localhost:3004/api/data/weeks | jq 'length'
curl -s http://localhost:3004/api/data/risks | jq 'length'
```

**Attendu** : `31`, `7`, `7`.

### Test 4.2 — Override via query param

```bash
curl -s "http://localhost:3004/api/data/tasks?mission=agirc-arrco-2026" | jq 'length'
```

**Attendu** : `31` (même que 4.1).

Avec un slug inconnu :

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3004/api/data/tasks?mission=foo"
```

**Attendu** : `500` (mission introuvable).

### Test 4.3 — Isolation entre missions

Créer une 2e mission, y ajouter une tâche, vérifier qu'elle n'apparaît pas dans la 1re.

```bash
# 1. Crée la mission "demo-2026"
curl -s -X POST http://localhost:3004/api/missions \
  -H "Content-Type: application/json" \
  -d '{"slug":"demo-2026","label":"Démo 2026","client":"Interne","startDate":"2026-05-01","endDate":"2026-06-19","theme":"liteops"}' | jq

# 2. Ajoute une tâche à demo-2026 (via cookie)
curl -s -X POST http://localhost:3004/api/data/tasks \
  -H "Content-Type: application/json" \
  -b "active_mission_slug=demo-2026" \
  -d '{"weekId":1,"label":"Tâche démo isolée","owner":"Paul","priority":"moyenne"}' | jq

# 3. GET tasks pour chaque mission
curl -s -b "active_mission_slug=agirc-arrco-2026" http://localhost:3004/api/data/tasks | jq '[.[] | select(.label == "Tâche démo isolée")] | length'
curl -s -b "active_mission_slug=demo-2026" http://localhost:3004/api/data/tasks | jq '[.[] | select(.label == "Tâche démo isolée")] | length'
```

**Attendu** : `0` pour la 1re mission, `>= 1` pour la 2e.

Nettoyage :

```bash
curl -s -X DELETE http://localhost:3004/api/missions/demo-2026  # soft archive
# Les tâches restent en DB, la mission passe en status=archived
```

### Test 4.4 — Contexte mission scopé

```bash
curl -s -b "active_mission_slug=agirc-arrco-2026" http://localhost:3004/api/data/project/context | jq .value
```

**Attendu** : le contexte mission de `missions.context` pour agirc-arrco-2026.

---

## 5. Navigation UI

### Test 5.1 — Liste des missions

Ouvrir `/admin/missions` dans le navigateur.

**Attendu** :
- Header minimal "PACEMAKER" + "MISSIONS"
- Card "Agirc-Arrco — DAS Power BI" avec badge `ACTIVE`
- Dates `16/04/2026 → 04/06/2026`
- CTA vert "+ NOUVELLE MISSION"

### Test 5.2 — Création d'une mission

Cliquer "+ NOUVELLE MISSION", remplir :
- Libellé : `Pilote Matchmaker 2026`
- Slug : (laisser vide, se dérive en `pilote-matchmaker-2026`)
- Client : `Cabinet X`
- Dates : début et fin à choisir
- Thème : `liteops`

Cliquer "CRÉER LA MISSION".

**Attendu** :
- Redirection vers `/admin/missions/pilote-matchmaker-2026`
- Backlog vide (0 tâches) avec les 7 semaines absentes (la nouvelle mission n'a pas encore de seed)
- Cookie `active_mission_slug=pilote-matchmaker-2026` positionné

### Test 5.3 — Retour sur la mission d'origine

Cliquer "PACEMAKER" dans le top bar → `/admin/missions/<slug>`.
Cliquer une 2e fois dans le TopBar sur "MISSIONS" (si visible, sinon retourner sur /admin/missions manuellement).

Sélectionner la mission Agirc-Arrco.

**Attendu** : cookie bascule, la page backlog affiche 31 tâches.

### Test 5.4 — Navigation scopée

Depuis `/admin/missions/agirc-arrco-2026`, cliquer sur RISQUES, JOURNAL, CAPTURE, DOCS, RÈGLES, CONTEXTE.

**Attendu** :
- Chaque page reste scopée (URL `/admin/missions/agirc-arrco-2026/<page>`)
- Les données affichées correspondent à cette mission uniquement

### Test 5.5 — Toggle ADMIN/CLIENT

Depuis n'importe quelle page scopée, cliquer ADMIN/CLIENT.

**Attendu** :
- `/admin/missions/<slug>` ↔ `/client/<slug>`
- Le dashboard client affiche bien les données de la mission courante

---

## 6. Flux LLM / RAG (optionnels, consomment des tokens)

### Test 6.1 — Génération de tâches

Depuis une mission vide (ex: nouvellement créée), cliquer "GENERATION..." sur une semaine.

**Attendu** :
- 4–6 tâches créées, toutes avec `source = 'llm'`
- `tasks.mission_id` = mission courante
- Une ligne dans `generations` avec `mission_id` correct

```bash
turso db shell pacemaker-dev \
  "SELECT DISTINCT mission_id FROM generations WHERE generation_type='tasks';"
```

### Test 6.2 — Recalibration

Depuis le backlog de la mission, cliquer "⟳ RECALIBRER".

**Attendu** :
- Tâches non-faites des semaines ≥ currentWeek supprimées puis repensées par le LLM
- Aucune tâche d'une autre mission impactée
- Event `recalib` créé dans la mission courante

### Test 6.3 — Parse CR

Dans /contexte ou capture, paster un CR texte et lancer le parsing.

**Attendu** :
- Entités créées (tâches, décisions, risques) scopées à la mission
- Document CR indexé avec `mission_id` correct
- Recherche RAG sur la mission ne remonte que les chunks de cette mission

```bash
# Vérifier qu'un chunk n'est pas visible d'une autre mission
curl -s -b "active_mission_slug=demo-2026" \
  "http://localhost:3004/api/docs/search?q=agirc"
```

Résultat attendu : vide si `demo-2026` n'a jamais importé de CR agirc.

---

## 7. Limitations connues (à acter)

| # | Limitation | Plan |
|---|-----------|------|
| L1 | `mission_id` reste **nullable** sur les 10 tables scopées | Migration `002_mission_id_not_null.sql` à faire une fois que toutes les routes ont tourné en prod sans apparition de NULL (au moins 1 cycle de mission) |
| L2 | Table `project` (k/v) non supprimée | Chantier de nettoyage dédié, après vérification qu'aucun code ne la lit pour une clef encore vivante (budget, current_week restent globaux au chantier 1) |
| L3 | Zustand stores ne portent pas `missionId` explicitement | Suffisant via cookie tant qu'une seule mission est active par onglet. À revoir si un scénario multi-tab multi-mission apparaît |
| L4 | `budget` et `current_week` lus depuis `project` k/v dans `loadLivrableContext` | Chantier ultérieur : migrer ces deux clés en colonnes `missions.budget_json` / `missions.current_week` |
| L5 | `DEFAULT_MISSION_SLUG` codé en dur (`agirc-arrco-2026`) | Supprimé au chantier de cleanup dès que le middleware et `resolveActiveMission` peuvent refuser sans fallback |

---

## 8. Résultat

✅ Chantier 01 prêt à merger vers `main` si :
1. Tests 2.1 – 5.5 tous passent sur pacemaker-dev.
2. Un dump prod a été fait AVANT exécution en prod.
3. Le dump après migration prod montre `orphans = 0` sur toutes les tables scopées.
4. Les limitations L1-L5 sont acceptées et reportées dans les chantiers suivants.

Au merge : exécuter la migration en prod via `POST https://pacemaker-blond.vercel.app/api/migrate/chantier-01`.
