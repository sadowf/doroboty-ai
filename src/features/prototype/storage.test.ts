import { describe, expect, it } from "vitest";
import { initialState } from "./model";
import {
  clearSave,
  isScenarioStorageEvent,
  MAX_IMPORT_BYTES,
  parseState,
  readRawSave,
  readState,
  saveState,
  serializeState,
  STORAGE_KEY,
} from "./storage";
function memory(raw: string | null = null) {
  const values = new Map(raw === null ? [] : [[STORAGE_KEY, raw]]);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}
describe("browser persistence and recovery", () => {
  it("round-trips a complete valid scenario", () => {
    const storage = memory();
    const s = initialState();
    saveState(storage, s);
    expect(readState(storage).state).toEqual(s);
    expect(parseState(serializeState(s))).toEqual(s);
  });
  it("protects incompatible/corrupt original saves", () => {
    for (const raw of ["{", JSON.stringify({ ...initialState(), version: 2 })]) {
      const storage = memory(raw);
      const loaded = readState(storage);
      expect(loaded.blocked).toBe(true);
      expect(loaded.original).toBe(raw);
      expect(storage.getItem(STORAGE_KEY)).toBe(raw);
    }
  });
  it("does not fail startup when storage access is denied", () => {
    expect(readState(null).state.jobs.length).toBeGreaterThan(0);
    expect(
      readState({
        getItem() {
          throw new Error("Denied");
        },
        setItem() {},
      }).blocked,
    ).toBe(true);
  });
  it("reports quota/write failure without altering the original", () => {
    const old = "old";
    const storage = {
      getItem: () => old,
      setItem() {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => saveState(storage, initialState())).toThrow("Wyeksportuj");
    expect(storage.getItem()).toBe(old);
  });
  it("rejects invalid references and oversized files", () => {
    const s = initialState();
    s.saved = [{ candidateId: "missing", jobId: s.jobs[0].id }];
    expect(() => parseState(JSON.stringify(s))).toThrow("Dotychczasowy stan");
    expect(() => parseState(" ".repeat(MAX_IMPORT_BYTES + 1))).toThrow("za duży");
  });
  it("loads saves and exports created before the contribution card and exports the new fields", () => {
    const state = initialState();
    const legacy = JSON.parse(serializeState(state));
    for (const job of legacy.jobs) delete job.contributionCard;
    const storage = memory(JSON.stringify(legacy));
    const loaded = readState(storage);
    expect(loaded.blocked).toBe(false);
    expect(loaded.state).toEqual(state);
    expect(parseState(JSON.stringify(legacy))).toEqual(state);
    expect(JSON.parse(serializeState(loaded.state)).jobs[0].contributionCard).toBe("none");
  });
  it("accepts legacy appearance preferences without changing scenario data", () => {
    const state = initialState();
    for (const theme of ["dark", "system", "light"]) {
      expect(parseState(JSON.stringify({ ...state, theme }))).toEqual(state);
    }
  });
  it("recognises scenario changes made in another tab", () => {
    expect(isScenarioStorageEvent(STORAGE_KEY)).toBe(true);
    expect(isScenarioStorageEvent(null)).toBe(true);
    expect(isScenarioStorageEvent("unrelated.key")).toBe(false);
  });
  it("reads and clears the raw save for emergency recovery without throwing", () => {
    const storage = memory("{broken");
    expect(readRawSave(storage)).toBe("{broken");
    expect(clearSave(storage)).toBe(true);
    expect(readRawSave(storage)).toBeNull();
    expect(readState(storage).blocked).toBe(false);
    const denied = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => undefined,
    };
    expect(readRawSave(denied)).toBeNull();
    expect(readRawSave(null)).toBeNull();
    expect(clearSave(denied)).toBe(false);
    expect(clearSave(null)).toBe(false);
  });
});
