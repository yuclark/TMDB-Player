import type {
  HistoryItem,
  MediaType,
  TmdbDetail,
  TmdbEpisode,
  TmdbGenre,
  TmdbMediaItem,
  TmdbPagedResponse,
  TmdbSeasonDetail,
  WatchlistItem,
} from '../types/tmdb';

const IMG_BASE = 'https://image.tmdb.org/t/p';

export function getPosterUrl(path: string | null | undefined, size: 'w185' | 'w342' | 'w500' = 'w342'): string | null {
  return path ? `${IMG_BASE}/${size}${path}` : null;
}

export function getBackdropUrl(path: string | null | undefined, size: 'w780' | 'w1280' | 'original' = 'w1280'): string | null {
  return path ? `${IMG_BASE}/${size}${path}` : null;
}

export function getDisplayTitle(item: { title?: string; name?: string }): string {
  return item.title || item.name || 'Untitled';
}

export function getReleaseYear(item: { release_date?: string | null; first_air_date?: string | null }): string {
  const raw = item.release_date || item.first_air_date || '';
  return raw ? raw.slice(0, 4) : '';
}

export function formatRuntime(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err = new Error(`Request failed (${res.status})`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

// Auth
export const getAuthStatus = () =>
  apiJson<{ protected: boolean; authenticated: boolean }>('/api/auth/status');

export const loginWithPasscode = (passcode: string) =>
  apiJson<{ ok: boolean }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ passcode }),
  });

export const logoutSession = () =>
  apiJson<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });

// TMDB
export const fetchTrending = (type: 'all' | MediaType = 'all', window: 'day' | 'week' = 'week') =>
  apiJson<TmdbPagedResponse<TmdbMediaItem>>(`/api/tmdb/trending/${type}/${window}?language=en-US`);

export const fetchMovieList = (category: 'popular' | 'top_rated' | 'now_playing', page = 1) =>
  apiJson<TmdbPagedResponse<TmdbMediaItem>>(`/api/tmdb/movie/${category}?language=en-US&page=${page}`);

export const fetchTvList = (category: 'popular' | 'top_rated' | 'on_the_air', page = 1) =>
  apiJson<TmdbPagedResponse<TmdbMediaItem>>(`/api/tmdb/tv/${category}?language=en-US&page=${page}`);

export const fetchGenres = (type: MediaType) =>
  apiJson<{ genres: TmdbGenre[] }>(`/api/tmdb/genre/${type}/list?language=en-US`);

export const discoverMedia = (
  type: MediaType,
  options: { genreId?: number | null; sortBy?: string; page?: number }
) => {
  const params = new URLSearchParams({
    language: 'en-US',
    include_adult: 'false',
    page: String(options.page ?? 1),
    sort_by: options.sortBy ?? 'popularity.desc',
    'vote_count.gte': options.sortBy === 'vote_average.desc' ? '200' : '25',
  });
  if (options.genreId) {
    params.set('with_genres', String(options.genreId));
  }
  return apiJson<TmdbPagedResponse<TmdbMediaItem>>(`/api/tmdb/discover/${type}?${params.toString()}`);
};

export const searchMulti = (query: string, page = 1) =>
  apiJson<TmdbPagedResponse<TmdbMediaItem>>(
    `/api/tmdb/search/multi?language=en-US&include_adult=false&query=${encodeURIComponent(query)}&page=${page}`
  );

export const fetchMediaDetail = (type: MediaType, id: number) =>
  apiJson<TmdbDetail>(
    `/api/tmdb/${type}/${id}?language=en-US&append_to_response=external_ids,credits,videos,recommendations,similar`
  );

export const fetchSeasonDetail = (tvId: number, seasonNumber: number) =>
  apiJson<TmdbSeasonDetail>(`/api/tmdb/tv/${tvId}/season/${seasonNumber}?language=en-US`);

export const fetchEpisodeDetail = (tvId: number, seasonNumber: number, episodeNumber: number) =>
  apiJson<TmdbEpisode>(
    `/api/tmdb/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}?language=en-US&append_to_response=external_ids`
  );

// Shared D1 Watchlist & Continue Watching
export const fetchWatchlist = () => apiJson<{ items: WatchlistItem[] }>('/api/watchlist');

export const addWatchlistItem = (item: Omit<WatchlistItem, 'added_at'>) =>
  apiJson<{ ok: boolean; added_at: number }>('/api/watchlist', {
    method: 'POST',
    body: JSON.stringify(item),
  });

export const removeWatchlistItem = (mediaType: MediaType, tmdbId: number) =>
  apiJson<{ ok: boolean }>(`/api/watchlist/${mediaType}/${tmdbId}`, { method: 'DELETE' });

export const fetchWatchHistory = () => apiJson<{ items: HistoryItem[] }>('/api/history');

export const saveWatchHistory = (item: Omit<HistoryItem, 'updated_at'>) =>
  apiJson<{ ok: boolean; updated_at: number }>('/api/history', {
    method: 'POST',
    body: JSON.stringify(item),
  });

export const removeWatchHistory = (mediaType: MediaType, tmdbId: number) =>
  apiJson<{ ok: boolean }>(`/api/history/${mediaType}/${tmdbId}`, { method: 'DELETE' });
