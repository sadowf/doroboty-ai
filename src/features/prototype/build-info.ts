export type BuildInfo = { commit: string; builtAt: string };

const injected: BuildInfo | undefined =
  typeof __APP_BUILD__ === "undefined" ? undefined : __APP_BUILD__;

/**
 * Label identifying the running build, e.g. "1e63265 (zbudowano 2026-11-11)".
 * Deliberately avoids Intl formatting: the error fallback shows it, so it must not depend
 * on anything that could itself be the cause of a render error.
 */
export function buildLabel(info: BuildInfo | undefined = injected): string {
  if (!info?.commit) return "wersja lokalna bez identyfikatora";
  const day = /^\d{4}-\d{2}-\d{2}/.exec(info.builtAt)?.[0];
  return day ? `${info.commit} (zbudowano ${day})` : info.commit;
}
