import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  applyTasteSignal,
  EMPTY_TASTE_PROFILE,
  mediaKey,
  type TasteProfile,
} from '../lib/recommendations';
import type { HistoryItem, MediaType, WatchlistItem } from '../types/tmdb';

const WATCHLIST_KEY = 'kino_watchlist_v1';
const HISTORY_KEY = 'kino_history_v1';
const TASTE_KEY = 'kino_taste_v1';

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export interface LibraryContextValue {
  watchlist: WatchlistItem[];
  history: HistoryItem[];
  taste: TasteProfile;
  isInWatchlist: (type: MediaType, id: number) => boolean;
  isLiked: (type: MediaType, id: number) => boolean;
  isDismissed: (type: MediaType, id: number) => boolean;
  toggleWatchlist: (item: Omit<WatchlistItem, 'added_at'>, genreIds?: number[]) => void;
  recordWatch: (item: Omit<HistoryItem, 'updated_at'>, genreIds?: number[]) => void;
  recordView: (meta: { media_type: MediaType; tmdb_id: number; title: string; genre_ids?: number[] }) => void;
  toggleLike: (meta: { media_type: MediaType; tmdb_id: number; title: string; genre_ids?: number[] }) => void;
  dismissRecommendation: (meta: { media_type: MediaType; tmdb_id: number; title: string; genre_ids?: number[] }) => void;
  dismissHistory: (type: MediaType, id: number) => void;
  resetTasteProfile: () => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() =>
    readStorage<WatchlistItem[]>(WATCHLIST_KEY, [])
  );
  const [history, setHistory] = useState<HistoryItem[]>(() =>
    readStorage<HistoryItem[]>(HISTORY_KEY, [])
  );
  const [taste, setTaste] = useState<TasteProfile>(() =>
    readStorage<TasteProfile>(TASTE_KEY, EMPTY_TASTE_PROFILE)
  );

  useEffect(() => writeStorage(WATCHLIST_KEY, watchlist), [watchlist]);
  useEffect(() => writeStorage(HISTORY_KEY, history), [history]);
  useEffect(() => writeStorage(TASTE_KEY, taste), [taste]);

  const isInWatchlist = useCallback(
    (type: MediaType, id: number) =>
      watchlist.some((w) => w.media_type === type && w.tmdb_id === id),
    [watchlist]
  );

  const isLiked = useCallback(
    (type: MediaType, id: number) => taste.liked.includes(mediaKey(type, id)),
    [taste.liked]
  );

  const isDismissed = useCallback(
    (type: MediaType, id: number) => taste.dismissed.includes(mediaKey(type, id)),
    [taste.dismissed]
  );

  const toggleWatchlist = useCallback(
    (item: Omit<WatchlistItem, 'added_at'>, genreIds?: number[]) => {
      const exists = watchlist.some(
        (w) => w.media_type === item.media_type && w.tmdb_id === item.tmdb_id
      );

      if (exists) {
        setWatchlist((prev) =>
          prev.filter((w) => !(w.media_type === item.media_type && w.tmdb_id === item.tmdb_id))
        );
      } else {
        const entry: WatchlistItem = { ...item, added_at: Date.now() };
        setWatchlist((prev) => [entry, ...prev]);
        setTaste((prev) =>
          applyTasteSignal(prev, {
            media_type: item.media_type,
            tmdb_id: item.tmdb_id,
            title: item.title,
            genre_ids: genreIds,
            weight: 3,
          })
        );
      }
    },
    [watchlist]
  );

  const recordWatch = useCallback(
    (item: Omit<HistoryItem, 'updated_at'>, genreIds?: number[]) => {
      const entry: HistoryItem = { ...item, updated_at: Date.now() };
      setHistory((prev) => [
        entry,
        ...prev.filter((h) => !(h.media_type === item.media_type && h.tmdb_id === item.tmdb_id)),
      ].slice(0, 40));

      setTaste((prev) =>
        applyTasteSignal(prev, {
          media_type: item.media_type,
          tmdb_id: item.tmdb_id,
          title: item.title,
          genre_ids: genreIds,
          weight: 4,
        })
      );
    },
    []
  );

  const recordView = useCallback(
    (meta: { media_type: MediaType; tmdb_id: number; title: string; genre_ids?: number[] }) => {
      setTaste((prev) =>
        applyTasteSignal(prev, {
          ...meta,
          weight: 1,
        })
      );
    },
    []
  );

  const toggleLike = useCallback(
    (meta: { media_type: MediaType; tmdb_id: number; title: string; genre_ids?: number[] }) => {
      const key = mediaKey(meta.media_type, meta.tmdb_id);
      setTaste((prev) => {
        if (prev.liked.includes(key)) {
          return {
            ...prev,
            liked: prev.liked.filter((k) => k !== key),
          };
        }
        return applyTasteSignal(prev, {
          ...meta,
          weight: 5,
          markLiked: true,
        });
      });
    },
    []
  );

  const dismissRecommendation = useCallback(
    (meta: { media_type: MediaType; tmdb_id: number; title: string; genre_ids?: number[] }) => {
      setTaste((prev) =>
        applyTasteSignal(prev, {
          ...meta,
          weight: -3,
          markDismissed: true,
        })
      );
    },
    []
  );

  const dismissHistory = useCallback((type: MediaType, id: number) => {
    setHistory((prev) => prev.filter((h) => !(h.media_type === type && h.tmdb_id === id)));
  }, []);

  const resetTasteProfile = useCallback(() => {
    setTaste(EMPTY_TASTE_PROFILE);
  }, []);

  return (
    <LibraryContext.Provider
      value={{
        watchlist,
        history,
        taste,
        isInWatchlist,
        isLiked,
        isDismissed,
        toggleWatchlist,
        recordWatch,
        recordView,
        toggleLike,
        dismissRecommendation,
        dismissHistory,
        resetTasteProfile,
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
