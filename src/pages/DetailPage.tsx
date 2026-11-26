import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bookmark, Check, Clapperboard, Play, Star } from 'lucide-react';
import { MediaRail } from '../components/MediaRail';
import { ReviewDropdown } from '../components/ReviewDropdown';
import { TrailerModal } from '../components/TrailerModal';
import { useLibrary } from '../context/LibraryContext';
import {
  fetchMediaDetail,
  fetchSeasonDetail,
  formatRuntime,
  getBackdropUrl,
  getDisplayTitle,
  getPosterUrl,
  getReleaseYear,
} from '../lib/api';
import type { MediaType, TmdbDetail, TmdbSeasonDetail } from '../types/tmdb';

interface DetailPageProps {
  type: MediaType;
}

export function DetailPage({ type }: DetailPageProps) {
  const { id } = useParams();
  const numericId = Number(id);

  const [detail, setDetail] = useState<TmdbDetail | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [seasonData, setSeasonData] = useState<TmdbSeasonDetail | null>(null);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { history, isInWatchlist, toggleWatchlist } = useLibrary();

  const resumeItem = useMemo(
    () => history.find((h) => h.media_type === type && h.tmdb_id === numericId),
    [history, type, numericId]
  );

  useEffect(() => {
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setError('Invalid title ID.');
      return;
    }

    let cancelled = false;
    setDetail(null);
    setSeasonData(null);
    setError(null);

    fetchMediaDetail(type, numericId)
      .then((res) => {
        if (cancelled) return;
        setDetail(res);
        if (type === 'tv' && res.seasons?.length) {
          const regular = res.seasons.filter((s) => s.season_number > 0);
          const defaultSeason = resumeItem?.season ?? regular[0]?.season_number ?? res.seasons[0].season_number;
          setSelectedSeason(defaultSeason);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load details for this title.');
      });

    return () => {
      cancelled = true;
    };
  }, [type, numericId]);

  useEffect(() => {
    if (type !== 'tv' || !detail) return;
    let cancelled = false;
    setSeasonLoading(true);
    fetchSeasonDetail(detail.id, selectedSeason)
      .then((res) => {
        if (!cancelled) setSeasonData(res);
      })
      .catch(() => {
        if (!cancelled) setSeasonData(null);
      })
      .finally(() => {
        if (!cancelled) setSeasonLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type, detail, selectedSeason]);

  const trailerKey = useMemo(() => {
    const videos = detail?.videos?.results ?? [];
    const yt = videos.filter((v) => v.site === 'YouTube');
    const officialTrailer = yt.find((v) => v.type === 'Trailer' && v.official);
    const anyTrailer = yt.find((v) => v.type === 'Trailer');
    const teaser = yt.find((v) => v.type === 'Teaser');
    return (officialTrailer ?? anyTrailer ?? teaser ?? yt[0])?.key ?? null;
  }, [detail]);

  if (error) {
    return (
      <div className="page-shell container">
        <div className="empty-state">{error}</div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="detail-hero">
        <div className="container detail-grid">
          <div className="detail-poster skeleton" />
          <div>
            <div className="skeleton" style={{ width: 320, height: 48, borderRadius: 6, marginBottom: 16 }} />
            <div className="skeleton" style={{ width: 240, height: 18, borderRadius: 4, marginBottom: 18 }} />
            <div className="skeleton" style={{ width: '80%', height: 72, borderRadius: 6 }} />
          </div>
        </div>
      </div>
    );
  }

  const title = getDisplayTitle(detail);
  const year = getReleaseYear(detail);
  const poster = getPosterUrl(detail.poster_path, 'w500');
  const backdrop = getBackdropUrl(detail.backdrop_path, 'original');
  const saved = isInWatchlist(type, detail.id);
  const runtimeLabel =
    type === 'movie'
      ? formatRuntime(detail.runtime)
      : detail.number_of_seasons
        ? `${detail.number_of_seasons} Season${detail.number_of_seasons > 1 ? 's' : ''}`
        : '';

  const director = detail.credits?.crew.find((c) => c.job === 'Director')?.name;
  const regularSeasons = (detail.seasons ?? []).filter((s) => s.season_number > 0);
  const seasonsToShow = regularSeasons.length > 0 ? regularSeasons : detail.seasons ?? [];

  const watchUrl =
    type === 'tv'
      ? `/watch/tv/${detail.id}/${resumeItem?.season ?? seasonsToShow[0]?.season_number ?? 1}/${resumeItem?.episode ?? 1}`
      : `/watch/movie/${detail.id}`;

  const watchLabel =
    type === 'tv' && resumeItem?.season && resumeItem?.episode
      ? `Resume S${String(resumeItem.season).padStart(2, '0')} · E${String(resumeItem.episode).padStart(2, '0')}`
      : type === 'tv'
        ? 'Watch S01 · E01'
        : 'Watch Film';

  const recommendations =
    (detail.recommendations?.results?.length
      ? detail.recommendations.results
      : detail.similar?.results) ?? [];

  return (
    <div>
      <section className="detail-hero">
        {backdrop && <img src={backdrop} alt="" className="detail-backdrop" />}
        <div className="detail-vignette" />

        <div className="container detail-grid">
          <div className="detail-poster">
            {poster ? (
              <img src={poster} alt={title} />
            ) : (
              <div className="poster-placeholder">{title}</div>
            )}
          </div>

          <div>
            {detail.tagline && <p className="detail-tagline">&ldquo;{detail.tagline}&rdquo;</p>}
            <h1 className="detail-title serif-title">{title}</h1>

            <div className="detail-facts">
              <span>{type === 'tv' ? 'SERIES' : 'FILM'}</span>
              {year && (
                <>
                  <span>·</span>
                  <span>{year}</span>
                </>
              )}
              {runtimeLabel && (
                <>
                  <span>·</span>
                  <span>{runtimeLabel}</span>
                </>
              )}
              {detail.vote_average > 0 && (
                <>
                  <span>·</span>
                  <span style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Star size={12} fill="currentColor" />
                    {detail.vote_average.toFixed(1)}
                  </span>
                </>
              )}
              {director && (
                <>
                  <span>·</span>
                  <span>Dir. {director}</span>
                </>
              )}
            </div>

            {detail.genres.length > 0 && (
              <div className="detail-genres">
                {detail.genres.map((g) => (
                  <Link key={g.id} to={`/${type === 'movie' ? 'movies' : 'tv'}?genre=${g.id}`} className="genre-tag">
                    {g.name}
                  </Link>
                ))}
              </div>
            )}

            {detail.overview && <p className="detail-overview">{detail.overview}</p>}

            <div className="detail-actions">
              <Link to={watchUrl} className="btn btn-primary">
                <Play size={16} fill="currentColor" />
                <span>{watchLabel}</span>
              </Link>

              <button
                type="button"
                className="btn btn-secondary"
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
              >
                {saved ? <Check size={16} /> : <Bookmark size={16} />}
                <span>{saved ? 'In Watchlist' : 'Add to Watchlist'}</span>
              </button>

              {trailerKey && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setTrailerOpen(true)}
                >
                  <Clapperboard size={16} />
                  <span>Trailer</span>
                </button>
              )}

              <ReviewDropdown type={type} detail={detail} />
            </div>
          </div>
        </div>
      </section>

      <div className="detail-body">
        {type === 'tv' && seasonsToShow.length > 0 && (
          <section className="container">
            <div className="section-header">
              <h2 className="section-title">Episodes</h2>
              {seasonData?.episodes && (
                <span className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {seasonData.episodes.length} episodes
                </span>
              )}
            </div>

            <div className="season-tabs" role="tablist" aria-label="Seasons">
              {seasonsToShow.map((season) => (
                <button
                  key={season.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedSeason === season.season_number}
                  className={`filter-chip ${selectedSeason === season.season_number ? 'filter-chip--active' : ''}`}
                  onClick={() => setSelectedSeason(season.season_number)}
                >
                  {season.name || `Season ${season.season_number}`}
                </button>
              ))}
            </div>

            {seasonLoading ? (
              <div className="episode-list">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="episode-card">
                    <div className="episode-still skeleton" />
                    <div className="episode-info">
                      <div className="skeleton" style={{ height: 15, width: '70%', borderRadius: 4 }} />
                      <div className="skeleton" style={{ height: 12, width: '40%', borderRadius: 4 }} />
                      <div className="skeleton" style={{ height: 28, width: '100%', borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="episode-list">
                {(seasonData?.episodes ?? []).map((ep) => {
                  const still = getBackdropUrl(ep.still_path, 'w780');
                  return (
                    <Link
                      key={ep.id}
                      to={`/watch/tv/${detail.id}/${ep.season_number}/${ep.episode_number}`}
                      className="episode-card"
                    >
                      <div className="episode-still">
                        {still ? (
                          <img src={still} alt={ep.name} loading="lazy" />
                        ) : (
                          <div className="poster-placeholder" style={{ fontSize: 11 }}>
                            E{ep.episode_number}
                          </div>
                        )}
                        <span className="episode-num-badge">
                          E{String(ep.episode_number).padStart(2, '0')}
                        </span>
                      </div>

                      <div className="episode-info">
                        <div className="episode-title">{ep.name}</div>
                        <div className="episode-sub">
                          {ep.air_date || 'TBA'}
                          {ep.runtime ? ` · ${ep.runtime}m` : ''}
                        </div>
                        {ep.overview && <p className="episode-desc">{ep.overview}</p>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {detail.credits && detail.credits.cast.length > 0 && (
          <section className="container">
            <div className="section-header">
              <h2 className="section-title">Cast</h2>
            </div>

            <div className="cast-track">
              {detail.credits.cast.slice(0, 14).map((person) => {
                const photo = getPosterUrl(person.profile_path, 'w185');
                return (
                  <div key={person.id} className="cast-card">
                    <div className="cast-photo">
                      {photo ? (
                        <img src={photo} alt={person.name} loading="lazy" />
                      ) : (
                        <div className="poster-placeholder" style={{ fontSize: 11 }}>
                          {person.name}
                        </div>
                      )}
                    </div>
                    <div className="cast-name" title={person.name}>
                      {person.name}
                    </div>
                    <div className="cast-role" title={person.character}>
                      {person.character}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {recommendations.length > 0 && (
          <MediaRail
            title="More Like This"
            items={recommendations}
            forcedType={type}
          />
        )}
      </div>

      <TrailerModal
        youtubeKey={trailerOpen ? trailerKey : null}
        title={title}
        onClose={() => setTrailerOpen(false)}
      />
    </div>
  );
}
