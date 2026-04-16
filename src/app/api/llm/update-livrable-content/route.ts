import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { put } from "@vercel/blob";
import { parseLivrablePayload } from "@/lib/livrables/validate";
import { markdownToPayload } from "@/lib/livrables/fallback";
import { renderLivrable, detectFormat } from "@/lib/livrables/render";
import { getLivrableTheme } from "@/lib/livrables/theme-store";

export const dynamic = "force-dynamic";

/**
 * Applique un contenu corrigé à un livrable existant :
 * - remplace l'aiContent dans task.livrables_generes.livrables[index]
 * - régénère le fichier (DOCX/XLSX/PPTX) avec le nouveau contenu et le thème courant
 * - uploade le nouveau blob (Vercel Blob suffixe le nom, l'ancienne URL reste accessible)
 *
 * Le correctedContent peut être :
 *   - un LivrablePayload JSON (cas nominal, issu de la modale de correction)
 *   - du markdown (fallback si l'utilisateur a collé du texte brut)
 */
export async function POST(req: NextRequest) {
  try {
    const { taskId, livrableIndex, correctedContent, themeId } = await req.json();

    if (
      typeof taskId !== "string" ||
      typeof livrableIndex !== "number" ||
      typeof correctedContent !== "string"
    ) {
      return NextResponse.json(
        { error: "taskId, livrableIndex et correctedContent requis" },
        { status: 400 }
      );
    }

    const taskRows = await query("SELECT * FROM tasks WHERE id = ?", [taskId]);
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
        { status: 404 }
      );
    }

    const livrable = livrablesData.livrables[livrableIndex];
    const resolvedThemeId = themeId || (await getLivrableTheme());

    // Tente JSON d'abord, fallback markdown sinon
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

    const blob = await put(`pacemaker/livrables/${result.filename}`, result.buffer, {
      access: "public",
      contentType: result.contentType,
    });

    livrablesData.livrables[livrableIndex] = {
      ...livrable,
      aiContent: correctedContent,
      url: blob.url,
    };

    await execute(
      "UPDATE tasks SET livrables_generes = ? WHERE id = ?",
      [JSON.stringify(livrablesData), taskId]
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
