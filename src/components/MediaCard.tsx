import { Link } from 'react-router-dom';
import { Bookmark, X } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { getDisplayTitle, getPosterUrl, getReleaseYear } from '../lib/api';
import type { MediaType, TmdbMediaItem } from '../types/tmdb';

interface MediaCardProps {
  item: TmdbMediaItem;
  forcedType?: MediaType;
  onDismiss?: (item: TmdbMediaItem, type: MediaType) => void;
}

export function MediaCard({ item, forcedType, onDismiss }: MediaCardProps) {
  const { isInWatchlist } = useLibrary();
  const type: MediaType = forcedType ?? (item.media_type === 'tv' ? 'tv' : 'movie');
  const title = getDisplayTitle(item);
  const year = getReleaseYear(item);
  const poster = getPosterUrl(item.poster_path, 'w342');
  const saved = isInWatchlist(type, item.id);

  return (
    <div className="media-card" style={{ position: 'relative' }}>
      {onDismiss && (
        <button
          type="button"
          className="card-dismiss-btn"
          title="Not interested"
          aria-label={`Hide ${title} from recommendations`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss(item, type);
          }}
        >
          <X size={12} />
        </button>
      )}

      <Link to={`/${type}/${item.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div className="poster-frame">
          {poster ? (
            <img src={poster} alt={title} className="poster-img" loading="lazy" />
          ) : (
            <div className="poster-placeholder">{title}</div>
          )}
          {saved && (
            <div className="poster-saved-dot" title="In Watchlist" aria-label="In Watchlist">
              <Bookmark size={12} fill="currentColor" />
            </div>
          )}
        </div>

        <div className="card-meta">
          <div className="card-title" title={title}>
            {title}
          </div>
          <div className="card-sub">
            <span>{year || (type === 'tv' ? 'Series' : 'Film')}</span>
            {item.vote_average > 0 && (
              <>
                <span>·</span>
                <span className="card-score">{item.vote_average.toFixed(1)}</span>
              </>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
