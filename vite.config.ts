import { defineConfig, type Plugin } from "vite";
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
 * declares its policy in the page. Scripts, connections and frames stay on this site;
 * inline styles are allowed because Base UI's select list injects a small <style> element.
 * The dev server is unchanged (Vite injects inline scripts there).
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function staticSecurityPolicy(): Plugin {
  return {
    name: "doroboty-static-security-policy",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { "http-equiv": "Content-Security-Policy", content: CONTENT_SECURITY_POLICY },
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

export default defineConfig({
  plugins: [react(), tailwindcss(), staticSecurityPolicy()],
  base: "./",
  define: {
    __APP_BUILD__: JSON.stringify({ commit: currentCommit(), builtAt: new Date().toISOString() }),
  },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
