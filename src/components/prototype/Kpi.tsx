import Icon from "./Icon";

interface Props {
  label: string;
  value: string;
  sub?: string;
  delta?: { dir: "up" | "down"; txt: string };
  spark?: number[];
  tone?: "" | "alert" | "amber" | "green";
}

export default function Kpi({ label, value, sub, delta, spark = [], tone = "" }: Props) {
  const max = Math.max(...spark, 1);
  return (
    <div className="kpi">
      <div className="k-label">{label}</div>
      <div
        className="k-value"
        style={
          tone === "alert"
            ? { color: "var(--alert)" }
            : tone === "amber"
            ? { color: "var(--amber)" }
            : {}
        }
      >
        {value}
      </div>
      {sub && (
        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
          {sub}
        </div>
      )}
      {spark.length > 0 && (
        <div className="k-spark">
          {spark.map((v, i) => (
            <span
              key={i}
              className={i >= spark.length - 4 ? "on" : ""}
              style={{ height: `${(v / max) * 18 + 2}px` }}
            />
          ))}
        </div>
      )}
      {delta && (
        <div className={"k-delta " + delta.dir}>
          <Icon name={delta.dir === "up" ? "arrowUp" : "arrowDown"} /> {delta.txt}
        </div>
      )}
    </div>
  );
}
