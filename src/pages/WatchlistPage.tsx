import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Dices, Play, Trash2, X } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { getBackdropUrl, getPosterUrl } from '../lib/api';
import type { WatchlistItem } from '../types/tmdb';

type TabFilter = 'all' | 'movie' | 'tv';

export function WatchlistPage() {
  const { watchlist, history, toggleWatchlist, dismissHistory } = useLibrary();
  const [filter, setFilter] = useState<TabFilter>('all');
  const [picked, setPicked] = useState<WatchlistItem | null>(null);

  const visibleWatchlist = watchlist.filter((item) =>
    filter === 'all' ? true : item.media_type === filter
  );

  const rollRandomPick = () => {
    if (!visibleWatchlist.length) return;
    const pool =
      visibleWatchlist.length > 1 && picked
        ? visibleWatchlist.filter(
            (i) => !(i.media_type === picked.media_type && i.tmdb_id === picked.tmdb_id)
          )
        : visibleWatchlist;
    const choice = pool[Math.floor(Math.random() * pool.length)];
    setPicked(choice);
  };

  return (
    <div className="page-shell container">
      <div className="page-header">
        <div>
          <h1 className="page-title serif-title">Shared Watchlist</h1>
          <p className="page-subtitle">
            Synced automatically across both of your devices via Cloudflare D1.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {visibleWatchlist.length > 0 && (
            <button type="button" className="btn btn-primary btn-sm" onClick={rollRandomPick}>
              <Dices size={15} />
              <span>Pick for Tonight</span>
            </button>
          )}

          <div className="segmented" role="group" aria-label="Filter watchlist">
            {(['all', 'movie', 'tv'] as TabFilter[]).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`segmented-btn ${filter === tab ? 'segmented-btn--active' : ''}`}
                onClick={() => setFilter(tab)}
              >
                {tab === 'all' ? 'All' : tab === 'movie' ? 'Movies' : 'Series'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visibleWatchlist.length === 0 ? (
        <div className="empty-state">
          <p style={{ margin: '0 0 12px', color: 'var(--text-primary)' }}>
            Nothing saved here yet.
          </p>
          <Link to="/" className="btn btn-secondary btn-sm">
            Explore Catalog
          </Link>
        </div>
      ) : (
        <div className="media-grid">
          {visibleWatchlist.map((item) => {
            const poster = getPosterUrl(item.poster_path, 'w342');
            const year = item.release_date ? item.release_date.slice(0, 4) : '';
            return (
              <div key={`${item.media_type}-${item.tmdb_id}`} className="media-card" style={{ position: 'relative' }}>
                <Link to={`/${item.media_type}/${item.tmdb_id}`} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <div className="poster-frame">
                    {poster ? (
                      <img src={poster} alt={item.title} className="poster-img" loading="lazy" />
                    ) : (
                      <div className="poster-placeholder">{item.title}</div>
                    )}
                  </div>
                  <div className="card-meta">
                    <div className="card-title">{item.title}</div>
                    <div className="card-sub">
                      <span>{item.media_type === 'tv' ? 'Series' : 'Film'}</span>
                      {year && (
                        <>
                          <span>·</span>
                          <span>{year}</span>
                        </>
                      )}
                      {item.vote_average ? (
                        <>
                          <span>·</span>
                          <span className="card-score">{item.vote_average.toFixed(1)}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() =>
                    void toggleWatchlist({
                      media_type: item.media_type,
                      tmdb_id: item.tmdb_id,
                      title: item.title,
                      poster_path: item.poster_path,
                      backdrop_path: item.backdrop_path,
                      release_date: item.release_date,
                      vote_average: item.vote_average,
                    })
                  }
                  title="Remove from watchlist"
                  aria-label={`Remove ${item.title} from watchlist`}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: 'rgba(9, 9, 11, 0.84)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {history.length > 0 && (
        <section style={{ marginTop: 64 }}>
          <div className="section-header">
            <h2 className="section-title">Recently Watched</h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {history.map((item) => {
              const watchPath =
                item.media_type === 'tv'
                  ? `/watch/tv/${item.tmdb_id}/${item.season ?? 1}/${item.episode ?? 1}`
                  : `/watch/movie/${item.tmdb_id}`;
              const img =
                getBackdropUrl(item.backdrop_path, 'w780') ||
                getPosterUrl(item.poster_path, 'w500');

              return (
                <div
                  key={`${item.media_type}-${item.tmdb_id}`}
                  className="continue-card"
                  style={{ flex: 'initial', width: '100%' }}
                >
                  <button
                    type="button"
                    className="continue-remove"
                    style={{ opacity: 1 }}
                    title="Remove from history"
                    aria-label={`Remove ${item.title}`}
                    onClick={() => void dismissHistory(item.media_type, item.tmdb_id)}
                  >
                    <X size={13} />
                  </button>

                  <Link to={watchPath} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <div className="continue-thumb">
                      {img ? (
                        <img src={img} alt={item.title} loading="lazy" />
                      ) : (
                        <div className="poster-placeholder">{item.title}</div>
                      )}
                      <span className="continue-play-pill">
                        <Play size={11} fill="currentColor" />
                        {item.media_type === 'tv' && item.season && item.episode
                          ? `S${String(item.season).padStart(2, '0')} · E${String(item.episode).padStart(2, '0')}`
                          : 'Resume'}
                      </span>
                    </div>
                    <div className="card-meta">
                      <div className="card-title">{item.title}</div>
                      <div className="card-sub">
                        {item.media_type === 'tv'
                          ? item.episode_name || `Season ${item.season ?? 1}, Episode ${item.episode ?? 1}`
                          : 'Film'}
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {picked && (
        <div
          className="modal-backdrop modal-backdrop--center"
          role="dialog"
          aria-modal="true"
          aria-label="Tonight's pick"
          onClick={() => setPicked(null)}
        >
          <div className="tonight-card" onClick={(e) => e.stopPropagation()}>
            {(picked.backdrop_path || picked.poster_path) && (
              <img
                src={
                  getBackdropUrl(picked.backdrop_path, 'w780') ||
                  getPosterUrl(picked.poster_path, 'w500') ||
                  ''
                }
                alt={picked.title}
                className="tonight-backdrop"
              />
            )}
            <div className="tonight-body">
              <div className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>
                Tonight&rsquo;s Selection
              </div>
              <h2 className="serif-title" style={{ margin: '0 0 6px', fontSize: 32 }}>
                {picked.title}
              </h2>
              <div className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
                {picked.media_type === 'tv' ? 'Series' : 'Film'}
                {picked.release_date ? ` · ${picked.release_date.slice(0, 4)}` : ''}
                {picked.vote_average ? ` · ${picked.vote_average.toFixed(1)}` : ''}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link
                  to={
                    picked.media_type === 'tv'
                      ? `/watch/tv/${picked.tmdb_id}/1/1`
                      : `/watch/movie/${picked.tmdb_id}`
                  }
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => setPicked(null)}
                >
                  <Play size={14} fill="currentColor" />
                  <span>Watch Now</span>
                </Link>

                <button type="button" className="btn btn-secondary btn-sm" onClick={rollRandomPick}>
                  <Dices size={14} />
                  <span>Re-roll</span>
                </button>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPicked(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
