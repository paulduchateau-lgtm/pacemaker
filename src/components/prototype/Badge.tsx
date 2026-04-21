import type { CSSProperties, ReactNode } from "react";
import Icon from "./Icon";

interface Props {
  tone?: "" | "green" | "amber" | "alert" | "ink" | "soft" | "muted";
  dot?: boolean;
  icon?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

/** Badge stylé selon la classe .badge du prototype. */
export default function Badge({ tone = "", dot, icon, children, style }: Props) {
  return (
    <span className={"badge " + tone} style={style}>
      {dot && <span className="dot" />}
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}
