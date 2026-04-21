import Icon from "./Icon";

interface Props {
  icon: string;
  value: string;
  label: string;
  sub?: string;
  tone?: "" | "amber" | "alert" | "green" | "neutral";
}

export default function StatTile({ icon, value, label, sub, tone = "neutral" }: Props) {
  return (
    <div className={"stat-tile tone-" + tone}>
      <div className="stat-icon">
        <Icon name={icon} />
      </div>
      <div className="stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}
