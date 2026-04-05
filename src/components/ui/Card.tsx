interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-white p-3 md:p-4 ${className}`}
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: "6px",
      }}
    >
      {children}
    </div>
  );
}
