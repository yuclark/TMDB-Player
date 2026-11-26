import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  addWatchlistItem,
  fetchWatchHistory,
  fetchWatchlist,
  removeWatchHistory,
  removeWatchlistItem,
  saveWatchHistory,
} from '../lib/api';
import type { HistoryItem, MediaType, WatchlistItem } from '../types/tmdb';

interface LibraryContextValue {
  watchlist: WatchlistItem[];
  history: HistoryItem[];
  loading: boolean;
  isInWatchlist: (type: MediaType, id: number) => boolean;
  toggleWatchlist: (item: Omit<WatchlistItem, 'added_at'>) => Promise<void>;
  recordWatch: (item: Omit<HistoryItem, 'updated_at'>) => Promise<void>;
  dismissHistory: (type: MediaType, id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const [w, h] = await Promise.all([fetchWatchlist(), fetchWatchHistory()]);
      setWatchlist(w.items);
      setHistory(h.items);
    } catch {
      // Keep current state on transient errors
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isInWatchlist = useCallback(
    (type: MediaType, id: number) =>
      watchlist.some((w) => w.media_type === type && w.tmdb_id === id),
    [watchlist]
  );

  const toggleWatchlist = useCallback(
    async (item: Omit<WatchlistItem, 'added_at'>) => {
      const exists = watchlist.some(
        (w) => w.media_type === item.media_type && w.tmdb_id === item.tmdb_id
      );

      if (exists) {
        setWatchlist((prev) =>
          prev.filter((w) => !(w.media_type === item.media_type && w.tmdb_id === item.tmdb_id))
        );
        try {
          await removeWatchlistItem(item.media_type, item.tmdb_id);
        } catch {
          void refresh();
        }
      } else {
        const optimistic: WatchlistItem = { ...item, added_at: Date.now() };
        setWatchlist((prev) => [optimistic, ...prev]);
        try {
          await addWatchlistItem(item);
        } catch {
          void refresh();
        }
      }
    },
    [watchlist, refresh]
  );

  const recordWatch = useCallback(async (item: Omit<HistoryItem, 'updated_at'>) => {
    const entry: HistoryItem = { ...item, updated_at: Date.now() };
    setHistory((prev) => [
      entry,
      ...prev.filter((h) => !(h.media_type === item.media_type && h.tmdb_id === item.tmdb_id)),
    ]);
    try {
      await saveWatchHistory(item);
    } catch {
      // Non-fatal
    }
  }, []);

  const dismissHistory = useCallback(
    async (type: MediaType, id: number) => {
      setHistory((prev) => prev.filter((h) => !(h.media_type === type && h.tmdb_id === id)));
      try {
        await removeWatchHistory(type, id);
      } catch {
        void refresh();
      }
    },
    [refresh]
  );

  return (
    <LibraryContext.Provider
      value={{
        watchlist,
        history,
        loading,
        isInWatchlist,
        toggleWatchlist,
        recordWatch,
        dismissHistory,
        refresh,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider');
  return ctx;
}
