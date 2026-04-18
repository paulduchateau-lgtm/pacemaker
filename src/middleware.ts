import { NextRequest, NextResponse } from "next/server";
import {
  ACTIVE_MISSION_COOKIE,
  DEFAULT_MISSION_SLUG,
} from "@/lib/mission-constants";

/**
 * Middleware chantier 1 :
 * - Met à jour le cookie `active_mission_slug` chaque fois que la route
 *   expose un slug explicite (/admin/missions/[slug]/..., /client/[slug]/...)
 *   pour que les API serveur résolvent la bonne mission.
 * - Redirige les anciennes URL (/admin/*, /client) vers leur équivalent scopé
 *   pendant la transition, avec la mission par défaut.
 *
 * Aucune dépendance runtime Node ici (Edge) : pas d'accès DB.
 */

const ADMIN_LEGACY_PAGES = new Set([
  "risques",
  "journal",
  "capture",
  "docs",
  "contexte",
  "regles",
]);

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const p = url.pathname;

  // 1) Si on est déjà sur une route scopée, rafraîchir le cookie.
  const adminMatch = p.match(/^\/admin\/missions\/([^/]+)/);
  const clientMatch = p.match(/^\/client\/([^/]+)/);
  const activeSlug = adminMatch?.[1] ?? clientMatch?.[1] ?? null;
  if (activeSlug && activeSlug !== "new") {
    const res = NextResponse.next();
    const existing = req.cookies.get(ACTIVE_MISSION_COOKIE)?.value;
    if (existing !== activeSlug) {
      res.cookies.set(ACTIVE_MISSION_COOKIE, activeSlug, {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return res;
  }

  // 2) Redirections legacy → scoped
  if (p === "/admin" || p === "/admin/") {
    return NextResponse.redirect(new URL("/admin/missions", url));
  }
  if (p.startsWith("/admin/") && !p.startsWith("/admin/missions")) {
    const tail = p.slice("/admin/".length).replace(/\/+$/, "");
    const first = tail.split("/")[0];
    if (!ADMIN_LEGACY_PAGES.has(first)) return NextResponse.next();
    return NextResponse.redirect(
      new URL(`/admin/missions/${DEFAULT_MISSION_SLUG}/${tail}`, url),
    );
  }
  if (p === "/client" || p === "/client/") {
    return NextResponse.redirect(
      new URL(`/client/${DEFAULT_MISSION_SLUG}`, url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/client/:path*"],
};
