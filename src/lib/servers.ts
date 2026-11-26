import type { MediaType } from '../types/tmdb';

export interface ServerParams {
  type: MediaType;
  id: number;
  season?: number;
  episode?: number;
}

export interface StreamServer {
  id: number;
  name: string;
  note: string;
  buildUrl: (p: ServerParams) => string;
}

export const STREAM_SERVERS: StreamServer[] = [
  {
    id: 1,
    name: 'Rakan',
    note: 'Reliable default · clean HD streams',
    buildUrl: (p) =>
      p.type === 'movie'
        ? `https://vixsrc.to/movie/${p.id}?autoPlay=true&lang=en`
        : `https://vixsrc.to/tv/${p.id}/${p.season}/${p.episode}?autoPlay=true&lang=en`,
  },
  {
    id: 2,
    name: 'Bard',
    note: 'Strong for newly released films',
    buildUrl: (p) =>
      p.type === 'movie'
        ? `https://moviesapi.to/movie/${p.id}`
        : `https://moviesapi.to/tv/${p.id}-${p.season}-${p.episode}`,
  },
  {
    id: 3,
    name: 'Xayah',
    note: 'Fast fallback · recent releases',
    buildUrl: (p) =>
      p.type === 'movie'
        ? `https://vidsrc-embed.ru/embed/movie?tmdb=${p.id}&autoplay=1`
        : `https://vidsrc-embed.ru/embed/tv?tmdb=${p.id}&season=${p.season}&episode=${p.episode}&autoplay=1`,
  },
  {
    id: 4,
    name: 'Ekko',
    note: 'High bitrate · 4K available on select titles',
    buildUrl: (p) =>
      p.type === 'movie'
        ? `https://cinesrc.st/embed/movie/${p.id}?autoPlay=true`
        : `https://cinesrc.st/embed/tv/${p.id}?s=${p.season}&e=${p.episode}&autoPlay=true`,
  },
  {
    id: 5,
    name: 'Naafiri',
    note: 'High bitrate · multi-subtitle options',
    buildUrl: (p) =>
      p.type === 'movie'
        ? `https://vidfast.vc/movie/${p.id}?autoPlay=true`
        : `https://vidfast.vc/tv/${p.id}/${p.season}/${p.episode}?autoPlay=true`,
  },
  {
    id: 6,
    name: 'Ryze',
    note: 'Broad catalog · built-in episode controls',
    buildUrl: (p) =>
      p.type === 'movie'
        ? `https://vidlink.pro/movie/${p.id}?title=true&poster=true&autoplay=true`
        : `https://vidlink.pro/tv/${p.id}/${p.season}/${p.episode}?title=true&poster=true&autoplay=true&nextbutton=true`,
  },
];

const SERVER_STORAGE_KEY = 'kino_preferred_server';

export function getPreferredServerId(): number {
  try {
    const raw = localStorage.getItem(SERVER_STORAGE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : 1;
    return STREAM_SERVERS.some((s) => s.id === parsed) ? parsed : 1;
  } catch {
    return 1;
  }
}

export function setPreferredServerId(serverId: number): void {
  try {
    localStorage.setItem(SERVER_STORAGE_KEY, String(serverId));
  } catch {
    // Ignore storage quota errors
  }
}

export function getServerById(serverId: number): StreamServer {
  return STREAM_SERVERS.find((s) => s.id === serverId) ?? STREAM_SERVERS[0];
}
