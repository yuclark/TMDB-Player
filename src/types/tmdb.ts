export type MediaType = 'movie' | 'tv';

export interface TmdbMediaItem {
  id: number;
  media_type?: MediaType | 'person';
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count?: number;
  genre_ids?: number[];
}

export interface TmdbPagedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbExternalIds {
  imdb_id?: string | null;
  wikidata_id?: string | null;
}

export interface TmdbSeasonSummary {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
  overview: string;
}

export interface TmdbEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  air_date: string | null;
  runtime: number | null;
  still_path: string | null;
  vote_average: number;
  external_ids?: TmdbExternalIds;
}

export interface TmdbSeasonDetail {
  id: number;
  name: string;
  season_number: number;
  air_date: string | null;
  overview: string;
  poster_path: string | null;
  episodes: TmdbEpisode[];
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official?: boolean;
}

export interface TmdbDetail {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  original_language: string;
  tagline?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  runtime?: number | null;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  vote_average: number;
  status?: string;
  genres: TmdbGenre[];
  seasons?: TmdbSeasonSummary[];
  external_ids?: TmdbExternalIds;
  credits?: {
    cast: TmdbCastMember[];
    crew: Array<{ id: number; name: string; job: string }>;
  };
  videos?: {
    results: TmdbVideo[];
  };
  recommendations?: TmdbPagedResponse<TmdbMediaItem>;
  similar?: TmdbPagedResponse<TmdbMediaItem>;
}

export interface WatchlistItem {
  media_type: MediaType;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  vote_average: number | null;
  added_at: number;
}

export interface HistoryItem {
  media_type: MediaType;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  season: number | null;
  episode: number | null;
  episode_name: string | null;
  server_id: number;
  updated_at: number;
}
