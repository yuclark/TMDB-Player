import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MediaCard } from '../components/MediaCard';
import { discoverMedia, fetchGenres } from '../lib/api';
import type { MediaType, TmdbGenre, TmdbMediaItem } from '../types/tmdb';

interface BrowsePageProps {
  type: MediaType;
}

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'popularity.desc', label: 'Popular' },
  { value: 'vote_average.desc', label: 'Top Rated' },
  { value: 'primary_release_date.desc', label: 'Newest' },
];

export function BrowsePage({ type }: BrowsePageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedGenre = searchParams.get('genre') ? Number(searchParams.get('genre')) : null;
  const sortParam = searchParams.get('sort') || 'popularity.desc';
  const effectiveSort =
    type === 'tv' && sortParam === 'primary_release_date.desc'
      ? 'first_air_date.desc'
      : sortParam;

  const [genres, setGenres] = useState<TmdbGenre[]>([]);
  const [items, setItems] = useState<TmdbMediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchGenres(type)
      .then((res) => {
        if (!cancelled) setGenres(res.genres);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [type]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(1);

    discoverMedia(type, { genreId: selectedGenre, sortBy: effectiveSort, page: 1 })
      .then((res) => {
        if (cancelled) return;
        setItems(res.results);
        setTotalPages(Math.min(res.total_pages, 50));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [type, selectedGenre, effectiveSort]);

  const handleLoadMore = async () => {
    if (loadingMore || page >= totalPages) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await discoverMedia(type, {
        genreId: selectedGenre,
        sortBy: effectiveSort,
        page: nextPage,
      });
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...res.results.filter((i) => !seen.has(i.id))];
      });
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  };

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="page-shell container">
      <div className="page-header">
        <div>
          <h1 className="page-title serif-title">{type === 'movie' ? 'Movies' : 'TV Series'}</h1>
          <p className="page-subtitle">
            Browse by genre or sort by what&rsquo;s popular and highest rated.
          </p>
        </div>

        <div className="segmented" role="group" aria-label="Sort order">
          {SORT_OPTIONS.map((opt) => {
            const active = sortParam === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`segmented-btn ${active ? 'segmented-btn--active' : ''}`}
                onClick={() => updateParam('sort', opt.value === 'popularity.desc' ? null : opt.value)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="filter-bar" role="tablist" aria-label="Genre filter">
        <button
          type="button"
          className={`filter-chip ${selectedGenre === null ? 'filter-chip--active' : ''}`}
          onClick={() => updateParam('genre', null)}
        >
          All Genres
        </button>
        {genres.map((genre) => (
          <button
            key={genre.id}
            type="button"
            className={`filter-chip ${selectedGenre === genre.id ? 'filter-chip--active' : ''}`}
            onClick={() => updateParam('genre', String(genre.id))}
          >
            {genre.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="media-grid">
          {Array.from({ length: 18 }).map((_, idx) => (
            <div key={idx} className="media-card">
              <div className="poster-frame skeleton" />
              <div className="skeleton" style={{ height: 14, width: '78%', borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 11, width: '42%', borderRadius: 4 }} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">No titles found for this filter.</div>
      ) : (
        <>
          <div className="media-grid">
            {items.map((item) => (
              <MediaCard key={item.id} item={item} forcedType={type} />
            ))}
          </div>

          {page < totalPages && (
            <div className="load-more-wrap">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
