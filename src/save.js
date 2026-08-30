import { normalizeState } from "./state.js";

const SAVE_KEY = "zillion-hero-save-v4";

export function saveGame(state, now = Date.now()) {
  state.meta.lastSavedAt = now;
  state.meta.lastTickAt = now;
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  return now;
}

export function loadGame(now = Date.now()) {
  try {
    const stored = localStorage.getItem(SAVE_KEY);
    if (!stored) return null;
    return normalizeState(JSON.parse(stored), now);
  } catch (error) {
    console.warn("Could not load Zillion Hero save", error);
    return null;
  }
}

export function serializeGame(state) {
  return JSON.stringify({
    format: "zillion-hero-save",
    exportedAt: new Date().toISOString(),
    state,
  }, null, 2);
}

export function downloadSave(state) {
  const blob = new Blob([serializeGame(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `zillion-hero-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importSaveFile(file, now = Date.now()) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const rawState = parsed?.format === "zillion-hero-save" ? parsed.state : parsed;
  return normalizeState(rawState, now);
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

export function offlineSecondsFor(state, now = Date.now()) {
  const cap = Math.max(1, state.settings.offlineCapHours) * 3600;
  return Math.min(cap, Math.max(0, (now - (state.meta.lastTickAt ?? now)) / 1000));
}

