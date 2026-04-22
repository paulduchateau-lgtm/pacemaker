/**
 * Icon set du prototype Claude Design. SVG 16×16 monochromes, stroke
 * currentColor. Porté depuis docs/design/pacemaker-prototype/data.js.
 */
const ICONS: Record<string, string> = {
  home: '<path d="M2 7.5L8 2.5L14 7.5V13A1 1 0 0 1 13 14H3A1 1 0 0 1 2 13V7.5Z"/><path d="M6 14V10H10V14"/>',
  plan: '<rect x="2" y="3" width="12" height="10" rx="1"/><path d="M2 6.5H14"/><path d="M6 3V13"/>',
  pulse: '<path d="M1.5 8H4L5.5 4L8.5 12L10.5 8H14.5"/>',
  decisions: '<path d="M8 2V14"/><path d="M3 5L8 2L13 5"/><path d="M3 11L8 14L13 11"/>',
  livrables:
    '<path d="M3 2H10L13 5V14H3V2Z"/><path d="M10 2V5H13"/><path d="M5 8H11M5 10.5H11M5 13H9"/>',
  risks:
    '<path d="M8 2L14.5 13H1.5L8 2Z"/><path d="M8 7V10"/><circle cx="8" cy="11.8" r="0.5" fill="currentColor"/>',
  sources:
    '<path d="M2 4.5C2 3.67 4.7 3 8 3S14 3.67 14 4.5V11.5C14 12.33 11.3 13 8 13S2 12.33 2 11.5V4.5Z"/><path d="M2 4.5C2 5.33 4.7 6 8 6S14 5.33 14 4.5"/><path d="M2 8C2 8.83 4.7 9.5 8 9.5S14 8.83 14 8"/>',
  reports: '<path d="M2 13V6"/><path d="M6 13V3"/><path d="M10 13V9"/><path d="M14 13V7"/>',
  settings:
    '<circle cx="8" cy="8" r="2"/><path d="M8 1V3M8 13V15M15 8H13M3 8H1M12.9 3.1L11.5 4.5M4.5 11.5L3.1 12.9M12.9 12.9L11.5 11.5M4.5 4.5L3.1 3.1"/>',
  incoh:
    '<circle cx="8" cy="8" r="6"/><path d="M8 5V9"/><circle cx="8" cy="11" r="0.5" fill="currentColor"/>',
  inbox:
    '<path d="M2 9L3.5 4H12.5L14 9V13H2V9Z"/><path d="M2 9H5.5V10.5H10.5V9H14"/>',
  search: '<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/>',
  bell:
    '<path d="M4 7A4 4 0 0 1 12 7V11L13 12.5H3L4 11V7Z"/><path d="M6.5 12.5C6.5 13.3 7.2 14 8 14C8.8 14 9.5 13.3 9.5 12.5"/>',
  chev: '<path d="M6 4L10 8L6 12"/>',
  sparkle:
    '<path d="M8 2L9 6L13 7L9 8L8 12L7 8L3 7L7 6Z" fill="currentColor" fill-opacity="0.12"/><path d="M13 2L13.5 3.5L15 4L13.5 4.5L13 6L12.5 4.5L11 4L12.5 3.5Z" fill="currentColor" fill-opacity="0.18"/>',
  mic:
    '<rect x="6" y="2" width="4" height="8" rx="2"/><path d="M3 7.5C3 10.5 5.5 13 8 13M8 13C10.5 13 13 10.5 13 7.5M8 13V15M5.5 15H10.5"/>',
  camera:
    '<path d="M2 5H4.5L6 3H10L11.5 5H14V12.5H2V5Z"/><circle cx="8" cy="8.5" r="2.5"/>',
  upload: '<path d="M8 10V2M8 2L5 5M8 2L11 5"/><path d="M2 10V13H14V10"/>',
  wa: '<path d="M3 14L4 10.5A6 6 0 1 1 8 14L3 14Z"/>',
  plaud:
    '<circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="2" fill="currentColor"/>',
  doc: '<path d="M3 2H9L13 6V14H3V2Z"/><path d="M9 2V6H13"/>',
  check: '<path d="M3 8L6.5 11.5L13 4.5"/>',
  x: '<path d="M4 4L12 12M12 4L4 12"/>',
  plus: '<path d="M8 3V13M3 8H13"/>',
  arrowUp: '<path d="M8 3V13M4 7L8 3L12 7"/>',
  arrowDown: '<path d="M8 3V13M4 9L8 13L12 9"/>',
  circle: '<circle cx="8" cy="8" r="5.5"/>',
  pencil: '<path d="M2 14L3 10L10 3L13 6L6 13L2 14Z"/><path d="M9 4L12 7"/>',
  clock: '<circle cx="8" cy="8" r="6"/><path d="M8 4V8L11 10"/>',
  link:
    '<path d="M6.5 9.5L9.5 6.5"/><path d="M7 4L8.5 2.5A3 3 0 0 1 13 7L11 9"/><path d="M9 12L7.5 13.5A3 3 0 0 1 3 9L5 7"/>',
  diff:
    '<path d="M4 3L4 7A3 3 0 0 0 7 10H12"/><circle cx="4" cy="3" r="1.5"/><circle cx="12" cy="13" r="1.5"/><path d="M12 10V13"/>',
  eye:
    '<path d="M1 8S3.5 3 8 3S15 8 15 8S12.5 13 8 13S1 8 1 8Z"/><circle cx="8" cy="8" r="2"/>',
  stakeholders:
    '<circle cx="5.5" cy="6" r="2"/><circle cx="11" cy="6" r="2"/><path d="M1.5 13C1.5 11 3 9.5 5.5 9.5S9.5 11 9.5 13"/><path d="M7 13C7 11 8.5 9.5 11 9.5S14.5 11 14.5 13"/>',
  calendar:
    '<rect x="2" y="3.5" width="12" height="10.5" rx="1"/><path d="M2 6.5H14"/><path d="M5 2V4M11 2V4"/>',
  tasks:
    '<rect x="2" y="3" width="3" height="3" rx="0.5"/><rect x="2" y="10" width="3" height="3" rx="0.5"/><path d="M7 4.5H14M7 11.5H14"/>',
  flag: '<path d="M3 14V2"/><path d="M3 2H11L9.5 5L11 8H3"/>',
  moon: '<path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5A5.5 5.5 0 1 0 13.5 9.5Z"/>',
  file:
    '<path d="M3.5 2H9L12.5 5.5V14H3.5V2Z"/><path d="M9 2V5.5H12.5"/><path d="M5.5 9H10.5M5.5 11.5H10.5M5.5 6.5H7.5"/>',
  send: '<path d="M14 2L2 7L7 9L9 14L14 2Z"/>',
  branch:
    '<circle cx="4" cy="3" r="1.5"/><circle cx="4" cy="13" r="1.5"/><circle cx="12" cy="5" r="1.5"/><path d="M4 4.5V11.5"/><path d="M4 8C4 6 6 5 8 5H10.5"/>',
  database:
    '<ellipse cx="8" cy="4" rx="5.5" ry="2"/><path d="M2.5 4V12C2.5 13.1 5 14 8 14S13.5 13.1 13.5 12V4"/><path d="M2.5 8C2.5 9.1 5 10 8 10S13.5 9.1 13.5 8"/>',
  filter: '<path d="M2 3H14L10 8.5V13L6 11.5V8.5L2 3Z"/>',
  download:
    '<path d="M8 2V10M8 10L5 7M8 10L11 7"/><path d="M2 12V14H14V12"/>',
  mail:
    '<rect x="2" y="3.5" width="12" height="9" rx="1"/><path d="M2.5 4.5L8 9L13.5 4.5"/>',
  warn:
    '<path d="M8 2L14.5 13.5H1.5L8 2Z"/><path d="M8 6.5V9.5M8 11.2V11.5"/>',
  heart:
    '<path d="M8 13.5C8 13.5 2 10 2 6C2 3.8 3.8 2.5 5.5 2.5C6.8 2.5 7.7 3.3 8 4C8.3 3.3 9.2 2.5 10.5 2.5C12.2 2.5 14 3.8 14 6C14 10 8 13.5 8 13.5Z"/>',
  scroll:
    '<path d="M3.5 2.5H11L13 4.5V13.5H5.5V4.5H3.5V2.5Z"/><path d="M11 2.5V4.5H13"/><path d="M7 7.5H11M7 10H11"/>',
  trash:
    '<path d="M2.5 4.5H13.5M5.5 4.5V3H10.5V4.5M6 4.5V13H10V4.5"/><rect x="4" y="4.5" width="8" height="9" rx="1"/>',
};

export type IconName = keyof typeof ICONS;

export default function Icon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const body = ICONS[name] || "";
  return (
    <span
      className={"icon " + className}
      aria-hidden
      dangerouslySetInnerHTML={{
        __html: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">${body}</svg>`,
      }}
    />
  );
}
