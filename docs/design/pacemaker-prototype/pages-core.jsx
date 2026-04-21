// Page views: Briefing (home), Plan, Pulse (novel), Decisions, Incohérences, Sources, Livrables, Reports
const { useState: useStateP, useMemo: useMemoP, useRef: useRefP, useEffect: useEffectP } = React;

/* ============================================================ BRIEFING */
function BriefingPage() {
  return (
    <div className="page briefing">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>LUN · 20 AVR · PHASE DÉVELOPPEMENT · S3/7</div>
          <h1 className="page-title">Briefing</h1>
        </div>
        <div className="row gap-2">
          <button className="btn btn-ghost" data-tip="Journal complet"><Icon name="eye" /></button>
          <button className="btn btn-accent"><Icon name="sparkle" /> Régénérer</button>
        </div>
      </div>

      {/* Stat strip — icon-forward, no sparklines, no delta gimmick */}
      <div className="stat-strip">
        <StatTile icon="calendar" value="34j" label="restants" sub="fin 26/05" />
        <StatTile icon="clock" value="8,5" label="jh / 30" sub="+0,8 vs prévu" tone="amber" />
        <StatTile icon="tasks" value="12" label="tâches" sub="3 bloquées" />
        <StatTile icon="flag" value="4" label="risques" sub="2 mitigés" tone="alert" />
        <StatTile icon="sparkle" value="4h12" label="libéré" sub="cette semaine" tone="green" />
      </div>

      {/* À arbitrer */}
      <SectionHead icon="incoh" label="À arbitrer" count={3} tone="alert" />
      <div className="card"><div className="card-body" style={{ padding: 0 }}>
        <ArbitrageRow
          level="major"
          title="Bascule scope R6/R7 détectée"
          body="En atelier jeudi, Nathalie a demandé à réintégrer R6 et R7 — contredit la décision S1."
          src="photo" srcLabel="Paperboard · 17/04"
          confidence={0.74}
        />
        <ArbitrageRow
          level="moderate"
          title="R4 plus complexe qu'estimé"
          body="3 mesures DAX manquantes sur le modèle existant. Recalibrage S5 auto (+0,5jh)."
          src="mic" srcLabel="Vocal · 15/04"
          confidence={0.88}
          resolved
        />
        <ArbitrageRow
          level="minor"
          title="Demande Julien Moreau hors scope R2"
          body="Onglet benchmark inter-régions — non prévu au cadrage."
          src="wa" srcLabel="WhatsApp · 18/04"
          confidence={0.91}
          last
        />
      </div></div>

      {/* Prochaines 48h */}
      <SectionHead icon="clock" label="Prochaines 48h" count={4} />
      <div className="card"><div className="card-body" style={{ padding: 0 }}>
        <AgendaRow time="Auj · 14:00" label="Atelier R1 · Clara Meyer" tag="plaud" live />
        <AgendaRow time="Demain · 09:30" label="Point Paul B. — revue DAX R1" />
        <AgendaRow time="Demain · 16:00" label="Appel Benoît Baret" flag="à caler" />
        <AgendaRow time="Mar · 10:00" label="Kick R2/R3 · démarrage S4" last />
      </div></div>

      {/* Depuis ta dernière visite */}
      <SectionHead icon="pulse" label="Depuis vendredi 17:08" count={5} sub="23 événements · 7 modifiés par Pacemaker" />
      <div className="card"><div className="card-body" style={{ padding: 0 }}>
        <TimelineEvent icon="mic" src="Plaud" who="Paul D." label="Vocal post-atelier — retour Clara Meyer positif" ts="ven 17:55" agent="2 tâches · satisfaction +0.12" />
        <TimelineEvent icon="camera" src="Photo" who="Paul D." label="Paperboard atelier — 3 actions + 1 décision contestée" ts="jeu 17:40" agent="Incohérence i1 · major" alert />
        <TimelineEvent icon="wa" src="WhatsApp" who="Julien Moreau" label="« Est-ce qu'on peut avoir un onglet benchmark ? »" ts="jeu 11:24" agent="Scope drift flaggé" />
        <TimelineEvent icon="mic" src="Plaud" who="Paul B." label="Vocal — R4 modèle incomplet" ts="mar 15:02" agent="Recalibration S5 auto · +0,5jh" />
        <TimelineEvent icon="doc" src="Upload" who="Paul D." label="atelier-r1-validation.docx" ts="mar 10:00" agent="2 décisions · 5 tâches · indexé" last />
      </div></div>
    </div>
  );
}

function StatTile({ icon, value, label, sub, tone }) {
  return (
    <div className={"stat-tile tone-" + (tone || "neutral")}>
      <div className="stat-icon"><Icon name={icon} /></div>
      <div className="stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

function SectionHead({ icon, label, count, tone, sub }) {
  return (
    <div className="sect-head">
      <span className="sect-icon"><Icon name={icon} /></span>
      <span className="sect-label">{label}</span>
      {count != null && <span className={"sect-count" + (tone ? " tone-" + tone : "")}>{count}</span>}
      {sub && <span className="sect-sub">{sub}</span>}
    </div>
  );
}

/* Retained Kpi — used by pages-extra */
function Kpi({ label, value, sub, delta, spark = [], tone }) {
  const max = Math.max(...spark, 1);
  return (
    <div className="kpi">
      <div className="k-label">{label}</div>
      <div className="k-value" style={tone === "alert" ? { color: "var(--alert)" } : tone === "amber" ? { color: "var(--amber)" } : {}}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{sub}</div>}
      {spark.length > 0 && (
        <div className="k-spark">
          {spark.map((v, i) => (
            <span key={i} className={i >= spark.length - 4 ? "on" : ""} style={{ height: `${(v/max)*18 + 2}px` }} />
          ))}
        </div>
      )}
      {delta && <div className={"k-delta " + delta.dir}>
        <Icon name={delta.dir === "up" ? "arrowUp" : "arrowDown"} /> {delta.txt}
      </div>}
    </div>
  );
}

/* Compact arbitrage row (briefing) — inspired by task list cards */
function ArbitrageRow({ level, title, body, src, srcLabel, confidence, resolved, last }) {
  const levelLabel = { major: "majeure", moderate: "modérée", minor: "mineure" }[level] || level;
  const levelTone = level === "major" ? "alert" : level === "moderate" ? "amber" : "muted";
  return (
    <div className={"arb-row" + (last ? " last" : "")}>
      <span className={"arb-dot tone-" + levelTone} />
      <div className="arb-main">
        <div className="arb-title">{title}</div>
        <div className="arb-body">{body}</div>
        <div className="arb-meta">
          <span className={"arb-pill tone-" + levelTone}>{levelLabel}</span>
          {resolved && <span className="arb-pill tone-green"><Icon name="check" className="sm" /> auto-résolu</span>}
          <span className="arb-src"><Icon name={src} className="sm" /> {srcLabel}</span>
          <Confidence value={confidence} />
        </div>
      </div>
      <div className="arb-actions">
        {!resolved && <button className="btn btn-primary">Arbitrer</button>}
        {resolved && <button className="btn btn-ghost">Voir</button>}
      </div>
    </div>
  );
}

function AgendaRow({ time, label, tag, flag, live, last }) {
  return (
    <div className="row" style={{ padding: "10px 16px", borderBottom: last ? "none" : "1px solid var(--border-soft)", gap: 10 }}>
      <span className="mono" style={{ color: "var(--muted)", minWidth: 110 }}>{time}</span>
      <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
      {tag && <Badge tone="green" dot>{tag}</Badge>}
      {flag && <Badge tone="amber">{flag}</Badge>}
      {live && <span className="nav-dot-live" style={{ margin: 0 }} />}
    </div>
  );
}

function TimelineEvent({ icon, src, who, label, ts, agent, alert, last }) {
  return (
    <div className="row" style={{ padding: "11px 16px", borderBottom: last ? "none" : "1px solid var(--border-soft)", gap: 12, alignItems: "flex-start" }}>
      <span style={{ width: 26, height: 26, borderRadius: 6, background: "var(--paper-sunk)", border: "1px solid var(--border)", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}>
        <Icon name={icon} />
      </span>
      <div style={{ flex: 1 }}>
        <div className="row" style={{ gap: 8, marginBottom: 2 }}>
          <span className="mono" style={{ color: "var(--muted)" }}>{src}</span>
          <span className="mono" style={{ color: "var(--muted-soft)" }}>·</span>
          <span style={{ fontSize: 12.5, color: "var(--ink-dim)" }}>{who}</span>
          <span className="mono" style={{ marginLeft: "auto", color: "var(--muted-soft)" }}>{ts}</span>
        </div>
        <div style={{ fontSize: 13.5 }}>{label}</div>
        {agent && (
          <div className="row" style={{ marginTop: 4, gap: 6, fontSize: 12, color: alert ? "var(--alert)" : "var(--green-deep)" }}>
            <Icon name="sparkle" /><span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em" }}>{agent}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================ PLAN */
// Group weeks into phases
function buildPhases() {
  const phases = [];
  const seen = {};
  WEEKS.forEach(w => {
    if (!seen[w.phase]) {
      seen[w.phase] = { name: w.phase, weeks: [], color: PHASE_COLOR[w.phase] };
      phases.push(seen[w.phase]);
    }
    seen[w.phase].weeks.push(w);
  });
  return phases.map(p => {
    const budget = p.weeks.reduce((s, w) => s + w.budget, 0);
    const used = p.weeks.reduce((s, w) => s + w.jhUsed, 0);
    const status = p.weeks.every(w => w.status === "fait") ? "fait"
      : p.weeks.some(w => w.status === "en cours") ? "en cours" : "à venir";
    return { ...p, budget, used, status,
      start: p.weeks[0].startIso, end: p.weeks[p.weeks.length-1].endIso,
      tasks: TASKS.filter(t => p.weeks.some(w => w.id === t.weekId)),
    };
  });
}

function PlanPage() {
  const phases = useMemoP(buildPhases, []);
  const [openPhase, setOpenPhase] = useStateP("Développement");
  const [view, setView] = useStateP("phases");

  const grouped = {
    "en cours": phases.filter(p => p.status === "en cours"),
    "à venir": phases.filter(p => p.status === "à venir"),
    "fait": phases.filter(p => p.status === "fait"),
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>PLAN · 5 PHASES · 30 JH · 7 SEMAINES</div>
          <h1 className="page-title">Plan vivant</h1>
        </div>
        <div className="row gap-2">
          <button className="btn btn-ghost" data-tip="Comparer au baseline"><Icon name="diff" /></button>
          <button className="btn btn-accent"><Icon name="sparkle" /> Recalibrer</button>
        </div>
      </div>

      <div className="tabs">
        <div className={"tab" + (view === "phases" ? " active" : "")} onClick={() => setView("phases")}>Phases<span className="count">5</span></div>
        <div className={"tab" + (view === "tasks" ? " active" : "")} onClick={() => setView("tasks")}>Tâches<span className="count">{TASKS.length}</span></div>
        <div className="tab">Livrables<span className="count">8</span></div>
        <div className="tab">Recalibrations<span className="count">2</span></div>
        <div className="tab alert">Risques<span className="count">4</span></div>
      </div>

      <PhaseRoadmap phases={phases} openPhase={openPhase} onOpen={setOpenPhase} />

      {view === "phases" && (
        <div className="plan-groups">
          {grouped["en cours"].length > 0 && (
            <PhaseGroup label="En cours" count={grouped["en cours"].length} tone="ink">
              {grouped["en cours"].map(p => <PhaseRow key={p.name} p={p} open={openPhase === p.name} onToggle={() => setOpenPhase(openPhase === p.name ? null : p.name)} />)}
            </PhaseGroup>
          )}
          {grouped["à venir"].length > 0 && (
            <PhaseGroup label="À venir" count={grouped["à venir"].length} tone="muted">
              {grouped["à venir"].map(p => <PhaseRow key={p.name} p={p} open={openPhase === p.name} onToggle={() => setOpenPhase(openPhase === p.name ? null : p.name)} />)}
            </PhaseGroup>
          )}
          {grouped["fait"].length > 0 && (
            <PhaseGroup label="Terminées" count={grouped["fait"].length} tone="green">
              {grouped["fait"].map(p => <PhaseRow key={p.name} p={p} open={openPhase === p.name} onToggle={() => setOpenPhase(openPhase === p.name ? null : p.name)} />)}
            </PhaseGroup>
          )}
        </div>
      )}
      {view === "tasks" && <TaskListFlat />}
    </div>
  );
}

function PhaseGroup({ label, count, tone, children }) {
  return (
    <div className="plan-group">
      <div className="plan-group-head">
        <span className={"plan-group-label tone-" + tone}>{label}</span>
        <span className="plan-group-count">{count}</span>
      </div>
      <div className="plan-group-body">{children}</div>
    </div>
  );
}

function PhaseRoadmap({ phases, openPhase, onOpen }) {
  // 7 weeks = columns. Phase bars span their week range.
  const WEEK_COUNT = 7;
  const today = 3; // current week
  return (
    <div className="card phase-roadmap">
      <div className="card-body" style={{ padding: "16px 18px 10px" }}>
        {/* Time axis */}
        <div className="roadmap-axis">
          {Array.from({ length: WEEK_COUNT }, (_, i) => {
            const w = WEEKS[i];
            const date = new Date(w.startIso);
            const dateStr = date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
            return (
              <div key={i} className={"roadmap-col" + (i+1 === today ? " now" : "")}>
                <div className="roadmap-col-num">S{i+1}</div>
                <div className="roadmap-col-date">{dateStr}</div>
              </div>
            );
          })}
        </div>

        {/* Phase tracks */}
        <div className="roadmap-tracks">
          {/* Week grid */}
          <div className="roadmap-grid">
            {Array.from({ length: WEEK_COUNT }, (_, i) => (
              <div key={i} className={"roadmap-gridcol" + (i+1 === today ? " now" : "")} />
            ))}
          </div>

          {/* Today line */}
          <div className="roadmap-today" style={{ left: `calc(164px + (100% - 164px) * ${(today - 0.5) / WEEK_COUNT})` }}>
            <div className="roadmap-today-label">AUJ</div>
          </div>

          {/* Bars */}
          {phases.map((p) => {
            const startW = p.weeks[0].id;
            const endW = p.weeks[p.weeks.length-1].id;
            const left = ((startW - 1) / WEEK_COUNT) * 100;
            const width = ((endW - startW + 1) / WEEK_COUNT) * 100;
            const progress = p.budget ? Math.min(100, (p.used / p.budget) * 100) : 0;
            const isOpen = openPhase === p.name;
            return (
              <div key={p.name} className={"roadmap-row" + (isOpen ? " active" : "")}>
                <div className="roadmap-row-label">
                  <span className="phase-dot" style={{ background: p.color }} />
                  <span className="phase-name">{p.name}</span>
                </div>
                <div className="roadmap-row-track">
                  <div
                    className={"roadmap-bar status-" + p.status.replace(/\s/g, "-")}
                    style={{ left: `${left}%`, width: `${width}%`, "--phase-color": p.color }}
                    onClick={() => onOpen(isOpen ? null : p.name)}
                  >
                    <div className="roadmap-bar-fill" style={{ width: `${progress}%` }} />
                    <div className="roadmap-bar-content">
                      {p.status === "fait" && <Icon name="check" className="sm" />}
                      {p.status === "en cours" && <span className="pulse-dot" />}
                      <span className="roadmap-bar-meta">{p.used.toFixed(1)}/{p.budget} jh</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recalibration markers under the tracks */}
        <div className="roadmap-markers">
          <RecalibMarker leftPct={(1/WEEK_COUNT)*100 + 6} label="+2j cascade" />
          <RecalibMarker leftPct={(4/WEEK_COUNT)*100 + 6} label="+0,5jh R4" />
        </div>
      </div>
    </div>
  );
}

function RecalibMarker({ leftPct, label }) {
  return (
    <div className="roadmap-marker" style={{ left: `${leftPct}%` }}>
      <svg width="8" height="8" viewBox="0 0 10 10"><path d="M5 0 L10 5 L5 10 L0 5 Z" fill="var(--amber)" /></svg>
      <span className="mono">{label}</span>
    </div>
  );
}

function PhaseRow({ p, open, onToggle }) {
  const done = p.tasks.filter(t => t.status === "fait").length;
  const pct = p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0;
  const isCurrent = p.status === "en cours";
  const statusTone = p.status === "fait" ? "green" : p.status === "en cours" ? "ink" : "";
  return (
    <div className={"phase-card" + (isCurrent ? " current" : "") + (open ? " open" : "")}>
      <div className="phase-head" onClick={onToggle}>
        <span className="phase-accent" style={{ background: p.color }} />
        <div className="phase-head-main">
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <span className="phase-title">{p.name}</span>
            <Badge tone={statusTone}>{p.status}</Badge>
            {isCurrent && <span className="pulse-dot" />}
          </div>
          <div className="phase-head-meta">
            <span className="mono"><Icon name="calendar" className="sm" /> {fmtRange(p.start, p.end)}</span>
            <span className="mono"><Icon name="clock" className="sm" /> {p.used.toFixed(1)} / {p.budget} jh</span>
            <span className="mono"><Icon name="tasks" className="sm" /> {p.tasks.length} tâches · {done} ✓</span>
            <span className="mono"><Icon name="livrables" className="sm" /> {LIVRABLES.filter(l => p.weeks.some(w => w.id === l.week)).length} livrables</span>
          </div>
        </div>
        <div className="phase-progress">
          <div className="progress"><span style={{ width: `${pct}%`, background: p.color }} /></div>
          <span className="mono">{pct}%</span>
        </div>
        <Icon name="chev" className={"muted"} />
      </div>
      {open && (
        <div className="phase-body">
          {p.weeks.map(w => (
            <div key={w.id} className="phase-week">
              <div className="phase-week-head">
                <span className="mono">S{w.id}</span>
                <span className="phase-week-title">{w.title}</span>
                <Badge tone={w.status === "fait" ? "green" : w.status === "en cours" ? "ink" : "soft"}>{w.status}</Badge>
                <span className="mono" style={{ marginLeft: "auto" }}>{w.budget} jh</span>
              </div>
              {TASKS.filter(t => t.weekId === w.id).map(t => <TaskRow key={t.id} t={t} />)}
            </div>
          ))}
          <div className="phase-actions">
            <button className="btn btn-ghost"><Icon name="plus" /> Ajouter une tâche</button>
            <button className="btn btn-ghost"><Icon name="sparkle" /> Générer livrables</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskListFlat() {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-body" style={{ padding: 0 }}>
        {TASKS.map(t => <TaskRow key={t.id} t={t} />)}
      </div>
    </div>
  );
}

function fmtRange(startIso, endIso) {
  const s = new Date(startIso), e = new Date(endIso);
  const opts = { day: "numeric", month: "short" };
  return `${s.toLocaleDateString("fr-FR", opts)} → ${e.toLocaleDateString("fr-FR", opts)}`;
}

function TaskRow({ t }) {
  const statusColor = { "à faire": "var(--muted)", "en cours": "var(--sky)", "bloqué": "var(--alert)", "fait": "var(--green-deep)" }[t.status];
  const srcLabel = { llm: "IA", manual: "manuel", upload: "upload", recalib: "recalib", vision: "photo" }[t.source];
  return (
    <div className="row" style={{ padding: "9px 16px", borderBottom: "1px solid var(--border-soft)", gap: 12 }}>
      <span style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${statusColor}`, flexShrink: 0, background: t.status === "fait" ? statusColor : "transparent", display: "grid", placeItems: "center" }}>
        {t.status === "fait" && <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#FFF" strokeWidth="2.5"><path d="M3 8L6.5 11.5L13 4.5" /></svg>}
        {t.status === "en cours" && <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="2.5" fill={statusColor} /></svg>}
        {t.status === "bloqué" && <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke={statusColor} strokeWidth="2"><path d="M4 4L12 12M12 4L4 12" /></svg>}
      </span>
      <span style={{ flex: 1, fontSize: 13 }}>{t.label}</span>
      {t.blocker && <Badge tone="alert">{t.blocker}</Badge>}
      <Badge>{srcLabel}</Badge>
      <Confidence value={t.conf} />
      <span className="mono" style={{ color: "var(--muted)", minWidth: 50 }}>{t.jh} jh</span>
      <span className="mono" style={{ color: "var(--muted)", minWidth: 54 }}>{t.owner}</span>
      <button className="icon-btn" style={{ width: 24, height: 24 }}><Icon name="pencil" /></button>
    </div>
  );
}

/* ============================================================ PULSE — the novel feature */
function PulsePage() {
  const [focusSh, setFocusSh] = useStateP(null);
  const [range, setRange] = useStateP("14j");

  return (
    <div className="page pulse-page">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 7px", background: "var(--paper-sunk)", borderRadius: 3, border: "1px solid var(--border-soft)" }}>
              <span className="pulse-dot" style={{ background: "var(--green)" }} /> VUE INÉDITE
            </span>
            <span style={{ color: "var(--muted-soft)" }}>·</span>
            <span>ESSENCE DU PROJET · LU PAR PACEMAKER</span>
          </div>
          <h1 className="page-title">Pulse humain</h1>
          <div className="page-sub">Le projet vu par ses acteurs — interactions, satisfactions, bascules, signaux faibles.</div>
        </div>
        <div className="row gap-2">
          <div className="seg">
            {["14j", "Mission", "Kick-off"].map(r => (
              <button key={r} className={"seg-btn" + (range === r ? " active" : "")} onClick={() => setRange(r)}>{r}</button>
            ))}
          </div>
          <button className="btn btn-ghost" data-tip="Comment Pacemaker calcule le pulse"><Icon name="eye" /></button>
        </div>
      </div>

      {/* MOOD — hero card */}
      <MoodHero />

      {/* MAP + FOCUS — side-by-side */}
      <div className="pulse-grid">
        <div className="card pulse-map-card">
          <div className="card-head">
            <Icon name="stakeholders" />
            <span className="card-title">Carte relationnelle</span>
            <span className="mono" style={{ marginLeft: "auto", color: "var(--muted)" }}>taille = influence · couleur = satisfaction · trait = fréquence d'échange</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <StakeholderMap onFocus={setFocusSh} focus={focusSh} />
          </div>
          <div className="pulse-map-legend">
            <LegendDot color="var(--green-deep)" label="Sat. haute · >70" />
            <LegendDot color="var(--amber)" label="Moyenne · 50-70" />
            <LegendDot color="var(--alert)" label="Fragile · <50" />
            <span style={{ color: "var(--muted-soft)" }}>·</span>
            <LegendDot color="var(--ink)" label="Lite Ops" ring />
            <span style={{ marginLeft: "auto" }} className="mono">survoler pour détail</span>
          </div>
        </div>

        <div className="pulse-focus-col">
          <StakeholderCard focus={focusSh} />
          <SignalMix />
        </div>
      </div>

      {/* TIMELINE — unified signals stream with satisfaction overlay */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-head">
          <Icon name="pulse" />
          <span className="card-title">Chronologie des signaux</span>
          <span className="mono" style={{ marginLeft: "auto", color: "var(--muted)" }}>14 derniers jours · 23 événements</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <SignalStream />
        </div>
      </div>

      {/* INSIGHTS — what Pacemaker noticed */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-head">
          <Icon name="sparkle" />
          <span className="card-title">Ce que Pacemaker a remarqué</span>
          <span className="mono" style={{ marginLeft: "auto", color: "var(--muted)" }}>3 signaux qualifiés · basés sur règles apprises</span>
        </div>
        <div className="card-body" style={{ padding: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
          <InsightTile
            tone="alert"
            icon="flag"
            label="Risque sponsor"
            title="Silence de 9 jours côté Benoît Baret"
            body="Aucune interaction tracée depuis le 11/04. Le scope a bougé 2 fois pendant cette absence."
            rule="sponsor_silence + scope_drift = remonter COPIL"
            appliedCount={3}
            action="Caler un 15min"
          />
          <InsightTile
            tone="amber"
            icon="warn"
            label="Friction"
            title="Julien Moreau — tendance baissière"
            body="3 messages négatifs en 7j. Sat. 0.45 ↓. Frustration sur délais R2 et périmètre."
            rule="metier_friction_3_neg = 1-1 court"
            appliedCount={5}
            action="Proposer un point"
          />
          <InsightTile
            tone="green"
            icon="heart"
            label="Opportunité"
            title="Clara Meyer — ambassadrice"
            body="Sat. 0.88 ↑. Historique 100% positif sur 14j. Prête à parler de la mission en interne."
            rule="nps_implicite_elevé = référent"
            appliedCount={2}
            action="Lui demander un quote"
            last
          />
        </div>
      </div>
    </div>
  );
}

function MoodHero() {
  // synthesize project mood: avg weighted sat, trend, top friction, top bright
  const avg = 0.69;
  const trend7 = -0.04;
  return (
    <div className="card mood-hero">
      <div className="mood-hero-body">
        <div className="mood-left">
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>HUMEUR PROJET</div>
          <div className="mood-score-row">
            <div className="mood-gauge">
              <MoodGauge value={avg} />
            </div>
            <div>
              <div className="mood-value">
                {Math.round(avg * 100)}<span className="mood-value-sub">/100</span>
              </div>
              <div className="row gap-2" style={{ marginTop: 6 }}>
                <Badge tone={trend7 < 0 ? "amber" : "green"}>
                  {trend7 < 0 ? "↓" : "↑"} {Math.abs(Math.round(trend7 * 100))} pts / 7j
                </Badge>
                <Badge tone="soft">7 acteurs pondérés</Badge>
              </div>
            </div>
          </div>
          <div className="mood-caption">
            Légère dégradation sur la semaine — tirée par <strong>Julien Moreau</strong> (ECO) et un silence sponsor.
            Compensée par <strong>Clara Meyer</strong> (Prévention) en forte hausse.
          </div>
        </div>

        <div className="mood-mid">
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 8 }}>SIGNAUX — 14J</div>
          <SignalBars />
        </div>

        <div className="mood-right">
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 8 }}>BASCULES DÉTECTÉES</div>
          <div className="stack gap-2">
            <TiltMini date="17/04" label="Bascule scope R6/R7" tone="alert" />
            <TiltMini date="15/04" label="R4 + complexe qu'estimé" tone="amber" />
            <TiltMini date="11/04" label="Retard accès data +2j" tone="amber" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MoodGauge({ value }) {
  // semi-circle gauge 0-100
  const r = 52, cx = 60, cy = 60;
  const start = Math.PI, end = 0;
  const angle = start + (end - start) * value;
  const x = cx + r * Math.cos(angle);
  const y = cy + r * Math.sin(angle);
  const large = 0;
  // background arc path
  const bgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const fgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x} ${y}`;
  const color = value > 0.7 ? "var(--green-deep)" : value >= 0.5 ? "var(--amber)" : "var(--alert)";
  return (
    <svg viewBox="0 0 120 70" width="120" height="70">
      <path d={bgPath} fill="none" stroke="var(--border)" strokeWidth="10" strokeLinecap="round" />
      <path d={fgPath} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      {/* tick marks */}
      {[0, 0.5, 1].map(t => {
        const a = start + (end - start) * t;
        const x1 = cx + (r + 8) * Math.cos(a);
        const y1 = cy + (r + 8) * Math.sin(a);
        const x2 = cx + (r + 2) * Math.cos(a);
        const y2 = cy + (r + 2) * Math.sin(a);
        return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--muted)" strokeWidth="1" />;
      })}
      {/* needle dot */}
      <circle cx={x} cy={y} r="4" fill={color} stroke="var(--paper-elevated)" strokeWidth="2" />
    </svg>
  );
}

function SignalBars() {
  // 14 days: each day has pos/neg/neutral signal counts
  const days = [
    [2, 0, 1], [1, 0, 1], [3, 0, 2], [1, 1, 2], [0, 0, 1], [0, 0, 0], [0, 0, 1], // week 1
    [1, 0, 1], [2, 1, 2], [1, 2, 1], [0, 2, 1], [1, 1, 2], [2, 0, 1], [3, 0, 2], // week 2
  ];
  const max = Math.max(...days.map(d => d[0] + d[1] + d[2]));
  return (
    <div className="signal-bars">
      {days.map((d, i) => {
        const total = d[0] + d[1] + d[2];
        const h = (total / max) * 60;
        return (
          <div key={i} className={"sb-day" + (i === 10 ? " pivot" : "")}>
            <div className="sb-stack" style={{ height: h }}>
              {d[1] > 0 && <span className="sb-neg" style={{ flex: d[1] }} />}
              {d[2] > 0 && <span className="sb-neu" style={{ flex: d[2] }} />}
              {d[0] > 0 && <span className="sb-pos" style={{ flex: d[0] }} />}
            </div>
          </div>
        );
      })}
      <div className="signal-bars-legend">
        <span className="mono"><span className="sb-dot sb-pos" /> pos</span>
        <span className="mono"><span className="sb-dot sb-neu" /> neutre</span>
        <span className="mono"><span className="sb-dot sb-neg" /> neg</span>
        <span style={{ marginLeft: "auto" }} className="mono muted">14j → auj.</span>
      </div>
    </div>
  );
}

function TiltMini({ date, label, tone }) {
  return (
    <div className="tilt-mini">
      <span className={"tilt-mini-dot tone-" + tone} />
      <span className="mono tilt-mini-date">{date}</span>
      <span className="tilt-mini-label">{label}</span>
    </div>
  );
}

function StakeholderCard({ focus }) {
  const sh = focus ? MISSION.stakeholders.find(s => s.id === focus) : MISSION.stakeholders.find(s => s.id === "jm");
  if (!sh) return null;
  const color = sh.sat > 0.7 ? "var(--green-deep)" : sh.sat >= 0.5 ? "var(--amber)" : "var(--alert)";
  const interactions = {
    bb: { count: 3, chans: [["wa", 1], ["email", 2]], note: "Silence 9j — dernier échange poli, positif" },
    nl: { count: 8, chans: [["meet", 3], ["photo", 2], ["email", 3]], note: "Bascule scope en atelier jeudi" },
    pd: { count: 24, chans: [["meet", 8], ["mic", 6], ["wa", 10]], note: "Pilote actif" },
    pb: { count: 14, chans: [["mic", 5], ["meet", 4], ["wa", 5]], note: "Signale R4 + complexe, +0,5jh" },
    ea: { count: 5, chans: [["email", 3], ["meet", 2]], note: "Disponible S4 pour validation IRC" },
    jm: { count: 7, chans: [["wa", 4], ["email", 3]], note: "3 messages négatifs en 7j — frustration délais" },
    cm: { count: 6, chans: [["meet", 3], ["mic", 3]], note: "Atelier R1 positif, ambassadrice" },
  }[sh.id];

  return (
    <div className="card stk-card">
      <div className="stk-card-head">
        <div className="stk-avatar" style={{ background: color }}>
          {sh.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="stk-name">{sh.name}</div>
          <div className="mono" style={{ color: "var(--muted)" }}>{sh.role}</div>
        </div>
        <Badge tone={sh.trend === "up" ? "green" : sh.trend === "down" ? "alert" : "soft"} dot>
          {sh.trend === "up" ? "↑" : sh.trend === "down" ? "↓" : "→"} {sh.trend}
        </Badge>
      </div>

      <div className="stk-card-body">
        <div className="stk-sat-row">
          <span className="mono" style={{ color: "var(--muted)" }}>SATISFACTION</span>
          <span className="stk-sat-val" style={{ color }}>{Math.round(sh.sat * 100)}</span>
        </div>
        <div className="stk-sat-bar">
          <span className="stk-sat-fill" style={{ width: `${sh.sat * 100}%`, background: color }} />
          <span className="stk-sat-tick" style={{ left: "50%" }} />
          <span className="stk-sat-tick" style={{ left: "70%" }} />
        </div>

        <div className="stk-row">
          <span className="mono muted">ÉCHANGES</span>
          <span className="stk-row-val">{interactions.count} · 14j</span>
        </div>
        <div className="stk-chans">
          {interactions.chans.map(([ch, n]) => (
            <span key={ch} className="stk-chan">
              <Icon name={ch === "email" ? "mail" : ch === "meet" ? "calendar" : ch} className="sm" />
              <span className="mono">{n}</span>
            </span>
          ))}
        </div>

        <div className="stk-note">{interactions.note}</div>
        <div className="mono" style={{ color: "var(--muted)", marginTop: 6 }}>Dernier signal : {sh.last}</div>
      </div>
    </div>
  );
}

function SignalMix() {
  const mix = [
    { label: "Positifs", value: 12, color: "var(--green-deep)" },
    { label: "Neutres", value: 18, color: "var(--muted-soft)" },
    { label: "Négatifs", value: 6, color: "var(--alert)" },
    { label: "Bascules", value: 3, color: "var(--amber)" },
  ];
  const total = mix.reduce((s, m) => s + m.value, 0);
  return (
    <div className="card sig-mix">
      <div className="card-head">
        <Icon name="pulse" />
        <span className="card-title">Nature des signaux</span>
        <span className="mono" style={{ marginLeft: "auto", color: "var(--muted)" }}>{total} · 14j</span>
      </div>
      <div className="card-body">
        <div className="sig-bar">
          {mix.map((m, i) => (
            <span key={m.label} className="sig-seg" style={{ flex: m.value, background: m.color }} data-tip={m.label + " · " + m.value} />
          ))}
        </div>
        <div className="sig-legend">
          {mix.map(m => (
            <div key={m.label} className="sig-legend-item">
              <span className="sig-legend-dot" style={{ background: m.color }} />
              <span className="sig-legend-label">{m.label}</span>
              <span className="mono sig-legend-val">{m.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SignalStream() {
  // Unified chronological stream: signals + tilts, with lanes
  const events = [
    { day: "ven 17:55", who: "Paul D.", actor: "pd", kind: "pos", icon: "mic", src: "Plaud", label: "Retour Clara Meyer positif · “on a enfin une vue claire”", meta: ["sat Clara +0.12"] },
    { day: "jeu 17:40", who: "Nathalie L.", actor: "nl", kind: "tilt", icon: "camera", src: "Photo", label: "Paperboard — R6/R7 réintégrés au périmètre", meta: ["Décision S1 contredite", "Incohérence i1"], tone: "alert", pivot: true },
    { day: "jeu 11:24", who: "Julien M.", actor: "jm", kind: "neg", icon: "wa", src: "WhatsApp", label: "« Est-ce qu'on peut avoir un onglet benchmark ? »", meta: ["scope_drift", "sat Julien -0.05"] },
    { day: "mer 14:10", who: "Paul D.", actor: "pd", kind: "neu", icon: "calendar", src: "Agenda", label: "Atelier R1 — Clara Meyer · 2h30", meta: ["6 actions", "1 décision"] },
    { day: "mar 15:02", who: "Paul B.", actor: "pb", kind: "tilt", icon: "mic", src: "Plaud", label: "R4 modèle sémantique incomplet — 3 mesures DAX manquantes", meta: ["Recalibration S5 +0,5jh"], tone: "amber" },
    { day: "mar 10:00", who: "Paul D.", actor: "pd", kind: "neu", icon: "doc", src: "Upload", label: "atelier-r1-validation.docx indexé", meta: ["2 décisions", "5 tâches"] },
    { day: "lun 09:30", who: "Benoît B.", actor: "bb", kind: "pos", icon: "mail", src: "Email", label: "« Parfait, vivement la première démo »", meta: ["sat Benoît +0.02"], faded: true },
    { day: "ven 11/04", who: "Paul D.", actor: "pd", kind: "tilt", icon: "clock", src: "Système", label: "Retard accès data confirmé — +2j cascade plan", meta: ["S1→S7 décalées"], tone: "amber", last: true },
  ];

  return (
    <div className="sig-stream">
      <div className="sig-stream-head">
        <span>QUAND</span>
        <span>QUI</span>
        <span>SIGNAL</span>
        <span>IMPACT</span>
      </div>
      {events.map((e, i) => {
        const kindColor = e.tone === "alert" ? "var(--alert)" : e.tone === "amber" ? "var(--amber)" : e.kind === "pos" ? "var(--green-deep)" : e.kind === "neg" ? "var(--alert)" : "var(--muted-soft)";
        return (
          <div key={i} className={"sig-row" + (e.pivot ? " pivot" : "") + (e.last ? " last" : "") + (e.faded ? " faded" : "")}>
            <div className="sig-row-rail">
              <span className="sig-row-dot" style={{ background: kindColor }} />
            </div>
            <div className="sig-row-time">
              <span className="mono">{e.day}</span>
              <span className="mono sig-row-src">{e.src}</span>
            </div>
            <div className="sig-row-who">
              <span className="sig-mini-avatar">{e.who.split(" ").map(n => n[0]).slice(0, 2).join("")}</span>
              <span>{e.who}</span>
            </div>
            <div className="sig-row-body">
              <div className="sig-row-label">{e.label}</div>
              {e.pivot && <div className="sig-row-pivot-tag">BASCULE</div>}
            </div>
            <div className="sig-row-meta">
              {e.meta.map((m, j) => <span key={j} className="sig-chip">{m}</span>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InsightTile({ tone, icon, label, title, body, rule, appliedCount, action, last }) {
  const color = tone === "alert" ? "var(--alert)" : tone === "amber" ? "var(--amber)" : "var(--green-deep)";
  return (
    <div className={"insight-tile" + (last ? " last" : "")}>
      <div className="insight-tile-head">
        <span className="insight-tile-icon" style={{ background: color + "18", color }}>
          <Icon name={icon} />
        </span>
        <span className="mono insight-tile-label" style={{ color }}>{label}</span>
      </div>
      <div className="insight-tile-title">{title}</div>
      <div className="insight-tile-body">{body}</div>
      <div className="insight-tile-rule">
        <Icon name="sparkle" className="sm" />
        <span className="mono">{rule}</span>
        <span className="mono insight-tile-rule-count">×{appliedCount}</span>
      </div>
      <button className="btn btn-primary insight-tile-action">{action}</button>
    </div>
  );
}

function StakeholderMap({ onFocus, focus }) {
  // Orbital layout: team at center, stakeholders radiating out, positioned by role
  // Sponsor/co-sponsor top, business stakeholders bottom, referents side
  const positions = {
    bb: { x: 50, y: 18, r: 30, ring: 1, role: "SPONSOR" },
    nl: { x: 75, y: 28, r: 26, ring: 1, role: "CO-SPONSOR" },
    cm: { x: 22, y: 38, r: 24, ring: 2, role: "MÉTIER" },
    ea: { x: 85, y: 58, r: 20, ring: 2, role: "RÉFÉRENT" },
    jm: { x: 72, y: 82, r: 24, ring: 2, role: "MÉTIER" },
    pd: { x: 45, y: 58, r: 30, team: true },
    pb: { x: 32, y: 75, r: 24, team: true },
  };
  const links = [
    ["pd", "bb", 0.4, false, "3 éch."],
    ["pd", "nl", 0.9, false, "8 éch."],
    ["pd", "cm", 0.7, false, "6 éch."],
    ["pd", "pb", 1.0, true, "14 éch."],
    ["pb", "jm", 0.3, false, "2 éch."],
    ["pd", "ea", 0.5, false, "5 éch."],
    ["pb", "ea", 0.4, false, "4 éch."],
    ["nl", "bb", 0.6, false, "5 éch."],
    ["pd", "jm", 0.3, false, "3 éch."],
  ];
  const colorFor = (sh) => sh.sat > 0.7 ? "var(--green-deep)" : sh.sat >= 0.5 ? "var(--amber)" : "var(--alert)";

  return (
    <div className="stk-map">
      {/* faint concentric rings */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="stk-map-bg">
        <circle cx="45" cy="58" r="30" fill="none" stroke="var(--border)" strokeDasharray="0.4 1" strokeWidth="0.2" />
        <circle cx="45" cy="58" r="52" fill="none" stroke="var(--border)" strokeDasharray="0.4 1" strokeWidth="0.2" />
      </svg>

      {/* links layer */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="stk-map-links">
        {links.map(([a, b, w, team, label], i) => {
          const pa = positions[a], pb = positions[b];
          const active = focus === a || focus === b;
          return (
            <g key={i}>
              <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                stroke={team ? "var(--ink)" : focus && !active ? "var(--muted-soft)" : "var(--muted)"}
                strokeWidth={w * 0.7}
                strokeDasharray={team ? "none" : w < 0.5 ? "0.8 1.2" : "none"}
                opacity={team ? 0.85 : active ? 0.9 : focus ? 0.15 : 0.3 + w * 0.2} />
            </g>
          );
        })}
      </svg>

      {/* nodes */}
      {MISSION.stakeholders.map((sh) => {
        const p = positions[sh.id]; if (!p) return null;
        const color = colorFor(sh);
        const isFocus = focus === sh.id;
        const dim = focus && !isFocus;
        return (
          <div key={sh.id}
            className={"stk-node" + (p.team ? " is-team" : "") + (isFocus ? " is-focus" : "") + (dim ? " is-dim" : "")}
            onMouseEnter={() => onFocus && onFocus(sh.id)}
            onMouseLeave={() => onFocus && onFocus(null)}
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.r * 2, height: p.r * 2 }}>
            <div className="stk-node-bubble" style={{ background: color, borderColor: p.team ? "var(--ink)" : "rgba(0,0,0,0.08)" }}>
              {sh.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </div>
            <div className="stk-node-label">
              <div className="stk-node-name">{sh.name}</div>
              {p.role && <div className="mono stk-node-role">{p.role}</div>}
              {p.team && <div className="mono stk-node-role" style={{ color: "var(--ink)" }}>LITE OPS</div>}
            </div>
            {sh.trend === "up" && <span className="stk-node-trend up">↑</span>}
            {sh.trend === "down" && <span className="stk-node-trend down">↓</span>}
          </div>
        );
      })}
    </div>
  );
}

function SatisfactionChart() {
  // Synthetic per-stakeholder time series, 14 points
  const series = [
    { id: "bb", color: "var(--sky)", label: "Benoît", data: [0.8, 0.82, 0.78, 0.78, 0.76, 0.74, 0.7, 0.72, 0.72, 0.74, 0.76, 0.78, 0.78, 0.78] },
    { id: "nl", color: "var(--violet)", label: "Nathalie", data: [0.75, 0.72, 0.7, 0.68, 0.65, 0.62, 0.58, 0.55, 0.55, 0.6, 0.62, 0.58, 0.56, 0.58] },
    { id: "cm", color: "var(--green-deep)", label: "Clara", data: [0.7, 0.72, 0.75, 0.78, 0.8, 0.82, 0.85, 0.85, 0.86, 0.86, 0.88, 0.88, 0.88, 0.88] },
    { id: "jm", color: "var(--alert)", label: "Julien", data: [0.7, 0.68, 0.65, 0.6, 0.55, 0.5, 0.48, 0.45, 0.45, 0.45, 0.45, 0.45, 0.45, 0.45] },
  ];
  const w = 700, h = 200, pad = 24;
  const xStep = (w - pad * 2) / 13;
  const y = (v) => h - pad - v * (h - pad * 2);

  return (
    <div style={{ padding: 16 }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
        {/* bands */}
        {[[0.7, 1, "rgba(165,217,0,0.05)"], [0.5, 0.7, "rgba(196,135,46,0.05)"], [0, 0.5, "rgba(217,91,47,0.05)"]].map(([lo, hi, c], i) => (
          <rect key={i} x={pad} y={y(hi)} width={w - pad * 2} height={y(lo) - y(hi)} fill={c} />
        ))}
        {/* grid */}
        {[0.25, 0.5, 0.75, 1].map((v) => (
          <line key={v} x1={pad} y1={y(v)} x2={w - pad} y2={y(v)} stroke="var(--border)" strokeDasharray="2 3" />
        ))}
        {/* pivot line */}
        <line x1={pad + xStep * 7} y1={pad} x2={pad + xStep * 7} y2={h - pad} stroke="var(--amber)" strokeWidth="1.5" strokeDasharray="3 3" />
        <text x={pad + xStep * 7 + 5} y={pad + 8} fontFamily="var(--mono)" fontSize="9" fill="var(--amber)">BASCULE — 17/04</text>

        {series.map((s) => (
          <g key={s.id}>
            <path
              d={s.data.map((v, i) => `${i === 0 ? "M" : "L"}${pad + i * xStep},${y(v)}`).join(" ")}
              fill="none" stroke={s.color} strokeWidth="2" />
            <circle cx={pad + 13 * xStep} cy={y(s.data[13])} r="3" fill={s.color} />
            <text x={pad + 13 * xStep + 8} y={y(s.data[13]) + 3} fontFamily="var(--mono)" fontSize="10" fill={s.color}>{s.label}</text>
          </g>
        ))}

        {/* axis */}
        <text x={4} y={y(0.75) + 3} fontFamily="var(--mono)" fontSize="9" fill="var(--muted)">75%</text>
        <text x={4} y={y(0.5) + 3} fontFamily="var(--mono)" fontSize="9" fill="var(--muted)">50%</text>
        <text x={4} y={y(0.25) + 3} fontFamily="var(--mono)" fontSize="9" fill="var(--muted)">25%</text>
        <text x={pad} y={h - 6} fontFamily="var(--mono)" fontSize="9" fill="var(--muted)">07/04</text>
        <text x={w - pad - 24} y={h - 6} fontFamily="var(--mono)" fontSize="9" fill="var(--muted)">AUJ</text>
      </svg>
    </div>
  );
}

function TiltTimeline() {
  const tilts = [
    { when: "J+4 · 11/04", label: "Retard accès data", detail: "Décalage +2j — cascade full-plan.", tone: "amber", impact: ["S1→S7 décalées"], src: "Event recalage" },
    { when: "J+8 · 15/04", label: "R4 plus complexe qu'estimé", detail: "Vocal Paul B. contredit cartographie initiale.", tone: "amber", impact: ["+0,5jh S5", "r1 ↑"], src: "Vocal · 4m12" },
    { when: "J+10 · 17/04", label: "Bascule scope R6/R7", detail: "Nathalie rouvre R6/R7 en atelier. Sponsor non présent.", tone: "alert", impact: ["Décision S1 contredite", "Incohérence i1"], src: "Photo paperboard" },
    { when: "J+11 · 18/04", label: "Demande scope_drift ECO", detail: "Julien Moreau demande onglet benchmark R2 hors cadrage.", tone: "amber", impact: ["Incohérence i3"], src: "WA" },
  ];
  return (
    <div style={{ position: "relative", padding: "20px 16px" }}>
      <div style={{ position: "absolute", left: 60, top: 20, bottom: 20, width: 2, background: "var(--border)" }} />
      <div className="stack gap-3">
        {tilts.map((t, i) => (
          <div key={i} className="row" style={{ gap: 16, alignItems: "flex-start", position: "relative" }}>
            <div style={{ width: 60, flexShrink: 0 }} className="mono">{t.when}</div>
            <span style={{
              position: "absolute", left: 55, top: 4, width: 12, height: 12,
              borderRadius: "50%", background: t.tone === "alert" ? "var(--alert)" : "var(--amber)",
              border: "3px solid var(--paper-elevated)", boxShadow: "0 0 0 1px var(--border)",
            }} />
            <div style={{ flex: 1, marginLeft: 18 }}>
              <div className="row" style={{ gap: 8 }}>
                <span style={{ fontWeight: 500, fontSize: 13.5 }}>{t.label}</span>
                <Badge tone={t.tone === "alert" ? "alert" : "amber"}>{t.tone === "alert" ? "major" : "moderate"}</Badge>
              </div>
              <div className="dim" style={{ fontSize: 12.5, marginTop: 3 }}>{t.detail}</div>
              <div className="row" style={{ marginTop: 6, gap: 6, flexWrap: "wrap" }}>
                {t.impact.map((imp, j) => <Badge key={j} tone="soft">{imp}</Badge>)}
                <span className="mono" style={{ marginLeft: "auto", color: "var(--muted)" }}>source: {t.src}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LegendDot({ color, label, ring }) {
  return (
    <span className="row" style={{ gap: 6, fontSize: 11, color: "var(--ink-dim)" }}>
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, border: ring ? "2px solid var(--ink)" : "none", boxSizing: "border-box" }} />
      {label}
    </span>
  );
}

function PairRow({ a, b, count, trend, last, alert, last2 }) {
  return (
    <div className="row" style={{ padding: "11px 16px", borderBottom: last2 ? "none" : "1px solid var(--border-soft)", gap: 10 }}>
      <div style={{ width: 4, height: 22, background: alert ? "var(--alert)" : "var(--border)", borderRadius: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13 }}>{a} <span className="muted" style={{ margin: "0 5px" }}>↔</span> {b}</div>
        <div className="mono" style={{ color: "var(--muted)", marginTop: 2 }}>{last}</div>
      </div>
      <span className="mono" style={{ color: "var(--muted)" }}>{count} échanges</span>
      <Badge tone={trend === "up" ? "green" : trend === "down" ? "alert" : ""}>{trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}</Badge>
    </div>
  );
}

function InsightCard({ tone, title, body, cite }) {
  const borderColor = tone === "alert" ? "rgba(217,91,47,0.35)" : tone === "amber" ? "rgba(196,135,46,0.35)" : "rgba(165,217,0,0.4)";
  const bg = tone === "alert" ? "rgba(217,91,47,0.04)" : tone === "amber" ? "rgba(196,135,46,0.04)" : "rgba(165,217,0,0.06)";
  return (
    <div style={{ padding: "10px 12px", border: `1px solid ${borderColor}`, background: bg, borderRadius: 9 }}>
      <div className="row" style={{ gap: 8 }}>
        <Badge tone={tone}>{tone === "alert" ? "attention" : tone === "amber" ? "à surveiller" : "opportunité"}</Badge>
        <span style={{ fontWeight: 500, fontSize: 13 }}>{title}</span>
      </div>
      <div className="dim" style={{ fontSize: 12.5, marginTop: 5 }}>{body}</div>
      <div className="mono" style={{ color: "var(--muted)", marginTop: 6 }}>{cite}</div>
    </div>
  );
}

function LegendDot({ color, label, ring }) {
  return (
    <span className="row" style={{ gap: 6, fontSize: 11, color: "var(--ink-dim)" }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, border: ring ? "2px solid var(--ink)" : "none", boxSizing: "border-box" }} />
      {label}
    </span>
  );
}

Object.assign(window, { BriefingPage, PlanPage, PulsePage });
