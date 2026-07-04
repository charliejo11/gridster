import { useEffect, useState } from "react";

export const GRIDSTER_STORAGE_KEY = "gridster-preferences-v1";
export const DEFAULT_GRIDSTER_STORAGE = {
  activePage: "Home",
  showLanding: true,
  theme: "dark-neon",
  likedPosts: {},
  savedPosts: {},
  notForMePosts: {},
  followedCreators: {},
  joinedGroups: {},
};

export function readGridsterStorage() {
  if (typeof window === "undefined") {
    return DEFAULT_GRIDSTER_STORAGE;
  }

  try {
    const saved = window.localStorage.getItem(GRIDSTER_STORAGE_KEY);
    const parsedValue = saved ? JSON.parse(saved) : {};
    const parsed = parsedValue && typeof parsedValue === "object" ? parsedValue : {};

    return {
      ...DEFAULT_GRIDSTER_STORAGE,
      ...parsed,
      likedPosts: { ...DEFAULT_GRIDSTER_STORAGE.likedPosts, ...(parsed.likedPosts ?? {}) },
      savedPosts: { ...DEFAULT_GRIDSTER_STORAGE.savedPosts, ...(parsed.savedPosts ?? {}) },
      notForMePosts: { ...DEFAULT_GRIDSTER_STORAGE.notForMePosts, ...(parsed.notForMePosts ?? {}) },
      followedCreators: { ...DEFAULT_GRIDSTER_STORAGE.followedCreators, ...(parsed.followedCreators ?? {}) },
      joinedGroups: { ...DEFAULT_GRIDSTER_STORAGE.joinedGroups, ...(parsed.joinedGroups ?? {}) },
    };
  } catch {
    return DEFAULT_GRIDSTER_STORAGE;
  }
}

export function writeGridsterStorage(nextStorage) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(GRIDSTER_STORAGE_KEY, JSON.stringify(nextStorage));
  } catch {
    // Keep the prototype usable if localStorage is unavailable.
  }
}

export function saveGridsterValue(key, value) {
  writeGridsterStorage({
    ...readGridsterStorage(),
    [key]: value,
  });
}

export function saveGridsterFlag(collection, id, value) {
  const currentStorage = readGridsterStorage();
  const currentCollection = currentStorage[collection] ?? {};
  const nextCollection = { ...currentCollection };

  if (value) {
    nextCollection[id] = true;
  } else {
    delete nextCollection[id];
  }

  writeGridsterStorage({
    ...currentStorage,
    [collection]: nextCollection,
  });
}

export function usePersistedGridsterValue(key, defaultValue) {
  const [value, setValue] = useState(() => readGridsterStorage()[key] ?? defaultValue);

  useEffect(() => {
    saveGridsterValue(key, value);
  }, [key, value]);

  return [value, setValue];
}

export function usePersistedGridsterFlag(collection, id, defaultValue = false) {
  const storageId = String(id ?? "default");
  const [value, setValue] = useState(() => Boolean(readGridsterStorage()[collection]?.[storageId] ?? defaultValue));

  useEffect(() => {
    saveGridsterFlag(collection, storageId, value);
  }, [collection, storageId, value]);

  return [value, setValue];
}
