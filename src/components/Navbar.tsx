import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LogOut, Search } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';

interface NavbarProps {
  onOpenSearch: () => void;
  showLogout?: boolean;
  onLogout?: () => void;
}

export function Navbar({ onOpenSearch, showLogout, onLogout }: NavbarProps) {
  const { pathname } = useLocation();
  const { watchlist } = useLibrary();
  const [scrolled, setScrolled] = useState(false);

  const isHeroRoute = pathname === '/' || pathname.startsWith('/movie/') || pathname.startsWith('/tv/');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const solid = scrolled || !isHeroRoute;

  return (
    <header className={`navbar ${solid ? 'navbar--solid' : 'navbar--transparent'}`}>
      <div className="container navbar-inner">
        <div className="navbar-left">
          <Link to="/" className="brand" aria-label="Kino Home">
            <span>KINO</span>
            <span className="brand-dot" aria-hidden="true" />
          </Link>

          <nav className="nav-links" aria-label="Primary">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
            >
              Home
            </NavLink>
            <NavLink
              to="/movies"
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
            >
              Movies
            </NavLink>
            <NavLink
              to="/tv"
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
            >
              Series
            </NavLink>
            <NavLink
              to="/list"
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
            >
              <span>Watchlist</span>
              {watchlist.length > 0 && <span className="nav-badge">{watchlist.length}</span>}
            </NavLink>
          </nav>
        </div>

        <div className="navbar-actions">
          <button
            type="button"
            className="search-trigger"
            onClick={onOpenSearch}
            aria-label="Search movies and series"
          >
            <Search size={15} />
            <span>Search titles...</span>
            <kbd className="search-kbd">/</kbd>
          </button>

          {showLogout && onLogout && (
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={onLogout}
              title="Lock session"
              aria-label="Lock session"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
