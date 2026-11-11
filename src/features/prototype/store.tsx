import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { initialState, transition, type Action, type State } from "./model";
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
function useStore() {
  const [loaded] = useState(() => readState(browserStorage()));
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
      setIssue((e as Error).message);
    }
  }
  function reloadFromStorage() {
    const current = readState(browserStorage());
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
      commit(transition(latest.current, action));
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
      commit(next, true);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
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
    reset: () => commit(initialState(), true),
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
