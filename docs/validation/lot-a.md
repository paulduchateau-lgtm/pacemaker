# Validation — Lot A (Squelette du plan)

## Statut : EN COURS

## Tests manuels a effectuer

### Schema

- [ ] Tables `phases`, `milestones`, `success_criteria`, `deliverable_iterations` existent
- [ ] `weeks.phase_id`, `livrables.primary_phase_id`, `livrables.type`, `tasks.iteration_id` existent et sont nullables
- [ ] Aucune colonne existante supprimee

### Donnees seedees

- [ ] 5 phases creees pour la mission `agirc-arrco-2026`
- [ ] Chaque phase a 1 milestone avec `target_date` coherente
- [ ] Chaque milestone a 1 `success_criterion` generique
- [ ] `weeks.phase_id` renseigne pour les 7 semaines
- [ ] Livrables existants ont une iteration (order=1) rattachee

### API

- [ ] `GET /api/data/phases` retourne 5 phases triees
- [ ] `POST /api/data/phases` cree une phase
- [ ] `GET /api/data/milestones?phase_id=...` retourne le milestone de la phase
- [ ] `POST /api/data/milestones` cree un milestone
- [ ] `POST /api/data/success-criteria` cree un critere
- [ ] `PATCH /api/data/success-criteria/:id` evalue un critere
- [ ] `GET /api/data/deliverable-iterations?deliverable_id=...` retourne les iterations
- [ ] `POST /api/data/deliverable-iterations` cree une iteration

### Non-regression UI

Tester apres `npm run dev` :

- [ ] `/admin/missions/[slug]/v2` — page overview : OK
- [ ] `/admin/missions/[slug]/v2/plan` — liste des semaines + taches : OK
- [ ] `/admin/missions/[slug]/v2/livrables` — liste des livrables : OK
- [ ] `/admin/missions/[slug]/v2/briefing` — briefing adaptatif : OK
- [ ] `/admin/missions/[slug]/v2/sources` — sources RAG : OK
- [ ] `/admin/missions/[slug]/v2/inbox` — inbox capture : OK
- [ ] `/admin/missions/[slug]/v2/incoherences` — incoherences : OK
- [ ] Generation de taches (bouton "Completer par IA") : OK
- [ ] Generation de livrables (modal) : OK
- [ ] Checkbox tache : OK

## Procedure de rollback

```sql
-- Supprimer les nouvelles colonnes (non supporte par libsql — recreer la table)
-- Pour rollback total : restaurer le snapshot DB depuis Turso dashboard
-- ou recreer la DB depuis schema.sql sans le bloc LOT A.
```

## Questions ouvertes

(Sera complete par le script de migration si des cas ambigus sont rencontres)
