import { discoverMedia, fetchMediaRecommendations } from './api';
import type { HistoryItem, MediaType, TmdbMediaItem, WatchlistItem } from '../types/tmdb';

export interface TasteSignalSeed {
  media_type: MediaType;
  tmdb_id: number;
  title: string;
  genre_ids: number[];
  weight: number;
  timestamp: number;
}

export interface TasteProfile {
  /** Genre ID -> cumulative affinity score (positive = liked, negative = dismissed) */
  genreScores: Record<number, number>;
  /** Media type preference counts */
  typeAffinity: { movie: number; tv: number };
  /** Explicitly liked titles ("movie:27205") */
  liked: string[];
  /** Explicitly dismissed titles ("movie:27205") */
  dismissed: string[];
  /** Recent high-signal seeds (watched, liked, saved, viewed) */
  seeds: TasteSignalSeed[];
}

export interface RecommendationFeed {
  forYou: TmdbMediaItem[];
  becauseYouSeed: { title: string; type: MediaType; id: number; items: TmdbMediaItem[] } | null;
  topGenres: Array<{ id: number; name: string; score: number }>;
  isPersonalized: boolean;
}

export const GENRE_NAMES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

export const EMPTY_TASTE_PROFILE: TasteProfile = {
  genreScores: {},
  typeAffinity: { movie: 0, tv: 0 },
  liked: [],
  dismissed: [],
  seeds: [],
};

export function mediaKey(type: MediaType, id: number): string {
  return `${type}:${id}`;
}

export function applyTasteSignal(
  profile: TasteProfile,
  signal: {
    media_type: MediaType;
    tmdb_id: number;
    title: string;
    genre_ids?: number[];
    weight: number;
    markLiked?: boolean;
    markDismissed?: boolean;
  }
): TasteProfile {
  const key = mediaKey(signal.media_type, signal.tmdb_id);
  const genreScores = { ...profile.genreScores };
  const genres = signal.genre_ids ?? [];

  for (const gid of genres) {
    const next = (genreScores[gid] ?? 0) + signal.weight;
    genreScores[gid] = Math.max(-20, Math.min(80, Number(next.toFixed(2))));
  }

  const typeAffinity = { ...profile.typeAffinity };
  if (signal.weight > 0) {
    typeAffinity[signal.media_type] = (typeAffinity[signal.media_type] ?? 0) + signal.weight;
  }

  let liked = profile.liked;
  let dismissed = profile.dismissed;

  if (signal.markLiked) {
    liked = Array.from(new Set([key, ...liked])).slice(0, 120);
    dismissed = dismissed.filter((k) => k !== key);
  }
  if (signal.markDismissed) {
    dismissed = Array.from(new Set([key, ...dismissed])).slice(0, 200);
    liked = liked.filter((k) => k !== key);
  }

  let seeds = profile.seeds;
  if (signal.weight >= 1 && !signal.markDismissed) {
    const existing = seeds.find(
      (s) => s.media_type === signal.media_type && s.tmdb_id === signal.tmdb_id
    );
    const updatedSeed: TasteSignalSeed = {
      media_type: signal.media_type,
      tmdb_id: signal.tmdb_id,
      title: signal.title,
      genre_ids: genres.length ? genres : existing?.genre_ids ?? [],
      weight: Math.min(25, (existing?.weight ?? 0) + signal.weight),
      timestamp: Date.now(),
    };
    seeds = [
      updatedSeed,
      ...seeds.filter((s) => !(s.media_type === signal.media_type && s.tmdb_id === signal.tmdb_id)),
    ].slice(0, 24);
  } else if (signal.markDismissed) {
    seeds = seeds.filter((s) => !(s.media_type === signal.media_type && s.tmdb_id === signal.tmdb_id));
  }

  return {
    genreScores,
    typeAffinity,
    liked,
    dismissed,
    seeds,
  };
}

export function getTopGenres(profile: TasteProfile, limit = 5): Array<{ id: number; name: string; score: number }> {
  return Object.entries(profile.genreScores)
    .map(([id, score]) => ({
      id: Number(id),
      name: GENRE_NAMES[Number(id)] ?? `Genre ${id}`,
      score,
    }))
    .filter((g) => g.score > 0 && Boolean(GENRE_NAMES[g.id]))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Generates a personalized, zero-login recommendation feed using:
 * 1. Collaborative filtering via TMDB /recommendations on top local seed titles
 * 2. Content-based genre discovery via TMDB /discover tuned to local genre affinity
 * 3. Client-side re-ranking combining multi-seed overlap, genre affinity, and quality
 */
export async function buildRecommendationFeed(
  profile: TasteProfile,
  watchlist: WatchlistItem[],
  history: HistoryItem[]
): Promise<RecommendationFeed> {
  const topGenres = getTopGenres(profile, 5);

  // Merge strong seeds from taste profile, history, and watchlist
  const seedMap = new Map<string, TasteSignalSeed>();
  for (const s of profile.seeds) {
    seedMap.set(mediaKey(s.media_type, s.tmdb_id), s);
  }
  for (const h of history.slice(0, 8)) {
    const k = mediaKey(h.media_type, h.tmdb_id);
    if (!seedMap.has(k)) {
      seedMap.set(k, {
        media_type: h.media_type,
        tmdb_id: h.tmdb_id,
        title: h.title,
        genre_ids: [],
        weight: 4,
        timestamp: h.updated_at,
      });
    }
  }
  for (const w of watchlist.slice(0, 8)) {
    const k = mediaKey(w.media_type, w.tmdb_id);
    if (!seedMap.has(k)) {
      seedMap.set(k, {
        media_type: w.media_type,
        tmdb_id: w.tmdb_id,
        title: w.title,
        genre_ids: [],
        weight: 3,
        timestamp: w.added_at,
      });
    }
  }

  const dismissedSet = new Set(profile.dismissed);
  const watchedSet = new Set(history.map((h) => mediaKey(h.media_type, h.tmdb_id)));
  const watchlistSet = new Set(watchlist.map((w) => mediaKey(w.media_type, w.tmdb_id)));

  // Rank seeds by weight + recency decay
  const now = Date.now();
  const rankedSeeds = Array.from(seedMap.values())
    .filter((s) => !dismissedSet.has(mediaKey(s.media_type, s.tmdb_id)))
    .sort((a, b) => {
      const ageDaysA = Math.max(0, (now - a.timestamp) / 86_400_000);
      const ageDaysB = Math.max(0, (now - b.timestamp) / 86_400_000);
      const scoreA = a.weight / (1 + ageDaysA * 0.08);
      const scoreB = b.weight / (1 + ageDaysB * 0.08);
      return scoreB - scoreA;
    });

  const activeSeeds = rankedSeeds.slice(0, 3);
  const hasSignals = activeSeeds.length > 0 || topGenres.length > 0;

  if (!hasSignals) {
    return {
      forYou: [],
      becauseYouSeed: null,
      topGenres: [],
      isPersonalized: false,
    };
  }

  // Parallel candidate fetch: TMDB collaborative recs for top seeds + genre discovery
  const seedPromises = activeSeeds.map((seed) =>
    fetchMediaRecommendations(seed.media_type, seed.tmdb_id)
      .then((res) => ({
        seed,
        items: res.results.map((item) => ({ ...item, media_type: seed.media_type })),
      }))
      .catch(() => ({ seed, items: [] as TmdbMediaItem[] }))
  );

  const preferredType: MediaType =
    profile.typeAffinity.tv > profile.typeAffinity.movie * 1.25 ? 'tv' : 'movie';

  const discoverPromises: Array<Promise<TmdbMediaItem[]>> = [];
  if (topGenres.length > 0) {
    const primaryGenre = topGenres[0].id;
    discoverPromises.push(
      discoverMedia(preferredType, {
        genreId: primaryGenre,
        sortBy: 'vote_average.desc',
        minVotes: 250,
        minRating: 7.0,
      })
        .then((res) => res.results.map((i) => ({ ...i, media_type: preferredType })))
        .catch(() => [])
    );
  }
  if (topGenres.length >= 2) {
    discoverPromises.push(
      discoverMedia(preferredType, {
        genreIds: [topGenres[0].id, topGenres[1].id],
        sortBy: 'popularity.desc',
        minVotes: 120,
        minRating: 6.5,
      })
        .then((res) => res.results.map((i) => ({ ...i, media_type: preferredType })))
        .catch(() => [])
    );
  }

  const [seedResults, discoverResults] = await Promise.all([
    Promise.all(seedPromises),
    Promise.all(discoverPromises),
  ]);

  // Build "Because you watched / liked <Title>" rail from the strongest seed with results
  let becauseYouSeed: RecommendationFeed['becauseYouSeed'] = null;
  for (const sr of seedResults) {
    const cleaned = sr.items.filter((item) => {
      const k = mediaKey(sr.seed.media_type, item.id);
      return !dismissedSet.has(k) && !watchedSet.has(k) && Boolean(item.poster_path);
    });
    if (cleaned.length >= 4) {
      becauseYouSeed = {
        title: sr.seed.title,
        type: sr.seed.media_type,
        id: sr.seed.tmdb_id,
        items: cleaned.slice(0, 16),
      };
      break;
    }
  }

  // Score and rank blended "Recommended for You" pool
  const candidateMap = new Map<string, { item: TmdbMediaItem; score: number }>();
  const maxGenreScore = Math.max(1, ...topGenres.map((g) => g.score));

  const addCandidate = (item: TmdbMediaItem, baseBoost: number) => {
    const type: MediaType = item.media_type === 'tv' ? 'tv' : 'movie';
    const k = mediaKey(type, item.id);
    if (dismissedSet.has(k) || watchedSet.has(k) || !item.poster_path) return;

    const existing = candidateMap.get(k);
    if (existing) {
      // Multi-source / multi-seed overlap is a strong relevance signal
      existing.score += baseBoost * 0.85;
      return;
    }

    // Genre affinity match
    let genreAffinity = 0;
    for (const gid of item.genre_ids ?? []) {
      const gScore = profile.genreScores[gid] ?? 0;
      genreAffinity += gScore / maxGenreScore;
    }
    const clampedGenre = Math.max(-2, Math.min(4, genreAffinity));

    // Quality score (TMDB rating + vote confidence)
    const rating = item.vote_average || 6.0;
    const votes = item.vote_count || 50;
    const qualityScore = ((rating - 5.5) / 4.5) * 2.2 + Math.min(1.2, Math.log10(votes + 1) * 0.35);

    // Slight nudge if not already sitting in watchlist (so recommendations feel fresh)
    const novelty = watchlistSet.has(k) ? -0.6 : 0.35;

    candidateMap.set(k, {
      item: { ...item, media_type: type },
      score: baseBoost + clampedGenre * 1.4 + qualityScore + novelty,
    });
  };

  seedResults.forEach((sr, idx) => {
    const seedPriority = 3.2 - idx * 0.5;
    sr.items.forEach((item, rank) => {
      const rankDecay = Math.max(0.4, 1 - rank * 0.04);
      addCandidate(item, seedPriority * rankDecay);
    });
  });

  discoverResults.forEach((list) => {
    list.forEach((item, rank) => {
      const rankDecay = Math.max(0.4, 1 - rank * 0.04);
      addCandidate(item, 2.2 * rankDecay);
    });
  });

  const forYou = Array.from(candidateMap.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item)
    .slice(0, 20);

  return {
    forYou,
    becauseYouSeed,
    topGenres,
    isPersonalized: forYou.length > 0 || becauseYouSeed !== null,
  };
}
