import type { MediaType, TmdbDetail } from '../types/tmdb';
import { fetchEpisodeDetail } from './api';

export type ReviewSiteKey =
  | 'imdb'
  | 'letterboxd'
  | 'rottentomatoes'
  | 'serializd'
  | 'metacritic'
  | 'trakt'
  | 'tmdb';

export interface ReviewLink {
  site: ReviewSiteKey;
  name: string;
  icon: string;
  url: string;
  level?: string;
}

const REVIEW_SITES: Record<MediaType, ReviewSiteKey[]> = {
  movie: ['imdb', 'letterboxd', 'rottentomatoes', 'metacritic', 'trakt', 'tmdb'],
  tv: ['imdb', 'rottentomatoes', 'serializd', 'metacritic', 'trakt', 'tmdb'],
};

const BASE = import.meta.env.BASE_URL || '/';

const SITE_INFO: Record<ReviewSiteKey, { name: string; icon: string }> = {
  imdb: { name: 'IMDb', icon: `${BASE}icons/sites/imdb.jpg` },
  letterboxd: { name: 'Letterboxd', icon: `${BASE}icons/sites/letterboxd.png` },
  rottentomatoes: { name: 'Rotten Tomatoes', icon: `${BASE}icons/sites/rottentomatoes.png` },
  serializd: { name: 'Serializd', icon: `${BASE}icons/sites/serializd.png` },
  metacritic: { name: 'Metacritic', icon: `${BASE}icons/sites/metacritic.png` },
  trakt: { name: 'Trakt', icon: `${BASE}icons/sites/trakt.png` },
  tmdb: { name: 'TMDB', icon: `${BASE}icons/sites/themoviedb.png` },
};

const WIKIDATA_PROPS = {
  rottentomatoes: 'P1258',
  metacritic: 'P1712',
  trakt: 'P8013',
} as const;

interface ResolvedIds {
  episodeName?: string;
  episodeImdbId?: string | null;
  wikidata: Partial<Record<'rottentomatoes' | 'metacritic' | 'trakt', string | null>>;
}

function metacriticSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fetchWikidata(params: Record<string, string>) {
  const url = `https://www.wikidata.org/w/api.php?${new URLSearchParams({
    ...params,
    format: 'json',
    origin: '*',
  })}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Wikidata request failed');
  return res.json();
}

async function getWikidataId(externalIds?: { imdb_id?: string | null; wikidata_id?: string | null }) {
  if (externalIds?.wikidata_id) return externalIds.wikidata_id;
  if (!externalIds?.imdb_id) return null;
  const data = await fetchWikidata({
    action: 'query',
    list: 'search',
    srsearch: `haswbstatement:P345=${externalIds.imdb_id}`,
    srlimit: '1',
  });
  return data?.query?.search?.[0]?.title ?? null;
}

async function fetchWikidataClaim(entityId: string, property: string): Promise<string | null> {
  const data = await fetchWikidata({
    action: 'wbgetclaims',
    entity: entityId,
    property,
  });
  const claims = ((data?.claims?.[property] as Array<{ rank: string; mainsnak?: { datavalue?: { value?: string } } }>) ?? []).filter(
    (c) => c.rank !== 'deprecated' && c.mainsnak?.datavalue?.value
  );
  const claim = claims.find((c) => c.rank === 'preferred') ?? claims[0];
  const val = claim?.mainsnak?.datavalue?.value;
  return typeof val === 'string' ? val.replace(/^\/+|\/+$/g, '') : null;
}

export async function resolveReviewIds(
  type: MediaType,
  detail: TmdbDetail,
  season?: number,
  episode?: number
): Promise<ResolvedIds> {
  const ids: ResolvedIds = { wikidata: {} };

  const tasks: Promise<unknown>[] = [];

  if (type === 'tv' && season !== undefined && episode !== undefined) {
    tasks.push(
      fetchEpisodeDetail(detail.id, season, episode)
        .then((ep) => {
          ids.episodeName = ep.name;
          ids.episodeImdbId = ep.external_ids?.imdb_id ?? null;
        })
        .catch(() => {})
    );
  }

  tasks.push(
    getWikidataId(detail.external_ids)
      .then((entityId) => {
        if (!entityId) return;
        return Promise.all(
          (Object.entries(WIKIDATA_PROPS) as Array<['rottentomatoes' | 'metacritic' | 'trakt', string]>).map(
            ([site, prop]) =>
              fetchWikidataClaim(entityId, prop)
                .then((val) => {
                  ids.wikidata[site] = val;
                })
                .catch(() => {})
          )
        );
      })
      .catch(() => {})
  );

  await Promise.allSettled(tasks);
  return ids;
}

export function buildReviewLinks(
  type: MediaType,
  detail: TmdbDetail,
  ids: ResolvedIds = { wikidata: {} },
  season?: number,
  episode?: number
): ReviewLink[] {
  const searchTitle = detail.title || detail.name || '';
  const query = encodeURIComponent(searchTitle);
  const wikidata = ids.wikidata ?? {};
  const page = (val: string | null | undefined, prefix: string) =>
    val && val.startsWith(prefix) ? val : null;

  const map: Partial<Record<ReviewSiteKey, { url: string; level?: string }>> = {};

  if (type === 'movie') {
    const imdbId = detail.external_ids?.imdb_id;
    const rt = page(wikidata.rottentomatoes, 'm/');
    const mc = page(wikidata.metacritic, 'movie/');
    const trakt = page(wikidata.trakt, 'movies/');
    map.imdb = imdbId
      ? { url: `https://www.imdb.com/title/${imdbId}/` }
      : { url: `https://www.imdb.com/find/?q=${query}`, level: 'Search' };
    map.letterboxd = { url: `https://letterboxd.com/tmdb/${detail.id}/` };
    map.rottentomatoes = rt
      ? { url: `https://www.rottentomatoes.com/${rt}` }
      : { url: `https://www.rottentomatoes.com/search?search=${query}`, level: 'Search' };
    map.metacritic = mc
      ? { url: `https://www.metacritic.com/${mc}/` }
      : { url: `https://www.metacritic.com/search/${query}/`, level: 'Search' };
    map.trakt = trakt
      ? { url: `https://app.trakt.tv/${trakt}` }
      : { url: `https://app.trakt.tv/search?query=${query}`, level: 'Search' };
    map.tmdb = { url: `https://www.themoviedb.org/movie/${detail.id}` };
  } else {
    const showImdbId = detail.external_ids?.imdb_id;
    const rt = page(wikidata.rottentomatoes, 'tv/');
    const mc = page(wikidata.metacritic, 'tv/');
    const trakt = page(wikidata.trakt, 'shows/');
    const hasEp = season !== undefined && episode !== undefined;
    const pad = (n: number) => String(n).padStart(2, '0');
    const seasonObj = hasEp ? detail.seasons?.find((s) => s.season_number === season) : undefined;

    if (hasEp && ids.episodeImdbId) {
      map.imdb = { url: `https://www.imdb.com/title/${ids.episodeImdbId}/`, level: 'Episode' };
    } else if (showImdbId) {
      map.imdb = { url: `https://www.imdb.com/title/${showImdbId}/`, level: 'Show' };
    } else {
      map.imdb = { url: `https://www.imdb.com/find/?q=${query}`, level: 'Search' };
    }

    if (!rt) {
      map.rottentomatoes = { url: `https://www.rottentomatoes.com/search?search=${query}`, level: 'Search' };
    } else if (hasEp && season > 0) {
      map.rottentomatoes = {
        url: `https://www.rottentomatoes.com/${rt}/s${pad(season)}/e${pad(episode)}`,
        level: 'Episode',
      };
    } else {
      map.rottentomatoes = { url: `https://www.rottentomatoes.com/${rt}`, level: 'Show' };
    }

    map.serializd =
      hasEp && seasonObj?.id
        ? {
            url: `https://www.serializd.com/show/${detail.id}/season/${seasonObj.id}/${season}/episode/${episode}`,
            level: 'Episode',
          }
        : { url: `https://www.serializd.com/show/${detail.id}`, level: 'Show' };

    const slug =
      hasEp && ids.episodeName && detail.original_language === 'en'
        ? metacriticSlug(ids.episodeName)
        : '';
    if (!mc) {
      map.metacritic = { url: `https://www.metacritic.com/search/${query}/`, level: 'Search' };
    } else if (hasEp && season > 0 && slug) {
      map.metacritic = {
        url: `https://www.metacritic.com/${mc}/season-${season}/episode-${episode}-${slug}/`,
        level: 'Episode',
      };
    } else if (hasEp && season > 0) {
      map.metacritic = { url: `https://www.metacritic.com/${mc}/season-${season}/`, level: 'Season' };
    } else {
      map.metacritic = { url: `https://www.metacritic.com/${mc}/`, level: 'Show' };
    }

    map.trakt = trakt
      ? hasEp
        ? { url: `https://app.trakt.tv/${trakt}/seasons/${season}/episodes/${episode}`, level: 'Episode' }
        : { url: `https://app.trakt.tv/${trakt}`, level: 'Show' }
      : { url: `https://app.trakt.tv/search?query=${query}`, level: 'Search' };

    map.tmdb = hasEp
      ? {
          url: `https://www.themoviedb.org/tv/${detail.id}/season/${season}/episode/${episode}`,
          level: 'Episode',
        }
      : { url: `https://www.themoviedb.org/tv/${detail.id}`, level: 'Show' };
  }

  return REVIEW_SITES[type].map((site) => {
    const info = SITE_INFO[site];
    const resolved = map[site]!;
    return {
      site,
      name: info.name,
      icon: info.icon,
      url: resolved.url,
      level: resolved.level,
    };
  });
}
