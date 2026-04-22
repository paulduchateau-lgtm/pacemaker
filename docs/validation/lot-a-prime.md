# Validation — Lot A' (Navigation 5 pages)

## Navigation
- [ ] Sidebar 5 entrees : Briefing, Inbox, Plan, Signaux, Memoire
- [ ] Badge Signaux = nb d'incoherences pending
- [ ] Sidebar collapsible (localStorage)

## Pages
- [ ] /briefing — KPIs + journal
- [ ] /inbox?tab=capture — zone capture operationnelle
- [ ] /inbox?tab=sources — liste sources + recherche RAG
- [ ] /plan?tab=phases — accordeon phases
- [ ] /plan?tab=semaines — plan par semaines (meme fonctionnel que avant)
- [ ] /plan?tab=livrables — liste livrables
- [ ] /signaux?tab=incoherences — incoherences pending
- [ ] /signaux?tab=risques — grille risques
- [ ] /signaux?tab=pulse — placeholder Plaud
- [ ] /memoire?tab=contexte — contexte mission
- [ ] /memoire?tab=decisions — liste decisions
- [ ] /memoire?tab=agent — recalibrations + actions
- [ ] /memoire?tab=regles — regles apprises

## Panneaux
- [ ] Clic livrable -> SidePanel LivrablePanel
- [ ] Clic phase -> SidePanel PhasePanel
- [ ] Clic jalon -> SidePanel MilestonePanel
- [ ] Clic incoherence -> SidePanel IncoherencePanel
- [ ] Esc + x + overlay ferment le panneau

## Redirections
- [ ] /v2/briefing -> /briefing (308)
- [ ] /v2/plan -> /plan (308)
- [ ] /v2/livrables -> /plan?tab=livrables (308)
- [ ] /v2/sources -> /inbox?tab=sources (308)
- [ ] /v2/incoherences -> /signaux (308)
- [ ] /v2/recalibrations -> /memoire?tab=agent (308)

## Non-regression
- [ ] Generation taches fonctionne (Plan > Semaines)
- [ ] Generation livrables fonctionne (Plan > Livrables)
- [ ] Checkbox tache fonctionne
- [ ] Capture photo fonctionne (Inbox > Capture)
- [ ] Dashboard client /client inchange
