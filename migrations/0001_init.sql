CREATE TABLE IF NOT EXISTS watchlist (
  media_type TEXT NOT NULL,
  tmdb_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  poster_path TEXT,
  backdrop_path TEXT,
  release_date TEXT,
  vote_average REAL,
  added_at INTEGER NOT NULL,
  PRIMARY KEY (media_type, tmdb_id)
);

CREATE TABLE IF NOT EXISTS watch_history (
  media_type TEXT NOT NULL,
  tmdb_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  poster_path TEXT,
  backdrop_path TEXT,
  season INTEGER,
  episode INTEGER,
  episode_name TEXT,
  server_id INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (media_type, tmdb_id)
);
