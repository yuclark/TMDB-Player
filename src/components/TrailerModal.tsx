import { useEffect } from 'react';
import { X } from 'lucide-react';

interface TrailerModalProps {
  youtubeKey: string | null;
  title: string;
  onClose: () => void;
}

export function TrailerModal({ youtubeKey, title, onClose }: TrailerModalProps) {
  useEffect(() => {
    if (!youtubeKey) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [youtubeKey, onClose]);

  if (!youtubeKey) return null;

  return (
    <div
      className="modal-backdrop modal-backdrop--center"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} trailer`}
      onClick={onClose}
    >
      <div className="trailer-box" onClick={(e) => e.stopPropagation()}>
        <div className="trailer-header">
          <span style={{ fontSize: 14, fontWeight: 500 }}>{title} — Trailer</span>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Close trailer"
          >
            <X size={16} />
          </button>
        </div>
        <iframe
          className="trailer-frame"
          src={`https://www.youtube-nocookie.com/embed/${youtubeKey}?autoplay=1&rel=0`}
          title={`${title} Trailer`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
