import { NextRequest, NextResponse } from "next/server";
import {
  getDecisionById,
  linkDecision,
  listLinksForDecision,
  unlinkDecision,
} from "@/lib/decisions";
import { resolveActiveMission } from "@/lib/mission";
import type { DecisionLinkEntity, DecisionLinkType } from "@/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const ENTITY_TYPES: DecisionLinkEntity[] = [
  "task",
  "risk",
  "livrable",
  "week",
  "document",
];
const LINK_TYPES: DecisionLinkType[] = [
  "impacts",
  "derives_from",
  "blocks",
  "supersedes",
];

export async function GET(req: NextRequest, { params }: Params) {
  const mission = await resolveActiveMission(req);
  const { id } = await params;
  const decision = await getDecisionById(mission.id, id);
  if (!decision) {
    return NextResponse.json(
      { error: "Décision introuvable" },
      { status: 404 },
    );
  }
  const links = await listLinksForDecision(id);
  return NextResponse.json({ links });
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const mission = await resolveActiveMission(req);
    const { id } = await params;
    const decision = await getDecisionById(mission.id, id);
    if (!decision) {
      return NextResponse.json(
        { error: "Décision introuvable" },
        { status: 404 },
      );
    }
    const { entityType, entityId, linkType } = await req.json();
    if (
      !ENTITY_TYPES.includes(entityType) ||
      !entityId ||
      (linkType !== undefined && !LINK_TYPES.includes(linkType))
    ) {
      return NextResponse.json(
        { error: "entityType / entityId / linkType invalides" },
        { status: 400 },
      );
    }
    const link = await linkDecision(id, entityType, entityId, linkType);
    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const mission = await resolveActiveMission(req);
    const { id } = await params;
    const decision = await getDecisionById(mission.id, id);
    if (!decision) {
      return NextResponse.json(
        { error: "Décision introuvable" },
        { status: 404 },
      );
    }
    const { searchParams } = new URL(req.url);
    const linkId = searchParams.get("linkId");
    if (!linkId) {
      return NextResponse.json(
        { error: "linkId requis" },
        { status: 400 },
      );
    }
    await unlinkDecision(linkId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
