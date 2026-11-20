import { useSyncExternalStore } from "react";

import type { ConversionResult } from "./convert";

/** 기록과 단어장은 이 기기(브라우저)에만 저장됩니다. */

export interface VocabItem {
  id: string;
  word: string;
  easy: string;
  meaning: string;
  sentence: string;
  source: string;
  status: "learning" | "done";
  createdAt: string;
}

const EMPTY: never[] = [];

function createCollection<T>(key: string) {
  let cacheRaw: string | null = null;
  let cache: T[] = EMPTY;
  const listeners = new Set<() => void>();

  const read = (): T[] => {
    if (typeof window === "undefined") return EMPTY;
    const raw = window.localStorage.getItem(key);
    if (raw !== cacheRaw) {
      cacheRaw = raw;
      try {
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        cache = Array.isArray(parsed) ? (parsed as T[]) : EMPTY;
      } catch {
        cache = EMPTY;
      }
    }
    return cache;
  };

  const write = (next: T[]) => {
    window.localStorage.setItem(key, JSON.stringify(next));
    listeners.forEach((l) => l());
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) listener();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot: read,
    getServerSnapshot: (): T[] => EMPTY,
    update(fn: (items: T[]) => T[]) {
      write(fn(read()));
    },
  };
}

export const historyStore = createCollection<ConversionResult>("pureo:history");
export const vocabStore = createCollection<VocabItem>("pureo:vocab");

type Collection<T> = ReturnType<typeof createCollection<T>>;

export function useCollection<T>(store: Collection<T>): T[] {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

export function saveHistory(result: ConversionResult) {
  historyStore.update((items) => [result, ...items.filter((i) => i.id !== result.id)].slice(0, 100));
}

export function removeHistory(id: string) {
  historyStore.update((items) => items.filter((i) => i.id !== id));
}

export function addVocab(item: Omit<VocabItem, "id" | "status" | "createdAt">): boolean {
  let added = false;
  vocabStore.update((items) => {
    if (items.some((i) => i.word === item.word && i.source === item.source)) return items;
    added = true;
    return [
      {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        status: "learning",
        createdAt: new Date().toISOString(),
      },
      ...items,
    ];
  });
  return added;
}

export function setVocabStatus(id: string, status: VocabItem["status"]) {
  vocabStore.update((items) => items.map((i) => (i.id === id ? { ...i, status } : i)));
}

export function removeVocab(id: string) {
  vocabStore.update((items) => items.filter((i) => i.id !== id));
}
