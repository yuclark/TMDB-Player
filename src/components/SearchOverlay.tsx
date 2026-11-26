import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search, X } from 'lucide-react';
import { getDisplayTitle, getPosterUrl, getReleaseYear, searchMulti } from '../lib/api';
import type { TmdbMediaItem } from '../types/tmdb';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TmdbMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 20);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const data = await searchMulti(trimmed);
        if (cancelled) return;
        const filtered = data.results
          .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
          .slice(0, 8);
        setResults(filtered);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    onClose();
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Search catalog"
      onClick={onClose}
    >
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <form className="search-input-row" onSubmit={handleSubmit}>
          <Search size={18} color="var(--text-secondary)" />
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search movies and TV series..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              style={{ color: 'var(--text-secondary)', padding: 4 }}
            >
              <X size={16} />
            </button>
          )}
        </form>

        <div className="search-results">
          {!query.trim() && (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
              Type a title to jump straight in, or press Enter for full results.
            </div>
          )}

          {query.trim() && loading && (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
              Searching...
            </div>
          )}

          {query.trim() && !loading && results.length === 0 && (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
              No matching movies or series found.
            </div>
          )}

          {results.map((item) => {
            const type = item.media_type === 'tv' ? 'tv' : 'movie';
            const poster = getPosterUrl(item.poster_path, 'w185');
            const year = getReleaseYear(item);
            return (
              <Link
                key={`${type}-${item.id}`}
                to={`/${type}/${item.id}`}
                className="search-result-row"
                onClick={onClose}
              >
                {poster ? (
                  <img src={poster} alt="" className="search-result-poster" loading="lazy" />
                ) : (
                  <div className="search-result-poster" />
                )}
                <div className="search-result-meta">
                  <div className="search-result-title">{getDisplayTitle(item)}</div>
                  <div className="search-result-sub">
                    {type === 'tv' ? 'SERIES' : 'FILM'}
                    {year ? ` · ${year}` : ''}
                    {item.vote_average > 0 ? ` · ${item.vote_average.toFixed(1)}` : ''}
                  </div>
                </div>
                <ArrowRight size={14} color="var(--text-tertiary)" />
              </Link>
            );
          })}
        </div>

        <div className="search-footer">
          <span>ESC to close</span>
          {query.trim() && (
            <button
              type="button"
              onClick={handleSubmit}
              style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 12.5 }}
            >
              See all results for &ldquo;{query.trim()}&rdquo; &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
