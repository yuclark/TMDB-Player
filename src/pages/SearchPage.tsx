import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { MediaCard } from '../components/MediaCard';
import { searchMulti } from '../lib/api';
import type { TmdbMediaItem } from '../types/tmdb';

type FilterTab = 'all' | 'movie' | 'tv';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [items, setItems] = useState<TmdbMediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await searchMulti(trimmed, 1);
        if (cancelled) return;
        setItems(res.results.filter((i) => i.media_type === 'movie' || i.media_type === 'tv'));
        setPage(1);
        setTotalPages(Math.min(res.total_pages, 20));
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const handleInput = (val: string) => {
    setQuery(val);
    const next = new URLSearchParams(searchParams);
    if (val.trim()) next.set('q', val);
    else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  const loadMore = async () => {
    const trimmed = query.trim();
    if (!trimmed || page >= totalPages) return;
    const nextPage = page + 1;
    const res = await searchMulti(trimmed, nextPage);
    const filtered = res.results.filter((i) => i.media_type === 'movie' || i.media_type === 'tv');
    setItems((prev) => {
      const keys = new Set(prev.map((i) => `${i.media_type}-${i.id}`));
      return [...prev, ...filtered.filter((i) => !keys.has(`${i.media_type}-${i.id}`))];
    });
    setPage(nextPage);
  };

  const visible = items.filter((item) =>
    filter === 'all' ? true : item.media_type === filter
  );

  return (
    <div className="page-shell container">
      <div className="page-header">
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1 className="page-title serif-title">Search</h1>
          <div
            style={{
              marginTop: 14,
              maxWidth: 540,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0 14px',
              height: 46,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
            }}
          >
            <Search size={17} color="var(--text-secondary)" />
            <input
              type="text"
              className="search-input"
              placeholder="Search any movie or series..."
              value={query}
              onChange={(e) => handleInput(e.target.value)}
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => handleInput('')}
                aria-label="Clear search"
                style={{ color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="segmented" role="group" aria-label="Filter media type">
          {(['all', 'movie', 'tv'] as FilterTab[]).map((tab) => (
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

      {!query.trim() ? (
        <div className="empty-state">Start typing a movie or TV series name above.</div>
      ) : loading ? (
        <div className="media-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="media-card">
              <div className="poster-frame skeleton" />
              <div className="skeleton" style={{ height: 14, width: '75%', borderRadius: 4 }} />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state">No results for &ldquo;{query.trim()}&rdquo;.</div>
      ) : (
        <>
          <div className="media-grid">
            {visible.map((item) => (
              <MediaCard key={`${item.media_type}-${item.id}`} item={item} />
            ))}
          </div>

          {page < totalPages && (
            <div className="load-more-wrap">
              <button type="button" className="btn btn-secondary" onClick={loadMore}>
                Load More Results
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
