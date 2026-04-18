import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { put } from "@vercel/blob";
import { parseLivrablePayload } from "@/lib/livrables/validate";
import { markdownToPayload } from "@/lib/livrables/fallback";
import { renderLivrable, detectFormat } from "@/lib/livrables/render";
import { getLivrableTheme } from "@/lib/livrables/theme-store";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const mission = await resolveActiveMission(req);
    const { taskId, livrableIndex, correctedContent, themeId } =
      await req.json();

    if (
      typeof taskId !== "string" ||
      typeof livrableIndex !== "number" ||
      typeof correctedContent !== "string"
    ) {
      return NextResponse.json(
        { error: "taskId, livrableIndex et correctedContent requis" },
        { status: 400 },
      );
    }

    const taskRows = await query(
      "SELECT * FROM tasks WHERE id = ? AND mission_id = ?",
      [taskId, mission.id],
    );
    if (taskRows.length === 0) {
      return NextResponse.json({ error: "Tâche non trouvée" }, { status: 404 });
    }
    const t = taskRows[0];

    const livrablesData = t.livrables_generes
      ? JSON.parse(t.livrables_generes as string)
      : null;
    if (
      !livrablesData ||
      !Array.isArray(livrablesData.livrables) ||
      livrableIndex < 0 ||
      livrableIndex >= livrablesData.livrables.length
    ) {
      return NextResponse.json(
        { error: "Livrable introuvable à cet index" },
        { status: 404 },
      );
    }

    const livrable = livrablesData.livrables[livrableIndex];
    const resolvedThemeId =
      themeId || (await getLivrableTheme({ missionId: mission.id }));

    const parsed =
      parseLivrablePayload(correctedContent) ??
      markdownToPayload(correctedContent, {
        title: livrable.titre as string,
        subtitle: (livrable.description as string) || undefined,
      });

    const extension = detectFormat((livrable.format as string) || "docx");
    const result = await renderLivrable(parsed, {
      themeId: resolvedThemeId,
      format: extension,
    });

    const blob = await put(
      `pacemaker/livrables/${result.filename}`,
      result.buffer,
      {
        access: "public",
        contentType: result.contentType,
      },
    );

    livrablesData.livrables[livrableIndex] = {
      ...livrable,
      aiContent: correctedContent,
      url: blob.url,
    };

    await execute(
      "UPDATE tasks SET livrables_generes = ? WHERE id = ? AND mission_id = ?",
      [JSON.stringify(livrablesData), taskId, mission.id],
    );

    return NextResponse.json({
      ok: true,
      url: blob.url,
      filename: result.filename,
      format: result.extension,
      livrables_generes: JSON.stringify(livrablesData),
      themeId: resolvedThemeId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
