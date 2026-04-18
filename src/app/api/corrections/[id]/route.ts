import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const mission = await resolveActiveMission(req);
    const { id } = await params;
    const { status } = await req.json();

    if (!["active", "superseded", "archived"].includes(status)) {
      return NextResponse.json({ error: "Status invalide" }, { status: 400 });
    }

    await execute(
      "UPDATE corrections SET status = ? WHERE id = ? AND mission_id = ?",
      [status, id, mission.id],
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const mission = await resolveActiveMission(req);
    const { id } = await params;
    await execute(
      "UPDATE corrections SET status = 'archived' WHERE id = ? AND mission_id = ?",
      [id, mission.id],
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
