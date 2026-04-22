# Validation Lot B — Palier d'arbitrage

## Checklist de validation

### 1. DDL et migration

- [ ] Lancer `npx tsx scripts/migrate-lot-b-ddl.ts` sans erreur
- [ ] Tables `intake_items` et `plan_impacts` visibles dans Turso
- [ ] Index `idx_intake_items_mission`, `idx_intake_items_status`, `idx_plan_impacts_mission`, `idx_plan_impacts_intake`, `idx_plan_impacts_target` presents

### 2. Feature flag

- [ ] Copier `.env.local.example` et decommenter `NEXT_PUBLIC_V2_ARBITRAGE=true`
- [ ] Relancer `next dev`

### 3. Mode propose (parse-upload)

- [ ] Aller sur `/admin/missions/<slug>/inbox` > onglet Capture
- [ ] Coller un CR texte et soumettre
- [ ] Verifier que la reponse contient `{ intakeId, impactCount, impacts }`
- [ ] Verifier dans Turso : une row dans `intake_items` avec `status='parsed'`
- [ ] Verifier dans Turso : N rows dans `plan_impacts` avec `status='proposed'`

### 4. Onglet Arbitrages

- [ ] Aller sur `/admin/missions/<slug>/plan?tab=arbitrages`
- [ ] Les impacts proposes s'affichent groupes par intake
- [ ] Le badge numerique est visible sur l'onglet "Arbitrages"
- [ ] Le badge est visible sur l'entree "Plan" dans la sidebar

### 5. Accepter un impact

- [ ] Cliquer "Accepter" sur un impact de type `task/add`
- [ ] Verifier que la tache apparait dans `/plan?tab=semaines`
- [ ] Verifier dans Turso : la row `plan_impacts` a `status='accepted'` et `agent_action_id` renseigne
- [ ] Verifier dans Turso : une row dans `agent_actions` avec `action_type='create_task'`

### 6. Rejeter un impact

- [ ] Cliquer "Rejeter" sur un impact
- [ ] L'impact disparait de l'onglet Arbitrages
- [ ] Verifier dans Turso : `status='rejected'`, `decided_by` et `decided_at` renseignes

### 7. Accepter tout un groupe

- [ ] Cliquer "Tout accepter (N)" sur un groupe d'intake
- [ ] Tous les impacts du groupe passent en `accepted`
- [ ] Le groupe disparait de l'onglet Arbitrages

### 8. Mode immediate (legacy)

- [ ] Mettre `NEXT_PUBLIC_V2_ARBITRAGE=false` (ou supprimer la variable)
- [ ] Soumettre un CR texte
- [ ] Verifier que les taches/decisions/risques sont crees directement (comportement legacy)
- [ ] Aucune row dans `intake_items` / `plan_impacts`

### 9. Verification TypeScript

- [ ] `npx tsc --noEmit` sans erreur dans `/Users/paulduchateau/projects/liteops/pacemaker`

### 10. Routes API

- [ ] `GET /api/intakes?mission=<slug>` renvoie la liste des intakes
- [ ] `GET /api/impacts?count=1&status=proposed&mission=<slug>` renvoie `{ count: N }`
- [ ] `POST /api/impacts/<id>/accept` accepte l'impact et retourne `{ agentActionId, entityId }`
- [ ] `POST /api/impacts/<id>/reject` rejette l'impact
- [ ] `POST /api/impacts/accept-batch` avec `{ intake_id }` accepte tous les impacts du groupe
