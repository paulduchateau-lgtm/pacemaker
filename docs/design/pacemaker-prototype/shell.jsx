// Shared shell components — sidebar, topbar, co-pilot console
const { useState, useEffect, useMemo, useRef } = React;

function Icon({ name, className = "" }) {
  return <span className={"icon " + className} dangerouslySetInnerHTML={{ __html: ICONS[name] || "" }} />;
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M2 8 L5 8 L6.5 4 L9.5 12 L11 8 L14 8" stroke="#EEE9DC" />
      </svg>
    </div>
  );
}

function Sidebar({ active, counts }) {
  const sections = [
    {
      title: "Aujourd'hui",
      items: [
        { id: "home", label: "Briefing", icon: "home", live: true, hint: "3 signaux" },
        { id: "inbox", label: "Inbox capture", icon: "inbox", count: counts?.inbox },
      ],
    },
    {
      title: "Travail courant",
      items: [
        { id: "plan", label: "Plan de mission", icon: "plan", count: counts?.tasks },
        { id: "livrables", label: "Livrables", icon: "livrables", count: counts?.livrables },
        { id: "decisions", label: "Décisions", icon: "decisions", count: counts?.decisions },
      ],
    },
    {
      title: "Signaux",
      items: [
        { id: "incoh", label: "Incohérences", icon: "incoh", count: counts?.incoh, alert: true },
        { id: "pulse", label: "Pulse humain", icon: "pulse", pill: "NEW" },
      ],
    },
    {
      title: "Archive",
      items: [
        { id: "sources", label: "Sources & RAG", icon: "sources", count: counts?.sources },
        { id: "reports", label: "Temps libéré", icon: "reports" },
      ],
    },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <BrandMark />
        <span className="brand-name">Pacemaker</span>
        <span className="brand-env">v0.3</span>
      </div>

      <div className="mission-switch" data-tip="Changer de mission">
        <span className="client-dot" />
        <div className="ms-meta">
          <div className="ms-client">AGIRC-ARRCO · DAS</div>
          <div className="ms-label">BI DAS — 7 rapports</div>
        </div>
        <span className="ms-caret">⇅</span>
      </div>

      <nav className="nav">
        {sections.map((sec, si) => (
          <div key={si} style={{ marginBottom: si < sections.length - 1 ? 2 : 0 }}>
            <div className="nav-section-title">{sec.title}</div>
            {sec.items.map((it) => (
              <div
                key={it.id}
                className={"nav-item" + (active === it.id ? " active" : "")}
                onClick={() => window.__nav?.(it.id)}
              >
                <Icon name={it.icon} className="nav-icon" />
                <span>{it.label}</span>
                {it.pill && (
                  <span style={{
                    marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 9,
                    background: "var(--green)", color: "var(--ink)", padding: "1px 5px", borderRadius: 4, letterSpacing: "0.1em"
                  }}>{it.pill}</span>
                )}
                {it.count != null && <span className={"nav-count" + (it.alert ? " alert" : "")}>{it.count}</span>}
                {it.hint && !it.count && !it.pill && (
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>{it.hint}</span>
                )}
                {it.live && !it.count && !it.pill && !it.hint && <span className="nav-dot-live" />}
              </div>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="avatar">PD</div>
        <div className="ident">
          <div className="who">Paul Duchâteau</div>
          <div className="role">Senior · Lite Ops</div>
        </div>
        <Icon name="settings" className="nav-icon" />
      </div>
    </aside>
  );
}

function ChannelRow({ icon, label, status, live }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 9,
      padding: "6px 8px", borderRadius: 6,
      fontSize: 12, cursor: "pointer"
    }} className="channel-row">
      <span style={{
        width: 22, height: 22, borderRadius: 5,
        background: "var(--paper-elevated)",
        border: "1px solid var(--border)",
        display: "grid", placeItems: "center",
        color: "var(--ink-dim)"
      }}>
        <Icon name={icon} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{status}</div>
      </div>
      {live && <span className="nav-dot-live" style={{ margin: 0 }} />}
    </div>
  );
}

function TopBar({ crumbs, extra }) {
  return (
    <div className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            <span className={i === crumbs.length - 1 ? "current" : ""}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="cmdk">
        <Icon name="search" />
        <span>Interroger Pacemaker…</span>
        <kbd>⌘K</kbd>
      </div>
      <div className="top-actions">
        <button className="icon-btn has-dot" data-tip="Notifications"><Icon name="bell" /></button>
        <button className="icon-btn" data-tip="Nouveau" onClick={() => window.__openCompose?.()}><Icon name="plus" /></button>
        {extra}
      </div>
    </div>
  );
}

function Badge({ tone = "", children, dot, icon }) {
  return (
    <span className={"badge " + tone}>
      {dot && <span className="dot" />}
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}

function Confidence({ value, note }) {
  if (value == null) return (
    <span className="conf" data-tip={note || "Aucune trace LLM — saisie humaine"}>
      <span className="conf-bar">
        {[0, 1, 2, 3, 4].map((i) => <span key={i} />)}
      </span>
      manuel
    </span>
  );
  const lvl = Math.round(value * 5);
  const tone = value >= 0.75 ? "high" : value >= 0.6 ? "" : value >= 0.5 ? "low" : "crit";
  return (
    <span className={"conf " + tone} data-tip={note || `Confiance LLM · ${Math.round(value * 100)}%`}>
      <span className="conf-bar">
        {[0, 1, 2, 3, 4].map((i) => <span key={i} className={i < lvl ? "on" : ""} />)}
      </span>
      {Math.round(value * 100)}%
    </span>
  );
}

function FreshnessDot({ level, label }) {
  const cls = level === "live" ? "live" : level === "stale" ? "stale" : level === "old" ? "old" : "";
  return <span className={"fresh " + cls}><span className="d" />{label}</span>;
}

function SourceIcon({ kind }) {
  const map = { doc: "doc", vocal: "mic", photo: "camera", whatsapp: "wa", plaud: "plaud", ctx: "settings" };
  return <Icon name={map[kind] || "doc"} />;
}

function CopilotConsole({ tab, setTab, onClose }) {
  const [compose, setCompose] = useState("");
  const messages = [
    {
      who: "agent", ts: "il y a 18min",
      html: (
        <>
          <p>Bon retour Paul. Depuis vendredi soir, <strong>3 événements</strong> méritent ton attention :</p>
          <ul style={{ paddingLeft: 16, margin: "6px 0" }}>
            <li>Une <strong>bascule scope</strong> — Nathalie a rouvert R6/R7 en atelier jeudi.</li>
            <li>Un <strong>vocal Paul B.</strong> qui invalide l'estimation de R4.</li>
            <li>Julien Moreau (WA) demande un onglet benchmark hors scope R2.</li>
          </ul>
          <p>J'ai recalibré S5 silencieusement (+0,5jh). Les deux autres nécessitent un arbitrage.</p>
          <div className="cites">
            <span className="cite">Vocal 15/04</span>
            <span className="cite">Photo atelier 17/04</span>
            <span className="cite">WA Julien 18/04</span>
            <span className="cite">Décision S1 — lots</span>
          </div>
        </>
      ),
    },
    {
      who: "paul", ts: "il y a 12min",
      html: <p>Tu recommandes quoi pour la bascule R6/R7 ?</p>,
    },
    {
      who: "agent", ts: "il y a 12min",
      html: (
        <>
          <p>Je recommande <strong>confirmer explicitement avec Benoît Baret avant S4</strong> — confiance <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>0.74</code>.</p>
          <p className="dim" style={{ fontSize: 12 }}>Parce que : (1) sponsor officiel = Benoît, pas Nathalie. (2) La décision S1 a été actée avec lui en kick-off. (3) Rouvrir 2 rapports sans ré-arbitrage sponsor = scope creep systématique.</p>
          <p className="dim" style={{ fontSize: 12 }}>Alternative écartée : re-prioriser directement. Risque : remettre en cause la cohérence lot 1 en cours de build R1.</p>
          <p className="dim" style={{ fontSize: 12 }}>Angle mort : je n'ai pas eu de signal de Benoît depuis 9j. S'il a validé par email hors Pacemaker, je ne le vois pas.</p>
          <div className="cites">
            <span className="cite">CR kick-off 08/04</span>
            <span className="cite">Incohérence i1</span>
          </div>
        </>
      ),
    },
  ];
  const rawSignals = [
    { src: "plaud", label: "Plaud · Atelier R1 en cours", body: "Captation continue en arrière-plan (R1 avec Clara Meyer). Transcription en live.", ts: "maintenant" },
    { src: "wa", label: "WhatsApp · Nathalie Lazardeux", body: "« On peut avoir un point rapide sur R6 ? »", ts: "il y a 35min" },
    { src: "doc", label: "Upload · CR atelier R1", body: "atelier-r1-validation.docx · parsé · 2 décisions extraites", ts: "il y a 1h" },
    { src: "vocal", label: "Vocal Paul B. · 15/04", body: "« Pour R4, il manque trois mesures DAX que je pensais avoir. »", ts: "hier" },
    { src: "camera", label: "Photo · paperboard atelier", body: "Vision — 3 actions détectées, 1 décision contestée (confiance 0.68)", ts: "jeudi 17:40" },
  ];

  return (
    <aside className="copilot">
      <div className="cp-head">
        <span className="dot-live" />
        <div>
          <div className="cp-title">Copilote Pacemaker</div>
        </div>
        <span className="cp-sub">Sonnet 4 · Live</span>
        {onClose && (
          <button onClick={onClose} className="icon-btn" style={{ marginLeft: 6 }} data-tip="Fermer (esc)">
            <Icon name="x" />
          </button>
        )}
      </div>

      <div className="cp-tabs">
        <div className={"cp-tab" + (tab === "chat" ? " active" : "")} onClick={() => setTab("chat")}>Conversation</div>
        <div className={"cp-tab" + (tab === "ingest" ? " active" : "")} onClick={() => setTab("ingest")}>Signaux bruts</div>
        <div className={"cp-tab" + (tab === "reason" ? " active" : "")} onClick={() => setTab("reason")}>Raisonnement</div>
      </div>

      <div className="cp-body" style={{ position: "relative" }}>
        {tab === "chat" && messages.map((m, i) => (
          <div key={i} className={"cp-msg " + m.who}>
            <div className="who">
              <span>{m.who === "agent" ? "Pacemaker" : "Paul D."}</span>
              <span className="ts">{m.ts}</span>
            </div>
            {m.html}
          </div>
        ))}

        {tab === "ingest" && (
          <>
            <div className="mono" style={{ color: "var(--muted)", marginBottom: 4 }}>Flux temps-réel · 5 événements</div>
            {rawSignals.map((s, i) => (
              <div key={i} className="ingest">
                <span className="src-icon"><SourceIcon kind={s.src === "camera" ? "photo" : s.src} /></span>
                <div className="ig-body">
                  <div className="h">
                    <span style={{ fontWeight: 500, color: "var(--ink)" }}>{s.label}</span>
                    <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 9.5 }}>{s.ts}</span>
                  </div>
                  <div className="b">{s.body}</div>
                </div>
              </div>
            ))}
            <div className="ingest" style={{ background: "var(--accent)", borderColor: "var(--accent-line)" }}>
              <span className="src-icon" style={{ background: "var(--paper-elevated)" }}><Icon name="sparkle" /></span>
              <div className="ig-body">
                <div className="h"><span style={{ fontWeight: 500 }}>Ce que Pacemaker a fait avec ces signaux</span></div>
                <div className="b dim" style={{ fontSize: 12 }}>
                  3 tâches créées · 2 décisions extraites · 1 recalibration · 3 incohérences flaguées. <button className="btn-link" style={{ padding: 0, fontSize: 12, textDecoration: "underline" }}>voir le journal →</button>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "reason" && (
          <div className="cp-msg agent">
            <div className="who"><span>Trace — réponse précédente</span><span className="ts">T+1.8s</span></div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.7, color: "var(--ink-dim)" }}>
              <div><strong>Contexte injecté</strong></div>
              <div>· Mission context (v3) — 1 200 tok</div>
              <div>· Règles apprises (4/5) — 380 tok</div>
              <div>· RAG — 8 chunks — 2 450 tok</div>
              <div>· Décisions actées (12) — 680 tok</div>
              <div>· Incohérences pending (3) — 240 tok</div>
              <div style={{ marginTop: 8 }}><strong>Déduction</strong></div>
              <div>1 · Bascule détectée par similarité 0.82 avec décision d1</div>
              <div>2 · Auteur de la réouverture (Nathalie) ≠ sponsor officiel (Benoît)</div>
              <div>3 · Pas d'event Benoît depuis 9j → angle mort signalé</div>
              <div style={{ marginTop: 8 }}><strong>Sortie</strong></div>
              <div>Recommandation · confiance 0.74 · 3 alternatives pesées</div>
            </div>
          </div>
        )}
      </div>

      <div className="cp-compose">
        <div className="compose-box">
          <textarea
            placeholder="Dicte, écris, colle un CR, ou pose une question à Pacemaker…"
            value={compose}
            onChange={(e) => setCompose(e.target.value)}
          />
          <div className="compose-bar">
            <button className="chip"><Icon name="mic" /> Vocal</button>
            <button className="chip"><Icon name="camera" /> Photo</button>
            <button className="chip"><Icon name="upload" /> Coller CR</button>
            <button className="send">Envoyer ↵</button>
          </div>
        </div>
      </div>
    </aside>
  );
}

Object.assign(window, { Icon, Sidebar, TopBar, Badge, Confidence, FreshnessDot, SourceIcon, CopilotConsole, BrandMark });
