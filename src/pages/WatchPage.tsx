import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  ListVideo,
  X,
} from 'lucide-react';
import { ReviewDropdown } from '../components/ReviewDropdown';
import { useLibrary } from '../context/LibraryContext';
import { fetchMediaDetail, fetchSeasonDetail, getDisplayTitle } from '../lib/api';
import {
  getPreferredServerId,
  getServerById,
  setPreferredServerId,
  STREAM_SERVERS,
} from '../lib/servers';
import type { MediaType, TmdbDetail, TmdbSeasonDetail } from '../types/tmdb';

interface WatchPageProps {
  type: MediaType;
}

export function WatchPage({ type }: WatchPageProps) {
  const { id, season: seasonParam, episode: episodeParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const tmdbId = Number(id);
  const season = type === 'tv' ? Math.max(1, Number(seasonParam) || 1) : undefined;
  const episode = type === 'tv' ? Math.max(1, Number(episodeParam) || 1) : undefined;

  const initialServer = (() => {
    const q = Number(searchParams.get('server'));
    if (STREAM_SERVERS.some((s) => s.id === q)) return q;
    return getPreferredServerId();
  })();

  const [serverId, setServerId] = useState<number>(initialServer);
  const [detail, setDetail] = useState<TmdbDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSeason, setDrawerSeason] = useState<number>(season ?? 1);
  const [seasonCache, setSeasonCache] = useState<Record<number, TmdbSeasonDetail>>({});

  const { isInWatchlist, toggleWatchlist, recordWatch } = useLibrary();

  useEffect(() => {
    if (season) setDrawerSeason(season);
  }, [season]);

  useEffect(() => {
    if (!Number.isInteger(tmdbId) || tmdbId <= 0) return;
    let cancelled = false;
    fetchMediaDetail(type, tmdbId)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [type, tmdbId]);

  useEffect(() => {
    if (type !== 'tv' || !tmdbId) return;
    const targetSeason = drawerOpen ? drawerSeason : season ?? 1;
    if (seasonCache[targetSeason]) return;
    let cancelled = false;
    fetchSeasonDetail(tmdbId, targetSeason)
      .then((res) => {
        if (!cancelled) {
          setSeasonCache((prev) => ({ ...prev, [targetSeason]: res }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [type, tmdbId, season, drawerOpen, drawerSeason, seasonCache]);

  const currentEpisodeObj = useMemo(() => {
    if (type !== 'tv' || !season || !episode) return null;
    return seasonCache[season]?.episodes.find((ep) => ep.episode_number === episode) ?? null;
  }, [type, season, episode, seasonCache]);

  // Persist Continue Watching to shared D1 history
  useEffect(() => {
    if (!detail) return;
    const title = getDisplayTitle(detail);
    void recordWatch({
      media_type: type,
      tmdb_id: detail.id,
      title,
      poster_path: detail.poster_path,
      backdrop_path: detail.backdrop_path,
      season: type === 'tv' ? season ?? 1 : null,
      episode: type === 'tv' ? episode ?? 1 : null,
      episode_name: currentEpisodeObj?.name ?? null,
      server_id: serverId,
    });
  }, [detail, type, season, episode, currentEpisodeObj?.name, serverId, recordWatch]);

  const regularSeasons = useMemo(() => {
    const all = detail?.seasons ?? [];
    const nonSpecial = all.filter((s) => s.season_number > 0);
    return nonSpecial.length > 0 ? nonSpecial : all;
  }, [detail]);

  const { prevTarget, nextTarget } = useMemo(() => {
    if (type !== 'tv' || !season || !episode || !regularSeasons.length) {
      return { prevTarget: null, nextTarget: null };
    }

    const idx = regularSeasons.findIndex((s) => s.season_number === season);
    const curr = regularSeasons[idx];
    let prev: { s: number; e: number } | null = null;
    let next: { s: number; e: number } | null = null;

    if (episode > 1) {
      prev = { s: season, e: episode - 1 };
    } else if (idx > 0) {
      const prevSeason = regularSeasons[idx - 1];
      prev = { s: prevSeason.season_number, e: Math.max(1, prevSeason.episode_count) };
    }

    if (curr && episode < curr.episode_count) {
      next = { s: season, e: episode + 1 };
    } else if (idx >= 0 && idx < regularSeasons.length - 1) {
      const nextSeason = regularSeasons[idx + 1];
      next = { s: nextSeason.season_number, e: 1 };
    }

    return { prevTarget: prev, nextTarget: next };
  }, [type, season, episode, regularSeasons]);

  const activeServer = getServerById(serverId);
  const iframeSrc = activeServer.buildUrl({
    type,
    id: tmdbId,
    season,
    episode,
  });

  const handleSelectServer = (nextId: number) => {
    setServerId(nextId);
    setPreferredServerId(nextId);
    const next = new URLSearchParams(searchParams);
    next.set('server', String(nextId));
    setSearchParams(next, { replace: true });
  };

  const title = detail ? getDisplayTitle(detail) : 'Loading...';
  const saved = detail ? isInWatchlist(type, detail.id) : false;

  useEffect(() => {
    if (!detail) return;
    document.title =
      type === 'tv' && season && episode
        ? `${title} S${season}E${episode} — KINO`
        : `${title} — KINO`;
    return () => {
      document.title = 'KINO — Private Cinema';
    };
  }, [detail, title, type, season, episode]);

  return (
    <div className="watch-shell">
      <div className="container">
        <div className="watch-topbar">
          <div className="watch-topbar-left">
            <Link
              to={`/${type}/${tmdbId}`}
              className="btn btn-ghost btn-sm"
              title="Back to title details"
            >
              <ArrowLeft size={15} />
              <span>Details</span>
            </Link>

            <div className="watch-heading">
              <h1 className="watch-title">{title}</h1>
              {type === 'tv' && season && episode && (
                <div className="watch-ep-label">
                  S{String(season).padStart(2, '0')} · E{String(episode).padStart(2, '0')}
                  {currentEpisodeObj?.name ? ` — ${currentEpisodeObj.name}` : ''}
                </div>
              )}
            </div>
          </div>

          <div className="watch-controls">
            {type === 'tv' && (
              <>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={!prevTarget}
                  onClick={() =>
                    prevTarget &&
                    navigate(`/watch/tv/${tmdbId}/${prevTarget.s}/${prevTarget.e}?server=${serverId}`)
                  }
                  title="Previous episode"
                >
                  <ChevronLeft size={15} />
                  <span>Prev</span>
                </button>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={!nextTarget}
                  onClick={() =>
                    nextTarget &&
                    navigate(`/watch/tv/${tmdbId}/${nextTarget.s}/${nextTarget.e}?server=${serverId}`)
                  }
                  title={
                    nextTarget
                      ? `Next: S${nextTarget.s} E${nextTarget.e}`
                      : 'No next episode'
                  }
                >
                  <span>Next</span>
                  <ChevronRight size={15} />
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setDrawerOpen(true)}
                >
                  <ListVideo size={15} />
                  <span>Episodes</span>
                </button>
              </>
            )}

            {detail && (
              <>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    void toggleWatchlist({
                      media_type: type,
                      tmdb_id: detail.id,
                      title,
                      poster_path: detail.poster_path,
                      backdrop_path: detail.backdrop_path,
                      release_date: detail.release_date || detail.first_air_date || null,
                      vote_average: detail.vote_average,
                    })
                  }
                  title={saved ? 'Remove from Watchlist' : 'Add to Watchlist'}
                >
                  {saved ? <Check size={15} /> : <Bookmark size={15} />}
                </button>

                <ReviewDropdown
                  type={type}
                  detail={detail}
                  season={season}
                  episode={episode}
                  compact
                />
              </>
            )}
          </div>
        </div>

        <div className="player-stage">
          <iframe
            key={iframeSrc}
            src={iframeSrc}
            className="player-iframe"
            title={title}
            allowFullScreen
            referrerPolicy="origin"
          />
        </div>

        <section className="server-panel" aria-label="Streaming servers">
          <div className="server-panel-header">
            <span className="server-panel-label">Streaming Source</span>
            <span className="server-panel-hint">
              If a stream buffers or fails to load, switch servers below.
            </span>
          </div>

          <div className="server-grid">
            {STREAM_SERVERS.map((srv) => {
              const active = srv.id === serverId;
              return (
                <button
                  key={srv.id}
                  type="button"
                  className={`server-btn ${active ? 'server-btn--active' : ''}`}
                  onClick={() => handleSelectServer(srv.id)}
                >
                  <div className="server-btn-top">
                    <span className="server-btn-name">{srv.name}</span>
                    {active && <span className="server-btn-dot" aria-label="Active" />}
                  </div>
                  <span className="server-btn-note">{srv.note}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {drawerOpen && type === 'tv' && (
        <div
          className="drawer-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Episode selector"
          onClick={() => setDrawerOpen(false)}
        >
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Select an episode</div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close episode drawer"
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '12px 14px 4px' }}>
              <div className="season-tabs" style={{ marginBottom: 4 }}>
                {regularSeasons.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`filter-chip ${drawerSeason === s.season_number ? 'filter-chip--active' : ''}`}
                    onClick={() => setDrawerSeason(s.season_number)}
                  >
                    S{s.season_number}
                  </button>
                ))}
              </div>
            </div>

            <div className="drawer-body">
              {!seasonCache[drawerSeason] ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                  Loading episodes...
                </div>
              ) : (
                seasonCache[drawerSeason].episodes.map((ep) => {
                  const isCurrent = drawerSeason === season && ep.episode_number === episode;
                  return (
                    <button
                      key={ep.id}
                      type="button"
                      className={`drawer-ep-row ${isCurrent ? 'drawer-ep-row--active' : ''}`}
                      onClick={() => {
                        setDrawerOpen(false);
                        navigate(`/watch/tv/${tmdbId}/${ep.season_number}/${ep.episode_number}?server=${serverId}`);
                      }}
                    >
                      <span
                        className="mono"
                        style={{
                          fontSize: 12,
                          color: isCurrent ? 'var(--accent)' : 'var(--text-tertiary)',
                          minWidth: 28,
                        }}
                      >
                        {String(ep.episode_number).padStart(2, '0')}
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {ep.name}
                        </div>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          {ep.air_date || 'TBA'}
                          {ep.runtime ? ` · ${ep.runtime}m` : ''}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
