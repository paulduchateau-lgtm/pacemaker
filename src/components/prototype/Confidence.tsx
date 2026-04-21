interface Props {
  value: number | null;
  note?: string;
}

/** Badge de confiance à 5 niveaux + pct. Classes .conf du prototype. */
export default function Confidence({ value, note }: Props) {
  if (value == null) {
    return (
      <span
        className="conf"
        data-tip={note || "Aucune trace LLM — saisie humaine"}
      >
        <span className="conf-bar">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} />
          ))}
        </span>
        manuel
      </span>
    );
  }
  const lvl = Math.round(value * 5);
  const tone =
    value >= 0.75 ? "high" : value >= 0.6 ? "" : value >= 0.5 ? "low" : "crit";
  return (
    <span
      className={"conf " + tone}
      data-tip={note || `Confiance LLM · ${Math.round(value * 100)}%`}
    >
      <span className="conf-bar">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={i < lvl ? "on" : ""} />
        ))}
      </span>
      {Math.round(value * 100)}%
    </span>
  );
}
