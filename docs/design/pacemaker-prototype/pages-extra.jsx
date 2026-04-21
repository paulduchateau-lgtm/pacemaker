// Secondary pages: Decisions · Incohérences · Livrables · Sources · Inbox · Reports
const { useState: useStateS } = React;

/* =========================================================
   DÉCISIONS — Journal chronologique type Linear/Confluence
   Timeline verticale avec rail + décision-cards riches
   ========================================================= */
function DecisionsPage() {
  const [filter, setFilter] = useStateS("all");
  const counts = {
    all: DECISIONS.length,
    acted: DECISIONS.filter(d => d.status === "actée").length,
    proposed: DECISIONS.filter(d => d.status === "proposée").length,
    contradicted: 1, // i1 contradicts d1
  };

  const filtered = DECISIONS.filter(d => {
    if (filter === "acted") return d.status === "actée";
    if (filter === "proposed") return d.status === "proposée";
    if (filter === "contradicted") return d.id === "d1";
    return true;
  });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>Journal traçable · chaque décision a une source</div>
          <h1 className="page-title">Décisions</h1>
          <div className="page-sub">Ce qui a été décidé, par qui, pourquoi, sur quelles sources. Pacemaker détecte les contradictions.</div>
        </div>
        <div className="row gap-2">
          <button className="btn btn-ghost"><Icon name="filter" /> Filtrer</button>
          <button className="btn btn-ghost"><Icon name="download" /> Exporter</button>
          <button className="btn btn-primary"><Icon name="plus" /> Nouvelle décision</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="tabs" style={{ marginBottom: 28 }}>
        <div className={"tab" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>Toutes<span className="count">{counts.all}</span></div>
        <div className={"tab" + (filter === "acted" ? " active" : "")} onClick={() => setFilter("acted")}>Actées<span className="count">{counts.acted}</span></div>
        <div className={"tab" + (filter === "proposed" ? " active" : "")} onClick={() => setFilter("proposed")}>Proposées<span className="count">{counts.proposed}</span></div>
        <div className={"tab alert" + (filter === "contradicted" ? " active" : "")} onClick={() => setFilter("contradicted")}>Contredites<span className="count">{counts.contradicted}</span></div>
      </div>

      {/* Timeline */}
      <div className="dec-timeline">
        {filtered.map((d, i) => (
          <DecisionNode key={d.id} d={d} idx={i} last={i === filtered.length - 1} contradicted={d.id === "d1"} />
        ))}
      </div>
    </div>
  );
}

function DecisionNode({ d, idx, last, contradicted }) {
  const [open, setOpen] = useStateS(idx === 0);
  const statusTone = d.status === "actée" ? "green" : d.status === "proposée" ? "amber" : "";
  const dateParts = d.date.split("-");
  const day = dateParts[2], month = ["jan","fév","mar","avr","mai","juin","juil","août","sep","oct","nov","déc"][parseInt(dateParts[1])-1];

  return (
    <div className="dec-node">
      <div className="dec-rail">
        <div className="dec-dot" data-contradicted={contradicted}>
          {contradicted ? <Icon name="incoh" /> : <Icon name="check" />}
        </div>
        {!last && <div className="dec-line" />}
      </div>

      <div className="dec-card">
        <div className="dec-date-col">
          <div className="dec-day">{day}</div>
          <div className="dec-month mono">{month}</div>
        </div>

        <div className="dec-main">
          <div className="row" style={{ marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
            <span className="mono" style={{ color: "var(--muted)", fontSize: 10.5 }}>{d.id.toUpperCase()}</span>
            <Badge tone={statusTone} dot={d.status === "proposée"}>{d.status}</Badge>
            {contradicted && <Badge tone="alert" dot>contredite par i1</Badge>}
            <Confidence value={d.conf} note={d.confNote} />
            <span style={{ marginLeft: "auto" }} className="mono muted">par {d.author}</span>
          </div>

          <h3 className="dec-title">{d.statement}</h3>

          {!open && (
            <div className="dec-collapsed">
              <span className="mono muted">Source:</span>
              <span style={{ fontSize: 12.5, color: "var(--ink-dim)" }}>{d.source}</span>
              <button className="btn-link" onClick={() => setOpen(true)} style={{ marginLeft: "auto", fontSize: 12.5 }}>
                Développer <Icon name="chev" />
              </button>
            </div>
          )}

          {open && (
            <div className="dec-expanded">
              <div className="dec-section">
                <div className="dec-section-label"><Icon name="sparkle" /> Pourquoi</div>
                <div className="dec-section-body">{d.rationale}</div>
              </div>

              {d.alternatives && d.alternatives.length > 0 && (
                <div className="dec-section">
                  <div className="dec-section-label"><Icon name="branch" /> Alternatives écartées</div>
                  <div className="dec-section-body">
                    {d.alternatives.map((a, i) => (
                      <div key={i} className="dec-alt">
                        <span className="dec-alt-mark">—</span>
                        <span>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {d.impactsOn && (
                <div className="dec-section">
                  <div className="dec-section-label"><Icon name="link" /> Impacts</div>
                  <div className="dec-section-body">
                    <div className="row gap-2" style={{ flexWrap: "wrap" }}>
                      {d.impactsOn.map((im, i) => <Badge key={i} tone="soft">{im}</Badge>)}
                    </div>
                  </div>
                </div>
              )}

              <div className="dec-section">
                <div className="dec-section-label"><Icon name="scroll" /> Source vérifiable</div>
                <div className="dec-section-body">
                  <div className="dec-source-chip">
                    <Icon name="doc" />
                    <span style={{ fontSize: 12.5 }}>{d.source}</span>
                    <button className="btn-link" style={{ marginLeft: "auto", fontSize: 11.5 }}>Ouvrir <Icon name="link" /></button>
                  </div>
                </div>
              </div>

              {contradicted && (
                <div className="dec-contradiction">
                  <Icon name="incoh" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 3 }}>Contradiction détectée — i1</div>
                    <div style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.45 }}>
                      Nathalie a rouvert R6/R7 en atelier le 17/04. Un arbitrage avec le sponsor Benoît Baret est nécessaire avant S4.
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{ flexShrink: 0 }}>Arbitrer</button>
                </div>
              )}

              <div className="row gap-2" style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border-soft)" }}>
                <button className="btn btn-ghost"><Icon name="pencil" /> Enrichir</button>
                <button className="btn btn-ghost"><Icon name="link" /> Lier</button>
                <button className="btn-link" onClick={() => setOpen(false)} style={{ marginLeft: "auto", fontSize: 12.5 }}>
                  Replier
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* INCOHERENCES — unchanged but keep */
function IncohPage() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>Qualité · signaux faibles</div>
          <h1 className="page-title">Incohérences détectées</h1>
          <div className="page-sub">Tensions entre ce que Pacemaker lit des sources. Chaque item réclame un arbitrage humain.</div>
        </div>
      </div>

      <div className="kpi-row" style={{ marginBottom: 14 }}>
        <Kpi label="Ouvertes" value="3" sub="1 majeure" tone="alert" />
        <Kpi label="Arbitrées · 14j" value="7" sub="2 par auto-règle" spark={[2,2,3,3,3,4,4,5,5,6,6,7,7,7]} />
        <Kpi label="Temps moyen" value="2,1j" sub="entre détection & arbitrage" />
        <Kpi label="Scope drift" value="43%" sub="des incohérences" tone="amber" />
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {INCOHERENCES.map((inc, i) => <IncohRow key={inc.id} inc={inc} last={i === INCOHERENCES.length - 1} />)}
        </div>
      </div>
    </div>
  );
}

function IncohRow({ inc, last }) {
  const tone = inc.severity === "major" ? "alert" : inc.severity === "moderate" ? "amber" : "";
  return (
    <div style={{ padding: "14px 16px", borderBottom: last ? "none" : "1px solid var(--border-soft)" }}>
      <div className="row" style={{ gap: 8, marginBottom: 6 }}>
        <span className="mono" style={{ color: "var(--muted)" }}>{inc.id}</span>
        <Badge tone={tone} dot>{inc.severity}</Badge>
        <Badge tone="soft">{inc.kind}</Badge>
        <span className="mono" style={{ marginLeft: "auto", color: "var(--muted)" }}>{inc.when}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>{inc.description}</div>
      <div className="row" style={{ gap: 8, padding: "8px 10px", background: "var(--accent)", border: "1px solid var(--accent-line)", borderRadius: 6, fontSize: 12.5 }}>
        <Icon name="sparkle" />
        <span className="mono" style={{ color: "var(--muted)" }}>Reco Pacemaker</span>
        <span style={{ flex: 1 }}>{inc.proposal}</span>
      </div>
      <div className="row" style={{ gap: 8, marginTop: 10 }}>
        <button className="btn btn-primary">Arbitrer</button>
        <button className="btn btn-ghost">Enseigner la règle</button>
      </div>
    </div>
  );
}

/* =========================================================
   LIVRABLES — Deux vues : grille de documents + éditeur preview
   Style Confluence / Notion / Linear docs
   ========================================================= */
function LivrablesPage() {
  const [openId, setOpenId] = useStateS("l6"); // Rapport R1 en cours = par défaut
  const [tab, setTab] = useStateS("all");

  const filtered = LIVRABLES.filter(l => {
    if (tab === "drafts") return l.status === "en cours";
    if (tab === "review") return l.status === "livré";
    if (tab === "sent") return l.status === "validé";
    if (tab === "planned") return l.status === "planifié";
    return true;
  });

  const openLivrable = openId ? LIVRABLES.find(l => l.id === openId) : null;

  return (
    <div className="page liv-page">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>Génération assistée · humain en boucle</div>
          <h1 className="page-title">Livrables</h1>
          <div className="page-sub">Pré-structurés par Pacemaker, finalisés par toi. Chaque paragraphe cite sa source.</div>
        </div>
        <div className="row gap-2">
          <button className="btn btn-ghost"><Icon name="download" /> Exporter tout</button>
          <button className="btn btn-accent"><Icon name="sparkle" /> Nouveau livrable</button>
        </div>
      </div>

      <div className="tabs">
        <div className={"tab" + (tab === "all" ? " active" : "")} onClick={() => setTab("all")}>Tous<span className="count">{LIVRABLES.length}</span></div>
        <div className={"tab" + (tab === "drafts" ? " active" : "")} onClick={() => setTab("drafts")}>En cours<span className="count">{LIVRABLES.filter(l => l.status === "en cours").length}</span></div>
        <div className={"tab" + (tab === "review" ? " active" : "")} onClick={() => setTab("review")}>Livrés<span className="count">{LIVRABLES.filter(l => l.status === "livré").length}</span></div>
        <div className={"tab" + (tab === "sent" ? " active" : "")} onClick={() => setTab("sent")}>Validés<span className="count">{LIVRABLES.filter(l => l.status === "validé").length}</span></div>
        <div className={"tab" + (tab === "planned" ? " active" : "")} onClick={() => setTab("planned")}>Planifiés<span className="count">{LIVRABLES.filter(l => l.status === "planifié").length}</span></div>
      </div>

      <div className="liv-layout">
        {/* List column */}
        <div className="liv-list">
          {filtered.map(l => (
            <LivrableCard key={l.id} l={l} active={l.id === openId} onClick={() => setOpenId(l.id)} />
          ))}
        </div>

        {/* Editor preview column */}
        <div className="liv-editor">
          {openLivrable ? <LivrableEditor l={openLivrable} /> : (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
              Sélectionne un livrable pour le prévisualiser.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LivrableCard({ l, active, onClick }) {
  const toneMap = { "en cours": "amber", "livré": "", "validé": "green", "planifié": "soft" };
  const progress = l.status === "validé" ? 100 : l.status === "livré" ? 90 : l.status === "en cours" ? 45 : 0;
  const fmtColor = { PBIX: "#F2C811", XLSX: "#217346", DOCX: "#2B579A", PPTX: "#D24726", PDF: "#E74C3C" };

  return (
    <div className={"liv-card" + (active ? " active" : "")} onClick={onClick}>
      <div className="liv-card-top">
        <div className="liv-fmt" style={{ "--fmt": fmtColor[l.fmt] || "var(--ink)" }}>
          <span>{l.fmt}</span>
        </div>
        <div className="liv-card-body">
          <div className="row" style={{ marginBottom: 4 }}>
            <span className="mono muted">L{l.id.slice(1)} · S{l.week}</span>
            <Badge tone={toneMap[l.status]} dot={l.status === "en cours"} style={{ marginLeft: "auto" }}>{l.status}</Badge>
          </div>
          <div className="liv-card-title">{l.label}</div>
          {l.delivered && (
            <div className="mono muted" style={{ marginTop: 3, fontSize: 10.5 }}>livré {l.delivered}</div>
          )}
        </div>
      </div>
      <div className="progress" style={{ marginTop: 10 }}>
        <span style={{ width: progress + "%", background: progress === 100 ? "var(--green-deep)" : progress > 0 ? "var(--ink)" : "var(--border)" }} />
      </div>
    </div>
  );
}

function LivrableEditor({ l }) {
  const isR1 = l.id === "l6";
  const isValidated = l.status === "validé" || l.status === "livré";

  // Simulated document content with citation chips
  const doc = isR1 ? {
    title: "Rapport R1 — Événements d'action sociale",
    subtitle: "Maquettage fonctionnel et spécifications techniques",
    version: "Brouillon v0.3",
    author: "Paul D. · co-rédigé avec Pacemaker",
    genRatio: "62% agent · 38% humain",
    sections: [
      { h: "Contexte", b: "Premier rapport du lot 1 priorisé au kick-off. Périmètre : événements d'action sociale organisés par les caisses IRC, segmentés par caisse, type d'événement, et période. Consommateurs cibles : équipe DAS pilotage (Nathalie Lazardeux) et Direction (Benoît Baret).", cites: ["d1", "s1"] },
      { h: "Besoins métier consolidés", b: "Suite à l'atelier validation du 14/04 avec Clara Meyer, cinq besoins prioritaires ont été identifiés : volume d'événements par trimestre, taux de participation, répartition géographique, budget engagé vs consommé, et suivi des objectifs 2026.", cites: ["s2", "s3"], edited: true },
      { h: "Modèle sémantique", b: "Reconstruction complète décidée le 14/04 — l'existant présentait 30% de couverture avec incohérences de nommage. Nouveau modèle en étoile : 3 tables de dimensions (Caisse, Événement, Temps) et 1 table de faits (Participations).", cites: ["d2"], ai: true },
      { h: "Mesures DAX", b: "Sept mesures principales à implémenter [liste détaillée en annexe]. Attention particulière au calcul du taux de participation qui dépend d'une dénominateur variable selon le type d'événement.", cites: [], todo: true },
    ]
  } : {
    title: l.label,
    subtitle: "Document " + l.fmt,
    version: l.status,
    author: "Paul D.",
    genRatio: "—",
    sections: [
      { h: "Aperçu", b: "Document " + l.status + " pour la semaine S" + l.week + ". Ouvrez le fichier original pour consulter le contenu complet.", cites: [] }
    ]
  };

  return (
    <div className="liv-doc">
      <div className="liv-doc-head">
        <div className="liv-doc-meta">
          <span className="mono muted">{l.fmt} · {l.id.toUpperCase()} · S{l.week}</span>
          {isR1 && <Badge tone="amber" dot>{doc.version}</Badge>}
          {isValidated && <Badge tone="green" icon="check">validé</Badge>}
        </div>
        <div className="row gap-2">
          <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: "4px 8px" }}><Icon name="eye" /> Aperçu</button>
          <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: "4px 8px" }}><Icon name="download" /> Télécharger</button>
          <button className="btn btn-primary" style={{ fontSize: 11.5, padding: "4px 8px" }}>Ouvrir</button>
        </div>
      </div>

      {/* AI banner */}
      {isR1 && (
        <div className="liv-ai-banner">
          <Icon name="sparkle" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>Co-rédigé avec Pacemaker</div>
            <div className="mono muted" style={{ marginTop: 2 }}>{doc.genRatio} · 3 sources citées · dernière synchro il y a 12min</div>
          </div>
          <button className="btn-link" style={{ fontSize: 11.5 }}>Voir le diff</button>
        </div>
      )}

      {/* Document */}
      <div className="liv-doc-body">
        <h1 className="liv-doc-title">{doc.title}</h1>
        <div className="liv-doc-subtitle">{doc.subtitle}</div>
        <div className="liv-doc-authorline mono">{doc.author}</div>

        {doc.sections.map((s, i) => (
          <div key={i} className="liv-doc-section">
            <h2 className="liv-doc-h2">
              {s.h}
              {s.ai && <span className="liv-section-badge ai"><Icon name="sparkle" /> généré</span>}
              {s.edited && <span className="liv-section-badge edit"><Icon name="pencil" /> édité</span>}
              {s.todo && <span className="liv-section-badge todo">à compléter</span>}
            </h2>
            <p className="liv-doc-p">
              {s.b}
              {s.cites.map((c, j) => (
                <span key={j} className="liv-cite" data-tip={`Source: ${c}`}>{c}</span>
              ))}
            </p>
          </div>
        ))}

        {isR1 && (
          <div className="liv-doc-section">
            <h2 className="liv-doc-h2">
              Annexes
              <span className="liv-section-badge todo">à compléter</span>
            </h2>
            <div className="liv-placeholder">
              <Icon name="plus" />
              <span>Ajouter l'annexe DAX · Pacemaker peut pré-remplir depuis le vocal Paul B. du 15/04</span>
            </div>
          </div>
        )}
      </div>

      {/* Editor footer */}
      {isR1 && (
        <div className="liv-doc-foot">
          <div className="row gap-2">
            <button className="btn btn-ghost"><Icon name="sparkle" /> Générer section</button>
            <button className="btn btn-ghost"><Icon name="pencil" /> Mode édition</button>
          </div>
          <div className="row gap-2" style={{ marginLeft: "auto" }}>
            <span className="mono muted">sauvegardé à l'instant</span>
            <button className="btn btn-primary"><Icon name="send" /> Envoyer en revue</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SOURCES — Index RAG avec visualisation de traçabilité
   Style Linear + Confluence pages
   ========================================================= */
function SourcesPage() {
  const [openId, setOpenId] = useStateS("s5"); // Cartographie (stale) = par défaut
  const [kindFilter, setKindFilter] = useStateS("all");

  const kindCounts = {
    all: SOURCES.length,
    doc: SOURCES.filter(s => s.kind === "doc").length,
    vocal: SOURCES.filter(s => s.kind === "vocal").length,
    photo: SOURCES.filter(s => s.kind === "photo").length,
    whatsapp: SOURCES.filter(s => s.kind === "whatsapp").length,
    ctx: SOURCES.filter(s => s.kind === "ctx").length,
  };

  const filtered = SOURCES.filter(s => kindFilter === "all" || s.kind === kindFilter);
  const openSource = openId ? SOURCES.find(s => s.id === openId) : null;

  return (
    <div className="page src-page">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>Index RAG · traçabilité · fraîcheur</div>
          <h1 className="page-title">Sources & inputs</h1>
          <div className="page-sub">Tout ce qui nourrit Pacemaker est tracé, horodaté, évalué pour sa fraîcheur et sa cohérence.</div>
        </div>
        <div className="row gap-2">
          <button className="btn btn-ghost"><Icon name="diff" /> Trace prompt</button>
          <button className="btn btn-accent"><Icon name="upload" /> Ajouter source</button>
        </div>
      </div>

      {/* RAG Stats strip */}
      <div className="src-stats">
        <div className="src-stat">
          <div className="src-stat-icon"><Icon name="database" /></div>
          <div>
            <div className="src-stat-value">{SOURCES.length}</div>
            <div className="src-stat-label">sources indexées</div>
          </div>
        </div>
        <div className="src-stat">
          <div className="src-stat-icon"><Icon name="sparkle" /></div>
          <div>
            <div className="src-stat-value">2 450</div>
            <div className="src-stat-label">chunks RAG · 4.95k tok</div>
          </div>
        </div>
        <div className="src-stat tone-green">
          <div className="src-stat-icon"><Icon name="clock" /></div>
          <div>
            <div className="src-stat-value">92%</div>
            <div className="src-stat-label">fraîcheur {"<"}24h</div>
          </div>
        </div>
        <div className="src-stat tone-amber">
          <div className="src-stat-icon"><Icon name="incoh" /></div>
          <div>
            <div className="src-stat-value">3</div>
            <div className="src-stat-label">sources périmées</div>
          </div>
        </div>
      </div>

      {/* Kind filter pills */}
      <div className="src-kinds">
        {[
          ["all", "Toutes", null],
          ["doc", "Documents", "doc"],
          ["vocal", "Vocaux", "mic"],
          ["photo", "Photos", "camera"],
          ["whatsapp", "WhatsApp", "wa"],
          ["ctx", "Contexte mission", "settings"],
        ].map(([k, l, icon]) => (
          <button
            key={k}
            className={"src-kind" + (kindFilter === k ? " active" : "")}
            onClick={() => setKindFilter(k)}
          >
            {icon && <Icon name={icon} />}
            <span>{l}</span>
            <span className="src-kind-count">{kindCounts[k]}</span>
          </button>
        ))}
      </div>

      <div className="src-layout">
        {/* Left: source index */}
        <div className="src-index">
          <div className="src-index-head">
            <span className="mono muted" style={{ fontSize: 10.5 }}>INDEX · {filtered.length}</span>
            <button className="btn-link" style={{ fontSize: 11.5 }}><Icon name="filter" /> Tri</button>
          </div>
          {filtered.map(s => (
            <SourceRow key={s.id} s={s} active={s.id === openId} onClick={() => setOpenId(s.id)} />
          ))}
        </div>

        {/* Right: source detail */}
        <div className="src-detail">
          {openSource ? <SourceDetail s={openSource} /> : (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
              Sélectionne une source pour voir sa trace.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SourceRow({ s, active, onClick }) {
  const freshClass = s.freshness === "live" ? "live" : s.freshness === "fresh" ? "" : s.freshness === "stale" ? "stale" : "old";
  return (
    <div className={"src-row" + (active ? " active" : "")} onClick={onClick}>
      <div className="src-row-icon">
        <SourceIcon kind={s.kind} />
      </div>
      <div className="src-row-body">
        <div className="src-row-title">{s.title}</div>
        <div className="src-row-meta">
          <span className="mono muted">{s.fmt}</span>
          <span className="mono muted">· {s.uploaded}</span>
          <span className={"fresh " + freshClass}><span className="d" /></span>
          {s.inconsistency && <span className="src-flag alert" data-tip="Incohérence"><Icon name="incoh" /></span>}
          {s.stale && <span className="src-flag amber" data-tip={s.stalenote || "Périmée"}><Icon name="clock" /></span>}
        </div>
      </div>
      <div className="src-row-used mono muted">{s.used}×</div>
    </div>
  );
}

function SourceDetail({ s }) {
  return (
    <div className="src-doc">
      <div className="src-doc-head">
        <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
          <div className="src-doc-icon">
            <SourceIcon kind={s.kind} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row gap-2" style={{ marginBottom: 4 }}>
              <span className="mono muted">{s.id.toUpperCase()}</span>
              <Badge tone="soft">{s.fmt}</Badge>
              {s.stale && <Badge tone="amber" dot>périmée</Badge>}
              {s.inconsistency && <Badge tone="alert" dot>incohérence</Badge>}
            </div>
            <h2 className="src-doc-title">{s.title}</h2>
            <div className="mono muted" style={{ marginTop: 4 }}>uploadé {s.uploaded} · utilisé {s.used} fois par Pacemaker</div>
          </div>
        </div>
        <div className="row gap-2" style={{ marginTop: 14 }}>
          <button className="btn btn-ghost"><Icon name="eye" /> Aperçu</button>
          <button className="btn btn-ghost"><Icon name="download" /> Télécharger</button>
          <button className="btn btn-ghost"><Icon name="diff" /> Voir chunks</button>
          {s.stale && <button className="btn btn-primary" style={{ marginLeft: "auto" }}><Icon name="sparkle" /> Rafraîchir</button>}
        </div>
      </div>

      {/* Stale/Inconsistency alert */}
      {s.stale && s.stalenote && (
        <div className="src-alert amber">
          <Icon name="clock" />
          <div>
            <div style={{ fontWeight: 500, fontSize: 12.5, marginBottom: 2 }}>Source périmée</div>
            <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>{s.stalenote}</div>
          </div>
        </div>
      )}
      {s.inconsistency && !s.stale && (
        <div className="src-alert alert">
          <Icon name="incoh" />
          <div>
            <div style={{ fontWeight: 500, fontSize: 12.5, marginBottom: 2 }}>Contredite par une autre source</div>
            <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>
              {s.id === "s3" && "Une décision notée sur le paperboard contredit la décision S1 priorisée."}
              {s.id === "s4" && "Le message WA de Julien demande un périmètre hors cadrage R2."}
            </div>
          </div>
        </div>
      )}

      {/* Extracts */}
      <div className="src-section">
        <div className="src-section-head">
          <Icon name="sparkle" />
          <span className="src-section-label">Ce que Pacemaker en a extrait</span>
        </div>
        <div className="src-extracts">
          {s.extracts.map((e, i) => (
            <div key={i} className="src-extract">
              <span className="src-extract-bullet" />
              <span>{e}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chunks preview */}
      <div className="src-section">
        <div className="src-section-head">
          <Icon name="database" />
          <span className="src-section-label">Chunks RAG · {s.kind === "doc" ? 12 : s.kind === "vocal" ? 6 : 3}</span>
          <span className="mono muted" style={{ marginLeft: "auto" }}>top 3 · par similarité requête courante</span>
        </div>
        <div className="src-chunks">
          {[0.94, 0.87, 0.72].slice(0, s.kind === "doc" ? 3 : s.kind === "vocal" ? 2 : 1).map((sim, i) => (
            <div key={i} className="src-chunk">
              <div className="src-chunk-head">
                <span className="mono">{s.id}#{i+1}</span>
                <div className="src-chunk-sim">
                  <div className="src-chunk-sim-bar">
                    <div style={{ width: `${sim*100}%`, background: sim > 0.85 ? "var(--green)" : "var(--ink)" }} />
                  </div>
                  <span className="mono">{sim.toFixed(2)}</span>
                </div>
                <span className="mono muted" style={{ marginLeft: "auto" }}>124 tok</span>
              </div>
              <div className="src-chunk-body">
                {s.kind === "vocal" && i === 0 && "« Pour R4, il manque trois mesures DAX que je pensais avoir — on ne pourra pas livrer en S5 sans les refaire. »"}
                {s.kind === "vocal" && i === 1 && "« Côté R1, l'atelier avec Clara s'est bien passé, cinq besoins identifiés. »"}
                {s.kind === "doc" && i === 0 && "Décision : priorisation en 3 lots. Lot 1 (R1, R2, R3) prioritaire budget 20jh. Lot 2 (R4, R5) si budget restant. Lot 3 (R6, R7) en backlog, hors scope sauf ré-arbitrage sponsor."}
                {s.kind === "doc" && i === 1 && "Stakeholders identifiés : Benoît Baret (sponsor), Nathalie Lazardeux (co-sponsor pilotage), Élise Abadie (référente IRC Humanis), Paul D. (pilote)."}
                {s.kind === "doc" && i === 2 && "Budget mission : 30jh réels vendus 60jh. Marge critique à surveiller — risque de scope creep si R6/R7 réouverts."}
                {s.kind === "photo" && "Vision extraite du paperboard atelier 17/04 : « R6 / R7 → à faire » annoté par Nathalie en rouge."}
                {s.kind === "whatsapp" && "« Salut Paul, est-ce qu'on peut avoir un onglet benchmark inter-régions dans R2 ? C'est critique pour ma présentation COPIL. »"}
                {s.kind === "ctx" && "Mission AGIRC-ARRCO DAS · 7 rapports BI · 30jh · sponsor Benoît Baret · équipe mixte métier/DAS."}
              </div>
              <div className="src-chunk-usedin">
                <span className="mono muted" style={{ fontSize: 10 }}>utilisé dans:</span>
                <span className="src-chunk-usedin-chip">Briefing · 16/04</span>
                <span className="src-chunk-usedin-chip">Décision {s.kind === "doc" ? "d1" : "d2"}</span>
                {s.inconsistency && <span className="src-chunk-usedin-chip alert">Incohérence i1</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Traceability graph */}
      <div className="src-section">
        <div className="src-section-head">
          <Icon name="branch" />
          <span className="src-section-label">Traçabilité — ce que cette source a produit</span>
        </div>
        <div className="src-lineage">
          <div className="src-lineage-node source">
            <SourceIcon kind={s.kind} />
            <span>{s.title.slice(0, 20)}…</span>
          </div>
          <div className="src-lineage-arrow" />
          <div className="src-lineage-col">
            {s.extracts.slice(0, 2).map((e, i) => (
              <div key={i} className="src-lineage-node output">
                <Icon name="sparkle" />
                <span>{e}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* INBOX — unchanged */
function InboxPage() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>Capture rapide, avant tri</div>
          <h1 className="page-title">Inbox capture</h1>
          <div className="page-sub">Tout ce qui entre avant qu'il ne devienne tâche, décision ou incohérence.</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="card">
          <div className="card-head">
            <Icon name="wa" />
            <span className="card-title">WhatsApp · allowlist</span>
            <Badge tone="green" dot>live</Badge>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <WaMsg who="Nathalie Lazardeux" role="Chef projet métier" time="il y a 35min" text="On peut avoir un point rapide sur R6 ?" extracted="Intent: réunion · Scope: R6 · Priorité: à caler" alert />
            <WaMsg who="Julien Moreau" role="Métier éco" time="18/04 · 09:12" text="Est-ce qu'on peut avoir un onglet benchmark inter-régions ? C'est critique pour ma présentation COPIL." extracted="Intent: scope change · Severity: moderate · → Incohérence i3" />
            <WaMsg who="Paul Brunaud" role="Équipe Lite" time="17/04 · 16:02" text="Regarde le modèle R4, il y a un trou sur les mesures DAX." extracted="→ Vocal associé 15/04 · Décision d8 triggered" last />
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <Icon name="mic" />
            <span className="card-title">Plaud · captations</span>
            <Badge tone="green" dot>synchro continue</Badge>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <PlaudRow title="Atelier R1 — validation métier" duration="En cours · 47:12" bars pulse live extracted="Capture live · transcription en temps réel" />
            <PlaudRow title="Point Paul B. — mesures DAX" duration="12:04 · hier 15:02" extracted="3 actions extraites · 1 recalibration · confiance 0.82" />
            <PlaudRow title="Debrief atelier Nathalie" duration="8:47 · jeudi 17:58" extracted="1 incohérence détectée (i1) · bascule scope" alert />
            <PlaudRow title="Appel Clara Meyer" duration="22:15 · lundi 10:30" extracted="5 tâches créées · satisfaction +0.15" last />
          </div>
        </div>
      </div>
    </div>
  );
}

function WaMsg({ who, role, time, text, extracted, alert, last }) {
  return (
    <div style={{ padding: "12px 16px", borderBottom: last ? "none" : "1px solid var(--border-soft)" }}>
      <div className="row" style={{ marginBottom: 6 }}>
        <div className="avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{who.split(" ").map(n => n[0]).slice(0, 2).join("")}</div>
        <div style={{ marginLeft: 8 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{who}</div>
          <div className="mono" style={{ color: "var(--muted)" }}>{role}</div>
        </div>
        <span className="mono" style={{ marginLeft: "auto", color: "var(--muted)" }}>{time}</span>
      </div>
      <div className="wa-bubble">
        {text}
      </div>
      <div className="row" style={{ marginTop: 8, gap: 6, fontSize: 11.5, color: "var(--ink-dim)" }}>
        <Icon name="sparkle" style={{ color: alert ? "var(--alert)" : "var(--green-deep)" }} />
        <span className="mono" style={{ color: alert ? "var(--alert)" : "var(--green-deep)" }}>Pacemaker</span>
        <span style={{ flex: 1 }}>{extracted}</span>
      </div>
    </div>
  );
}

function PlaudRow({ title, duration, bars, pulse, live, extracted, alert, last }) {
  return (
    <div style={{ padding: "12px 16px", borderBottom: last ? "none" : "1px solid var(--border-soft)" }}>
      <div className="row" style={{ gap: 10, marginBottom: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: pulse ? "var(--alert)" : "var(--ink)", display: "grid", placeItems: "center", color: "var(--paper)" }}>
          <Icon name="mic" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
          <div className="mono" style={{ color: "var(--muted)" }}>{duration}</div>
        </div>
        {live && <span className="nav-dot-live" />}
      </div>
      <div className="row" style={{ gap: 2, height: 26, alignItems: "center", marginBottom: 8 }}>
        {Array.from({ length: 48 }).map((_, i) => {
          const h = 3 + Math.abs(Math.sin(i * 0.35 + (pulse ? 0 : i * 0.1))) * (pulse ? 22 : 18);
          return <span key={i} style={{ width: 2.5, height: h, background: pulse && i > 30 ? "var(--alert)" : "var(--border)", borderRadius: 2 }} />;
        })}
      </div>
      <div className="row" style={{ gap: 6, fontSize: 11.5 }}>
        <Icon name="sparkle" style={{ color: alert ? "var(--alert)" : "var(--green-deep)" }} />
        <span className="mono" style={{ color: alert ? "var(--alert)" : "var(--green-deep)" }}>Pacemaker</span>
        <span style={{ flex: 1, color: "var(--ink-dim)" }}>{extracted}</span>
      </div>
    </div>
  );
}

/* REPORTS */
function ReportsPage() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>Principe 7 — l'unité de mesure</div>
          <h1 className="page-title">Temps libéré</h1>
          <div className="page-sub">Ce que Pacemaker a absorbé pour que tu te concentres sur la valeur ajoutée senior.</div>
        </div>
        <div className="pill-group">
          <div className="pill">Semaine</div>
          <div className="pill active">Mission</div>
          <div className="pill">Tout</div>
        </div>
      </div>

      <div className="kpi-row" style={{ marginBottom: 14 }}>
        <Kpi label="Heures libérées" value="14h 36" sub="depuis kick-off" spark={[1,2,3,4,5,6,7,8,9,10,11,12,13,14]} tone="" />
        <Kpi label="JH équivalent" value="2,1" sub="sur 30 budget" />
        <Kpi label="Valeur client" value="+18%" sub="densité senior" tone="" />
        <Kpi label="ROI Pacemaker" value="×4,2" sub="contre coût SaaS" />
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-title">Répartition par type d'absorption</span>
        </div>
        <div className="card-body">
          <div className="stack" style={{ gap: 10 }}>
            <BreakdownRow label="Formalisation de CR & synthèses" h="4h 20" pct={30} />
            <BreakdownRow label="Extraction de tâches depuis vocal" h="2h 50" pct={20} />
            <BreakdownRow label="Génération de livrables pré-structurés" h="3h 15" pct={22} />
            <BreakdownRow label="Détection d'incohérences & recalibrations" h="1h 40" pct={12} />
            <BreakdownRow label="Briefings adaptatifs (matin / reprise)" h="1h 20" pct={9} />
            <BreakdownRow label="Tri WhatsApp / Plaud / emails" h="1h 11" pct={7} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({ label, h, pct }) {
  return (
    <div>
      <div className="row" style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 13 }}>{label}</span>
        <span className="mono" style={{ marginLeft: "auto", color: "var(--muted)" }}>{h} · {pct}%</span>
      </div>
      <div className="progress"><span style={{ width: `${pct * 3}%`, background: "var(--green)" }} /></div>
    </div>
  );
}

Object.assign(window, { DecisionsPage, IncohPage, LivrablesPage, SourcesPage, InboxPage, ReportsPage });
