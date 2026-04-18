import { NextRequest, NextResponse } from "next/server";
import { getLivrableTheme, setLivrableTheme } from "@/lib/livrables/theme-store";
import { listThemes, DEFAULT_THEME_ID } from "@/lib/livrables/themes";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const value = await getLivrableTheme({ missionId: mission.id });
  return NextResponse.json({
    value,
    default: DEFAULT_THEME_ID,
    options: listThemes(),
  });
}

export async function PATCH(req: NextRequest) {
  const { value } = await req.json();
  if (typeof value !== "string") {
    return NextResponse.json(
      { error: "value doit être une chaîne" },
      { status: 400 },
    );
  }
  const valid = listThemes().some((t) => t.id === value);
  if (!valid) {
    return NextResponse.json(
      { error: `Thème inconnu : ${value}` },
      { status: 400 },
    );
  }
  const mission = await resolveActiveMission(req);
  await setLivrableTheme(mission.id, value);
  return NextResponse.json({ ok: true });
}
