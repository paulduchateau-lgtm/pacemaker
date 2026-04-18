# Chantier 08 — Fourchettes de conversion temps gagné

**Statut** : proposition, **en attente d'arbitrage Paul** avant d'écrire `src/config/time-conversion.ts`.
**Référence** : `pacemaker-plan-transformation.md` §Chantier 8, `pacemaker-prompt-amorcage.md` §Partie B chantier 8.

Règle du prompt d'amorçage : *« les valeurs d'économies de temps dans `time-conversion.ts` sont des estimations. Elles doivent être discutées avec Paul avant d'être figées. Plutôt qu'inventer des chiffres seul, propose-lui une fourchette pour chaque activité. »*

Je propose ci-dessous une fourchette basse / médiane / haute pour chaque activité tracée par l'app. Tu indiques ton choix par activité (basse, médiane, haute, ou un chiffre personnalisé).

---

## 1. Référentiel des activités mesurées

Chaque ligne correspond à une **action automatique de l'agent** qui, sans Pacemaker, demanderait du temps consultant manuel. La conversion est en **minutes de temps consultant économisées** par occurrence de l'activité.

| # | Activité (clé technique) | Ce qui se passe | Fourchette basse | Médiane (proposée) | Fourchette haute | Base de raisonnement |
|---|--------------------------|-----------------|:---------------:|:-----------------:|:----------------:|---------------------|
| 1 | `task_creation_llm` | LLM génère 4-6 tâches hebdo | 8 | **15** | 25 | Paul met ~2-4 min par tâche pour les formaliser à la main × 5 tâches |
| 2 | `cr_parsing` | Parse CR → décisions + actions + risques + opportunités | 15 | **25** | 45 | Rédaction manuelle d'un CR structuré post-réunion |
| 3 | `vision_extract` | Photo paperboard → actions/risques structurés | 10 | **15** | 25 | Retaper à la main les post-it d'un atelier |
| 4 | `livrable_generation` | Génération DOCX/XLSX/PPTX structuré | 30 | **45** | 90 | Rédiger + mettre en forme un livrable "template + contenu" |
| 5 | `livrable_correction` | Correction → règle apprise, ne se répète plus | 5 | **8** | 15 | Gain indirect : règle injectée sur N futures générations |
| 6 | `briefing_consulted` | Briefing 30s/2min/10min à l'ouverture d'une mission | 5 | **10** | 20 | Relire 5-15 min de notes pour se remettre en selle |
| 7 | `recalibration_manual` | Admin clique "⟳ Recalibrer" | 20 | **30** | 60 | Reprévoir manuellement un plan sur les semaines restantes |
| 8 | `recalibration_auto` | Recalib déclenchée par incohérence | 15 | **25** | 45 | Même travail, mais que Paul n'aurait sans doute pas fait spontanément |
| 9 | `incoherence_flagged` | Incohérence détectée + remontée au briefing | 10 | **20** | 45 | Surprise évitée : détecter à froid une contradiction sur un plan |
| 10 | `decision_captured_rich` | Décision sauvegardée avec motifs + alternatives | 3 | **5** | 10 | Temps de rédaction d'une note de décision propre |
| 11 | `schedule_cascade` | Changement de date avec cascade automatique | 5 | **10** | 20 | Décaler manuellement les 6 semaines suivantes + livrables |
| 12 | `doc_indexed_rag` | Document uploadé + indexé pour recherche sémantique | 1 | **2** | 5 | Très faible par doc, mais utile cumulé à chaque recherche future |

**Total médian pour une semaine type Agirc-Arrco** (hypothèses : 1 CR parsé, 1 photo, 5 tâches générées, 1 briefing consulté 3×/semaine, 2 livrables générés, 1 incohérence flaggée) :
```
25 + 15 + 15 + 45×2 + 10×3 + 20 = 185 min ≈ 3h / semaine
```

Sur une mission de 7 semaines : **~21 h économisées** au médian, soit ~2,5 jh sur 30 jh budgétés = **~8,3 %** de la charge consultant libérée.

---

## 2. Ce que je te demande

Trois options de décision :

### Option (a) — Valider les médianes
Je fige `time-conversion.ts` avec la colonne "Médiane (proposée)" telle quelle.

### Option (b) — Arbitrer par ligne
Tu me dis pour chaque ligne : "b" (basse), "m" (médiane), "h" (haute), ou un chiffre personnalisé.
Format attendu :
```
1: m
2: h
3: b
4: 60
5: m
...
```

### Option (c) — On ne fige rien pour l'instant
On commence à logger **les événements sans conversion** (juste le compteur d'activités). Après 2 semaines d'usage, on calibre avec les vrais ordres de grandeur observés.

L'option (c) est la plus honnête vis-à-vis du manifeste (P7 : "toute feature est évaluée contre le temps libéré"), mais elle retarde le dashboard de ~2 semaines.

---

## 3. Autres questions avant figement

1. **Devrait-on distinguer une activité faite *effectivement* vs juste *disponible* ?**
   Par exemple : un briefing généré mais non consulté ne devrait pas compter.
   Proposition : ne logguer que les activités avec un signal d'usage côté utilisateur (briefing consulté = render HTTP de /api/briefing/[slug], tâche utilisée = status passé à "fait" ou "en cours"). L'inverse (logger à la génération) gonfle artificiellement.

2. **Affichage côté client** : le plan dit "consultable aussi côté client, comme démonstration de valeur".
   Risque : un client qui voit "Pacemaker a économisé 21h à Paul" peut mal le prendre ("je paie 30 jh, j'attends 30 jh de présence"). À discuter.
   Alternative : n'afficher que côté admin au MVP, le client ne voit rien ou seulement un compteur agrégé "heures investies en analyse" (rebranding positif).

3. **Baseline** : est-ce qu'on instrumente aussi une métrique inverse (temps *passé* dans Pacemaker = temps d'ouverture de l'app) pour vérifier que le **solde net** est bien positif ? Règle 10 du manifeste.
   Proposition : ajouter un timer côté client (durée de session) logué chaque 30s. Coût : minimal. Bénéfice : on peut enfin dire "21h gagnées nettes de 4h passées dans l'outil = **17h net**", ce qui est l'unique vérité qui intéresse le manifeste.

---

## 4. Ce que je fais dès que tu tranches

1. J'écris `src/config/time-conversion.ts` avec les valeurs validées.
2. Migration `chantier-08` : table `time_savings` (mission_id, user_id, activity_type, estimated_minutes_saved, source_entity_*, created_at).
3. Hooks `logTimeSaving(activity, {missionId, entityRef})` dans les routes qui émettent ces activités (LLM/data/vision/briefing/recalibrations).
4. Si option (3) baseline time-spent : ajout `time_spent` table + ping côté client.
5. API `GET /api/time-savings?period=week|month|mission` avec agrégation.
6. Dashboard `/admin/missions/[slug]/temps-libere` : 3 chiffres-clés + camembert par activité. Sobre, cohérent avec la charte.
7. Éventuellement : widget "temps libéré cette semaine" dans le briefing 30s.

Dis-moi ton choix et je m'y mets.
