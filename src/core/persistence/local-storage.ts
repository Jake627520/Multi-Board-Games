import type { GameId } from "../game/types";

export interface SaveMeta {
  readonly id: string;
  readonly name: string;
  readonly gameId: GameId;
  readonly savedAt: string; // ISO
  readonly moveCount: number;
  readonly data: string; // GameSaveEnvelope JSON
}

const PREFIX = "mbg-save:";
const MAX_SAVES_PER_GAME = 20;

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const memoryStorage = new MemoryStorage();

export function getStorage(): Storage {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== "undefined") {
      return localStorage;
    }
  } catch {
    /* fallback when localStorage access is denied in strict sandbox/private browsing */
  }
  return memoryStorage;
}

function storageKey(id: string): string {
  return `${PREFIX}${id}`;
}

function safeParse(raw: string | null): SaveMeta | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (
      obj &&
      typeof obj.id === "string" &&
      typeof obj.name === "string" &&
      typeof obj.gameId === "string" &&
      typeof obj.savedAt === "string" &&
      typeof obj.moveCount === "number" &&
      typeof obj.data === "string"
    ) {
      return obj as SaveMeta;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function listSaves(gameId?: GameId): SaveMeta[] {
  const storage = getStorage();
  const result: SaveMeta[] = [];

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith(PREFIX)) continue;
    const meta = safeParse(storage.getItem(key));
    if (!meta) continue;
    if (gameId && meta.gameId !== gameId) continue;
    result.push(meta);
  }
  return result.sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export function saveGameToStorage(
  gameId: GameId,
  name: string,
  data: string,
  moveCount: number
): SaveMeta {
  const storage = getStorage();
  const id = `${gameId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const meta: SaveMeta = {
    id,
    name: name.trim() || `存檔 ${new Date().toLocaleString()}`,
    gameId,
    savedAt: new Date().toISOString(),
    moveCount,
    data,
  };

  storage.setItem(storageKey(id), JSON.stringify(meta));

  // 容量防護：同一遊戲只保留最新 N 筆
  const all = listSaves(gameId);
  if (all.length > MAX_SAVES_PER_GAME) {
    for (const old of all.slice(MAX_SAVES_PER_GAME)) {
      storage.removeItem(storageKey(old.id));
    }
  }

  return meta;
}

export function loadSaveFromStorage(id: string): SaveMeta | null {
  const storage = getStorage();
  return safeParse(storage.getItem(storageKey(id)));
}

export function deleteSave(id: string): void {
  const storage = getStorage();
  storage.removeItem(storageKey(id));
}

export function renameSave(id: string, newName: string): SaveMeta | null {
  const storage = getStorage();
  const meta = loadSaveFromStorage(id);
  if (!meta) return null;
  const updated: SaveMeta = {
    ...meta,
    name: newName.trim() || meta.name,
  };
  storage.setItem(storageKey(id), JSON.stringify(updated));
  return updated;
}
