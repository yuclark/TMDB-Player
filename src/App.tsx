import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { PasscodeGate } from './components/PasscodeGate';
import { SearchOverlay } from './components/SearchOverlay';
import { LibraryProvider } from './context/LibraryContext';
import { getAuthStatus, logoutSession } from './lib/api';
import { BrowsePage } from './pages/BrowsePage';
import { DetailPage } from './pages/DetailPage';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { WatchPage } from './pages/WatchPage';

function LegacyQueryRedirect() {
  const { search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const type = params.get('type');
    const id = params.get('id');
    const server = params.get('server');
    const serverQuery = server ? `?server=${encodeURIComponent(server)}` : '';

    if (type === 'movie' && id) {
      navigate(`/watch/movie/${id}${serverQuery}`, { replace: true });
    } else if (type === 'tv' && id) {
      const s = params.get('s') || '1';
      const e = params.get('e') || '1';
      navigate(`/watch/tv/${id}/${s}/${e}${serverQuery}`, { replace: true });
    }
  }, [search, navigate]);

  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppShell({
  authProtected,
  onLogout,
}: {
  authProtected: boolean;
  onLogout: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (!typing && e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <LibraryProvider>
      <ScrollToTop />
      <LegacyQueryRedirect />
      <Navbar
        onOpenSearch={() => setSearchOpen(true)}
        showLogout={authProtected}
        onLogout={onLogout}
      />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/movies" element={<BrowsePage type="movie" />} />
        <Route path="/tv" element={<BrowsePage type="tv" />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/list" element={<WatchlistPage />} />
        <Route path="/movie/:id" element={<DetailPage type="movie" />} />
        <Route path="/tv/:id" element={<DetailPage type="tv" />} />
        <Route path="/watch/movie/:id" element={<WatchPage type="movie" />} />
        <Route path="/watch/tv/:id/:season/:episode" element={<WatchPage type="tv" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </LibraryProvider>
  );
}

export function App() {
  const [authState, setAuthState] = useState<{
    checked: boolean;
    protected: boolean;
    authenticated: boolean;
  }>({ checked: false, protected: false, authenticated: false });

  const checkAuth = async () => {
    try {
      const status = await getAuthStatus();
      setAuthState({
        checked: true,
        protected: status.protected,
        authenticated: status.authenticated,
      });
    } catch {
      setAuthState({ checked: true, protected: false, authenticated: true });
    }
  };

  useEffect(() => {
    void checkAuth();
  }, []);

  const handleLogout = async () => {
    await logoutSession();
    setAuthState((prev) => ({ ...prev, authenticated: false }));
  };

  if (!authState.checked) {
    return <div className="gate-screen" />;
  }

  if (authState.protected && !authState.authenticated) {
    return <PasscodeGate onSuccess={() => void checkAuth()} />;
  }

  return (
    <BrowserRouter>
      <AppShell authProtected={authState.protected} onLogout={() => void handleLogout()} />
    </BrowserRouter>
  );
}
