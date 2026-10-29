"use client";

import {
  type FavoriteItem,
  readFavorites,
  toggleFavorite as toggleFavoriteStorage,
} from "@/lib/favorites/storage";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("legis-favorites-changed", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("legis-favorites-changed", callback);
  };
}

function getSnapshot() {
  return JSON.stringify(readFavorites());
}

function getServerSnapshot() {
  return "[]";
}

export function useFavorites() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const favorites = JSON.parse(raw) as FavoriteItem[];
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const isFavorite = useCallback(
    (key: string) => favorites.some((f) => f.key === key),
    [favorites],
  );

  const toggleFavorite = useCallback((item: FavoriteItem) => {
    return toggleFavoriteStorage(item);
  }, []);

  return { favorites, isFavorite, toggleFavorite, hydrated };
}
