import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Check, Info, Play, Star } from 'lucide-react';
import { ContinueWatchingRail } from '../components/ContinueWatchingRail';
import { MediaRail } from '../components/MediaRail';
import { useLibrary } from '../context/LibraryContext';
import {
  fetchMovieList,
  fetchTrending,
  fetchTvList,
  getBackdropUrl,
  getDisplayTitle,
  getReleaseYear,
} from '../lib/api';
import type { MediaType, TmdbMediaItem } from '../types/tmdb';

interface HomeData {
  trending: TmdbMediaItem[];
  popularMovies: TmdbMediaItem[];
  nowPlaying: TmdbMediaItem[];
  popularTv: TmdbMediaItem[];
  topRatedMovies: TmdbMediaItem[];
}

export function HomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heroIdx, setHeroIdx] = useState(0);
  const { isInWatchlist, toggleWatchlist } = useLibrary();

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchTrending('all', 'week'),
      fetchMovieList('popular'),
      fetchMovieList('now_playing'),
      fetchTvList('popular'),
      fetchMovieList('top_rated'),
    ])
      .then(([trending, popMov, nowPlay, popTv, topMov]) => {
        if (cancelled) return;
        setData({
          trending: trending.results.filter(
            (item) => item.media_type === 'movie' || item.media_type === 'tv'
          ),
          popularMovies: popMov.results,
          nowPlaying: nowPlay.results,
          popularTv: popTv.results,
          topRatedMovies: topMov.results,
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load catalog');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const featured = data?.trending.filter((m) => Boolean(m.backdrop_path)).slice(0, 5) ?? [];
  const activeHero = featured[heroIdx] ?? featured[0];

  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = window.setInterval(() => {
      setHeroIdx((prev) => (prev + 1) % featured.length);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [featured.length]);

  if (error) {
    return (
      <div className="page-shell container">
        <div className="empty-state">
          <p style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontWeight: 500 }}>
            Unable to load catalog
          </p>
          <p style={{ margin: 0, fontSize: 13 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!data || !activeHero) {
    return (
      <div>
        <div className="hero">
          <div className="container hero-content">
            <div className="hero-copy">
              <div className="skeleton" style={{ width: 160, height: 16, borderRadius: 4, marginBottom: 16 }} />
              <div className="skeleton" style={{ width: 420, maxWidth: '85vw', height: 56, borderRadius: 6, marginBottom: 18 }} />
              <div className="skeleton" style={{ width: 520, maxWidth: '90vw', height: 54, borderRadius: 6 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const heroType: MediaType = activeHero.media_type === 'tv' ? 'tv' : 'movie';
  const heroTitle = getDisplayTitle(activeHero);
  const heroYear = getReleaseYear(activeHero);
  const heroBackdrop = getBackdropUrl(activeHero.backdrop_path, 'original');
  const heroWatchTo =
    heroType === 'tv' ? `/watch/tv/${activeHero.id}/1/1` : `/watch/movie/${activeHero.id}`;
  const saved = isInWatchlist(heroType, activeHero.id);

  return (
    <div>
      <section className="hero" aria-label="Featured">
        {heroBackdrop && (
          <img
            key={activeHero.id}
            src={heroBackdrop}
            alt=""
            className="hero-backdrop"
          />
        )}
        <div className="hero-vignette" />

        <div className="container hero-content">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <span>{heroType === 'tv' ? 'Series' : 'Film'}</span>
              {heroYear && (
                <>
                  <span>·</span>
                  <span>{heroYear}</span>
                </>
              )}
              {activeHero.vote_average > 0 && (
                <>
                  <span>·</span>
                  <span className="hero-rating">
                    <Star size={12} fill="currentColor" />
                    {activeHero.vote_average.toFixed(1)}
                  </span>
                </>
              )}
            </div>

            <h1 className="hero-title serif-title">{heroTitle}</h1>
            <p className="hero-overview">{activeHero.overview}</p>

            <div className="hero-actions">
              <Link to={heroWatchTo} className="btn btn-primary">
                <Play size={16} fill="currentColor" />
                <span>Watch Now</span>
              </Link>

              <Link to={`/${heroType}/${activeHero.id}`} className="btn btn-secondary">
                <Info size={16} />
                <span>Details</span>
              </Link>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  void toggleWatchlist({
                    media_type: heroType,
                    tmdb_id: activeHero.id,
                    title: heroTitle,
                    poster_path: activeHero.poster_path,
                    backdrop_path: activeHero.backdrop_path,
                    release_date: activeHero.release_date || activeHero.first_air_date || null,
                    vote_average: activeHero.vote_average,
                  })
                }
              >
                {saved ? <Check size={16} /> : <Bookmark size={16} />}
                <span>{saved ? 'In Watchlist' : 'Watchlist'}</span>
              </button>
            </div>
          </div>

          {featured.length > 1 && (
            <div className="hero-switcher" role="tablist" aria-label="Featured titles">
              {featured.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={idx === heroIdx}
                  className={`hero-switch-item ${idx === heroIdx ? 'hero-switch-item--active' : ''}`}
                  onClick={() => setHeroIdx(idx)}
                >
                  <span className="hero-switch-title">{getDisplayTitle(item)}</span>
                  <span className="hero-switch-index">0{idx + 1}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="home-sections">
        <ContinueWatchingRail />
        <MediaRail title="Trending This Week" items={data.trending} />
        <MediaRail
          title="Now Playing"
          items={data.nowPlaying}
          forcedType="movie"
          viewAllTo="/movies"
        />
        <MediaRail
          title="Popular Movies"
          items={data.popularMovies}
          forcedType="movie"
          viewAllTo="/movies"
        />
        <MediaRail
          title="Popular Series"
          items={data.popularTv}
          forcedType="tv"
          viewAllTo="/tv"
        />
        <MediaRail
          title="Top Rated Cinema"
          items={data.topRatedMovies}
          forcedType="movie"
          viewAllTo="/movies?sort=vote_average.desc"
        />
      </div>
    </div>
  );
}
