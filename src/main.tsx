import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./features/prototype/app";
import { logRenderError } from "./features/prototype/error-boundary";
import "./app/globals.css";
createRoot(
  document.getElementById("root")!,
  import.meta.env.DEV ? {} : { onCaughtError: logRenderError, onUncaughtError: logRenderError },
).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
