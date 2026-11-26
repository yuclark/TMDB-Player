import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MediaType, TmdbMediaItem } from '../types/tmdb';
import { MediaCard } from './MediaCard';

interface MediaRailProps {
  title: string;
  items: TmdbMediaItem[];
  forcedType?: MediaType;
  viewAllTo?: string;
}

export function MediaRail({ title, items, forcedType, viewAllTo }: MediaRailProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (!items.length) return null;

  const scrollByAmount = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(400, el.clientWidth * 0.78), behavior: 'smooth' });
  };

  return (
    <section className="container">
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        {viewAllTo && (
          <Link to={viewAllTo} className="section-link">
            <span>Browse all</span>
            <ChevronRight size={15} />
          </Link>
        )}
      </div>

      <div className="rail-wrap">
        <button
          type="button"
          className="rail-arrow rail-arrow--left"
          onClick={() => scrollByAmount(-1)}
          aria-label={`Scroll ${title} left`}
        >
          <ChevronLeft size={18} />
        </button>

        <div className="rail-track" ref={trackRef}>
          {items.map((item) => (
            <MediaCard
              key={`${forcedType ?? item.media_type ?? 'm'}-${item.id}`}
              item={item}
              forcedType={forcedType}
            />
          ))}
        </div>

        <button
          type="button"
          className="rail-arrow rail-arrow--right"
          onClick={() => scrollByAmount(1)}
          aria-label={`Scroll ${title} right`}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
