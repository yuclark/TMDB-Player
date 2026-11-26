import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Star } from 'lucide-react';
import { buildReviewLinks, resolveReviewIds, type ReviewLink } from '../lib/reviews';
import type { MediaType, TmdbDetail } from '../types/tmdb';

interface ReviewDropdownProps {
  type: MediaType;
  detail: TmdbDetail;
  season?: number;
  episode?: number;
  compact?: boolean;
}

export function ReviewDropdown({ type, detail, season, episode, compact }: ReviewDropdownProps) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<ReviewLink[]>(() =>
    buildReviewLinks(type, detail, { wikidata: {} }, season, episode)
  );
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLinks(buildReviewLinks(type, detail, { wikidata: {} }, season, episode));
    let cancelled = false;
    resolveReviewIds(type, detail, season, episode).then((ids) => {
      if (!cancelled) {
        setLinks(buildReviewLinks(type, detail, ids, season, episode));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [type, detail, season, episode]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', onDocClick, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="dropdown-anchor" ref={anchorRef}>
      <button
        type="button"
        className={compact ? 'btn btn-ghost btn-sm' : 'btn btn-secondary'}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Rate & Review"
      >
        <Star size={15} />
        {!compact && <span>Rate &amp; Review</span>}
      </button>

      {open && (
        <div className="dropdown-menu" role="menu">
          <div className="dropdown-heading">Rate &amp; Log On</div>
          {links.map((link) => (
            <a
              key={link.site}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="dropdown-item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <img src={link.icon} alt="" className="dropdown-item-icon" />
              <span className="dropdown-item-name">{link.name}</span>
              {link.level && <span className="dropdown-item-level">{link.level}</span>}
              <ExternalLink size={12} color="var(--text-tertiary)" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
