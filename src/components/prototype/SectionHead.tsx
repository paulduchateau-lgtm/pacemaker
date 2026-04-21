import Icon from "./Icon";

interface Props {
  icon: string;
  label: string;
  count?: number | null;
  tone?: "" | "alert" | "amber" | "green";
  sub?: string;
}

export default function SectionHead({ icon, label, count, tone = "", sub }: Props) {
  return (
    <div className="sect-head">
      <span className="sect-icon">
        <Icon name={icon} />
      </span>
      <span className="sect-label">{label}</span>
      {count != null && (
        <span className={"sect-count" + (tone ? " tone-" + tone : "")}>{count}</span>
      )}
      {sub && <span className="sect-sub">{sub}</span>}
    </div>
  );
}
