import Card from "./Card";

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

export default function KpiCard({ label, value, sub }: KpiCardProps) {
  return (
    <Card>
      <p className="mono-label mb-1" style={{ color: "var(--color-muted)" }}>
        {label}
      </p>
      <p className="text-xl md:text-2xl font-medium" style={{ color: "var(--color-ink)" }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs md:text-sm mt-1" style={{ color: "var(--color-muted)" }}>
          {sub}
        </p>
      )}
    </Card>
  );
}
