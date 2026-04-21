import Icon from "./Icon";

const MAP: Record<string, string> = {
  doc: "doc",
  vocal: "mic",
  photo: "camera",
  whatsapp: "wa",
  plaud: "plaud",
  ctx: "settings",
};

/** Icône normalisée pour une source (doc/vocal/photo/whatsapp/plaud/ctx). */
export default function SourceIcon({ kind }: { kind: string }) {
  return <Icon name={MAP[kind] || "doc"} />;
}
