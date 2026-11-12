import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Short commit hash of the checked-out sources, so a published build can be identified. */
function currentCommit(): string {
  try {
    return execFileSync("git", ["rev-parse", "--short=7", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

/**
 * Static hosting (GitHub Pages) cannot send response headers, so the production build
 * declares its policy in the page. PostHog's configured domain is allowed for scripts,
 * connections, and workers; inline styles are allowed because Base UI's select list injects
 * a small <style> element.
 * The dev server is unchanged (Vite injects inline scripts there).
 */
function contentSecurityPolicy(mode: string): string {
  const posthogHost = loadEnv(mode, process.cwd(), "").VITE_PUBLIC_POSTHOG_HOST;
  let posthogSource = "";

  try {
    if (posthogHost) {
      const domain = new URL(posthogHost).hostname.split(".").slice(-2).join(".");
      posthogSource = ` https://*.${domain}`;
    }
  } catch {
    // An unconfigured host leaves production analytics as a no-op.
  }

  return [
    "default-src 'self'",
    `script-src 'self'${posthogSource}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${posthogSource}`,
    `worker-src 'self'${posthogSource} blob:`,
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

function staticSecurityPolicy(mode: string): Plugin {
  return {
    name: "doroboty-static-security-policy",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { "http-equiv": "Content-Security-Policy", content: contentSecurityPolicy(mode) },
        injectTo: "head-prepend",
      },
      {
        tag: "meta",
        attrs: { name: "referrer", content: "no-referrer" },
        injectTo: "head-prepend",
      },
    ],
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), staticSecurityPolicy(mode)],
  base: "./",
  define: {
    __APP_BUILD__: JSON.stringify({ commit: currentCommit(), builtAt: new Date().toISOString() }),
  },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
}));
