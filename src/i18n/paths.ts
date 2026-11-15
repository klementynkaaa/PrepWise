import { routing, type AppLocale } from "./routing";

/**
 * The only place a locale prefix is built: localePath("/start/people") gives
 * "/pl/start/people", localePath("/") gives "/pl". Takes a path that starts
 * with "/" and carries no locale yet.
 */
export function localePath(path: string, locale: AppLocale = routing.defaultLocale): string {
  const clean = path === "/" ? "" : path;
  return `/${locale}${clean}`;
}
