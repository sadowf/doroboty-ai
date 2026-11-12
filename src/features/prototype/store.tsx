import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import posthog, { isPostHogConfigured } from "@/lib/posthog";
import { posthogLogger } from "@/lib/posthog-logger";
import { currentPerson, initialState, transition, type Action, type State } from "./model";
import {
  isScenarioStorageEvent,
  parseState,
  readState,
  saveState,
  type StoragePort,
} from "./storage";
const OUTDATED_ERROR =
  "Dane zmieniono w innej karcie. Wczytaj aktualne dane, zanim wprowadzisz kolejne zmiany.";
function browserStorage(): StoragePort | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function identifyPerson(person: State["people"][number]) {
  if (!isPostHogConfigured) return;

  posthog.identify(person.id, {
    name: person.name,
    role: person.role,
  });
}

function syncPersonIdentity(previousPersonId: string | null, next: State) {
  if (previousPersonId === next.activePersonId) return;

  if (previousPersonId && isPostHogConfigured) posthog.reset();

  const person = currentPerson(next);
  if (person) identifyPerson(person);
}

function captureAction(action: Action, previous: State, next: State) {
  if (!isPostHogConfigured) return;

  switch (action.type) {
    case "select_person": {
      const person = currentPerson(next);
      if (person) posthog.capture("person_selected", { role: person.role });
      return;
    }
    case "profile":
      posthog.capture("profile_saved");
      return;
    case "toggle_saved": {
      const wasSaved = previous.saved.some(
        (item) => item.candidateId === previous.activePersonId && item.jobId === action.jobId,
      );
      posthog.capture(wasSaved ? "job_unsaved" : "job_saved", { job_id: action.jobId });
      return;
    }
    case "draft":
      posthog.capture("application_draft_saved", {
        job_id: action.jobId,
        contribution_card_included: Boolean(action.contributionCard),
      });
      return;
    case "submit": {
      const job = next.jobs.find((item) => item.id === action.jobId);
      if (job)
        posthog.capture("application_submitted", {
          job_id: job.id,
          job_category: job.category,
          contribution_card_mode: job.contributionCard,
        });
      return;
    }
    case "stage":
      posthog.capture("application_stage_updated", { stage: action.stage });
      return;
    case "withdraw":
      posthog.capture("application_withdrawn");
      return;
    case "publish": {
      const job = next.jobs.find((item) => item.id === action.job.id);
      if (job)
        posthog.capture("job_published", {
          is_new: !previous.jobs.some((item) => item.id === job.id),
          job_category: job.category,
          publication_status: job.publicationStatus,
        });
      return;
    }
    case "company":
      posthog.capture("company_profile_updated");
  }
}

function useStore() {
  const [loaded] = useState(() => {
    const persisted = readState(browserStorage());
    const person = currentPerson(persisted.state);
    if (person) identifyPerson(person);
    posthogLogger.info("prototype_state_loaded", {
      storage_state: persisted.blocked
        ? "recovery_required"
        : persisted.issue
          ? "unavailable"
          : "ready",
    });
    return persisted;
  });
  const [state, setState] = useState(loaded.state);
  const [issue, setIssue] = useState(loaded.issue);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(loaded.blocked);
  const [original, setOriginal] = useState(loaded.original);
  // Another tab saved the scenario: this tab's copy is stale and must not overwrite it.
  const [outdated, setOutdated] = useState(false);
  const latest = useRef(state);
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (isScenarioStorageEvent(event.key)) setOutdated(true);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  function commit(next: State, replace = false) {
    latest.current = next;
    setState(next);
    setError("");
    if ((blocked || outdated) && !replace) return;
    try {
      saveState(browserStorage(), next);
      setIssue("");
      if (replace) {
        setBlocked(false);
        setOutdated(false);
      }
    } catch (e) {
      posthogLogger.warn("prototype_state_save_failed", {
        error_type: e instanceof Error ? e.name : "unknown",
      });
      setIssue((e as Error).message);
    }
  }
  function reloadFromStorage() {
    const current = readState(browserStorage());
    syncPersonIdentity(latest.current.activePersonId, current.state);
    latest.current = current.state;
    setState(current.state);
    setIssue(current.issue);
    setBlocked(current.blocked);
    setOriginal(current.original);
    setError("");
    setOutdated(false);
  }
  function run(action: Action) {
    if (outdated) {
      setError(OUTDATED_ERROR);
      return false;
    }
    try {
      const previous = latest.current;
      const previousPersonId = previous.activePersonId;
      const next = transition(previous, action);
      commit(next);

      if (action.type === "select_person") syncPersonIdentity(previousPersonId, next);
      captureAction(action, previous, next);

      return true;
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "ZodError"
          ? e.message
          : "Sprawdź poprawność i długość wprowadzonych danych.",
      );
      return false;
    }
  }
  function importState(raw: string) {
    try {
      const next = parseState(raw);
      syncPersonIdentity(latest.current.activePersonId, next);
      commit(next, true);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  function resetStore() {
    const next = initialState();
    syncPersonIdentity(latest.current.activePersonId, next);
    commit(next, true);
  }
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);
  return {
    state,
    issue,
    error,
    blocked,
    outdated,
    original,
    run,
    importState,
    reloadFromStorage,
    clearError: () => setError(""),
    reset: resetStore,
  };
}
type Store = ReturnType<typeof useStore>;
const Context = createContext<Store | null>(null);
export function PrototypeProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function usePrototype() {
  const store = useContext(Context);
  if (!store) throw new Error("PrototypeProvider is required");
  return store;
}
