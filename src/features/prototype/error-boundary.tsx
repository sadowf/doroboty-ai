import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import posthog, { isPostHogConfigured } from "@/lib/posthog";
import { posthogLogger } from "@/lib/posthog-logger";
import { Button } from "@/components/ui/button";
import { clearSave, readRawSave, type StoragePort } from "./storage";
import { downloadText } from "./download";
import { buildLabel } from "./build-info";

function browserStorage(): StoragePort | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function reloadAt(hash?: string) {
  if (hash) window.location.hash = hash;
  window.location.reload();
}

/**
 * Shown instead of a blank page when a view throws while rendering.
 * Every action reloads the page, so it works both inside and outside the router.
 */
export function ErrorFallback() {
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState("");
  const saved = readRawSave(browserStorage());
  const trigger = useRef<HTMLButtonElement>(null);
  const confirm = useRef<HTMLButtonElement>(null);
  const toggled = useRef(false);
  useEffect(() => {
    if (!toggled.current) return;
    (confirmReset ? confirm : trigger).current?.focus();
  }, [confirmReset]);
  function showConfirm(next: boolean) {
    toggled.current = true;
    setConfirmReset(next);
  }
  return (
    <section className="prototype-section max-w-4xl" aria-labelledby="error-fallback-title">
      <h1 id="error-fallback-title" tabIndex={-1}>
        Coś poszło nie tak
      </h1>
      <div className="mt-6 space-y-5">
        <p>
          Ten widok nie zadziałał. Dane zapisane w tej przeglądarce nie zostały usunięte. Najpierw
          spróbuj odświeżyć stronę.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => reloadAt()}>Odśwież stronę</Button>
          <Button variant="outline" onClick={() => reloadAt("#/oferty")}>
            Przejdź do ofert
          </Button>
          <Button
            variant="outline"
            disabled={!saved}
            onClick={() => saved && downloadText("doroboty-kopia-danych.json", saved)}
          >
            Pobierz kopię danych
          </Button>
        </div>
        <p>
          Jeśli błąd wraca po odświeżeniu, pobierz kopię danych, a potem przywróć dane startowe
          scenariusza. Kopię możesz później zaimportować w ustawieniach.
        </p>
        {confirmReset ? (
          <div role="group" aria-label="Potwierdź reset danych" className="prototype-notice">
            <p className="mb-3">
              Reset usunie wszystkie zmiany scenariusza zapisane w tej przeglądarce. Tej operacji
              nie można cofnąć bez pobranej kopii.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                ref={confirm}
                variant="destructive"
                onClick={() => {
                  if (clearSave(browserStorage())) reloadAt("#/");
                  else
                    setMessage("Nie udało się usunąć zapisu. Wyczyść dane witryny w przeglądarce.");
                }}
              >
                Tak, przywróć dane startowe
              </Button>
              <Button variant="outline" onClick={() => showConfirm(false)}>
                Anuluj
              </Button>
            </div>
          </div>
        ) : (
          <Button ref={trigger} variant="ghost" onClick={() => showConfirm(true)}>
            Przywróć dane startowe…
          </Button>
        )}
        {message && (
          <p className="prototype-error" role="alert">
            {message}
          </p>
        )}
        <p>
          Zgłoś problem prowadzącemu kursu: opisz ekran, na którym wystąpił błąd, i ostatnie
          kliknięcie. Nie przesyłaj danych osobowych ani pliku z danymi, jeśli zawiera prawdziwe
          informacje.
        </p>
        <p>Wersja aplikacji: {buildLabel()}</p>
      </div>
    </section>
  );
}

/**
 * Production logging for render errors (see main.tsx): only the error type and component
 * stack, because messages may echo user-entered text. Development keeps React's full output.
 */
export function logRenderError(error: unknown, info: Pick<ErrorInfo, "componentStack">) {
  const exception = error instanceof Error ? error : new Error("Unknown render error");
  if (isPostHogConfigured) posthog.captureException(exception);
  posthogLogger.error("render_error_captured", {
    error_type: exception.name,
    has_component_stack: Boolean(info.componentStack),
  });
  console.error(`Render error (${exception.name})`, info.componentStack ?? "");
}

/** Catches render errors below it. Remount it (e.g. with a route key) to retry. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <ErrorFallback /> : this.props.children;
  }
}
