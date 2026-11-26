import { Link } from 'react-router-dom';
import { Play, X } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { getBackdropUrl, getPosterUrl } from '../lib/api';

export function ContinueWatchingRail() {
  const { history, dismissHistory } = useLibrary();

  if (!history.length) return null;

  return (
    <section className="container">
      <div className="section-header">
        <h2 className="section-title">Continue Watching</h2>
        <Link to="/list" className="section-link">
          Manage history
        </Link>
      </div>

      <div className="rail-track">
        {history.slice(0, 12).map((item) => {
          const watchPath =
            item.media_type === 'tv'
              ? `/watch/tv/${item.tmdb_id}/${item.season ?? 1}/${item.episode ?? 1}`
              : `/watch/movie/${item.tmdb_id}`;
          const img =
            getBackdropUrl(item.backdrop_path, 'w780') ||
            getPosterUrl(item.poster_path, 'w500');

          return (
            <div key={`${item.media_type}-${item.tmdb_id}`} className="continue-card">
              <button
                type="button"
                className="continue-remove"
                title="Remove from Continue Watching"
                aria-label={`Remove ${item.title}`}
                onClick={(e) => {
                  e.preventDefault();
                  void dismissHistory(item.media_type, item.tmdb_id);
                }}
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
                    <span>
                      {item.media_type === 'tv'
                        ? item.episode_name || `Season ${item.season ?? 1}, Episode ${item.episode ?? 1}`
                        : 'Film'}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
