export interface Env {
  TMDB_TOKEN: string;
  APP_PASSCODE?: string;
  ASSETS: Fetcher;
}

const SESSION_COOKIE = 'kino_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const TMDB_BASE = 'https://api.themoviedb.org/3';
const ALLOWED_TMDB_PREFIXES = [
  'trending/',
  'movie/',
  'tv/',
  'search/',
  'discover/',
  'genre/',
  'configuration',
];

function jsonResponse(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  const merged = new Headers(headers);
  merged.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { status, headers: merged });
}

async function sha256Bytes(value: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return new Uint8Array(digest);
}

async function constantTimeStringEqual(a: string, b: string): Promise<boolean> {
  const [hashA, hashB] = await Promise.all([sha256Bytes(a), sha256Bytes(b)]);
  let diff = 0;
  for (let i = 0; i < hashA.length; i++) {
    diff |= hashA[i] ^ hashB[i];
  }
  return diff === 0;
}

async function computeSessionToken(passcode: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passcode),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode('kino-private-session-v1')
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

async function isAuthenticated(request: Request, env: Env): Promise<boolean> {
  const passcode = env.APP_PASSCODE?.trim();
  if (!passcode) return true;
  const cookieVal = getCookie(request, SESSION_COOKIE);
  if (!cookieVal) return false;
  const expected = await computeSessionToken(passcode);
  return constantTimeStringEqual(cookieVal, expected);
}

async function handleAuth(request: Request, url: URL, env: Env): Promise<Response> {
  const passcode = env.APP_PASSCODE?.trim();

  if (url.pathname === '/api/auth/status' && request.method === 'GET') {
    const authed = await isAuthenticated(request, env);
    return jsonResponse({
      protected: Boolean(passcode),
      authenticated: authed,
    });
  }

  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    if (!passcode) {
      return jsonResponse({ ok: true, protected: false });
    }
    let body: { passcode?: string };
    try {
      body = (await request.json()) as { passcode?: string };
    } catch {
      return jsonResponse({ error: 'Invalid request body' }, 400);
    }

    const candidate = typeof body.passcode === 'string' ? body.passcode.trim() : '';
    const valid = candidate.length > 0 && (await constantTimeStringEqual(candidate, passcode));
    if (!valid) {
      return jsonResponse({ error: 'Incorrect passcode' }, 401);
    }

    const token = await computeSessionToken(passcode);
    const secureFlag = url.protocol === 'https:' ? '; Secure' : '';
    return jsonResponse(
      { ok: true },
      200,
      {
        'Set-Cookie': `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}${secureFlag}`,
      }
    );
  }

  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    const secureFlag = url.protocol === 'https:' ? '; Secure' : '';
    return jsonResponse(
      { ok: true },
      200,
      {
        'Set-Cookie': `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureFlag}`,
      }
    );
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

async function handleTmdbProxy(request: Request, url: URL, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const tmdbPath = url.pathname.replace(/^\/api\/tmdb\/+/, '');
  const isAllowed = ALLOWED_TMDB_PREFIXES.some((prefix) => tmdbPath.startsWith(prefix));
  if (!isAllowed || tmdbPath.includes('..')) {
    return jsonResponse({ error: 'Endpoint not allowed' }, 403);
  }

  if (!env.TMDB_TOKEN) {
    return jsonResponse({ error: 'TMDB_TOKEN secret is not configured on the Worker.' }, 500);
  }

  const upstreamUrl = new URL(`${TMDB_BASE}/${tmdbPath}`);
  url.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });

  const upstreamRes = await fetch(upstreamUrl.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${env.TMDB_TOKEN}`,
      Accept: 'application/json',
    },
    cf: {
      cacheEverything: true,
      cacheTtl: 300,
    },
  });

  if (!upstreamRes.ok) {
    return jsonResponse(
      { error: 'TMDB request failed', status: upstreamRes.status },
      upstreamRes.status >= 400 && upstreamRes.status < 500 ? upstreamRes.status : 502
    );
  }

  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
  responseHeaders.set('Cache-Control', 'public, max-age=300');

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: responseHeaders,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/auth/')) {
      return handleAuth(request, url, env);
    }

    if (url.pathname.startsWith('/api/')) {
      const authed = await isAuthenticated(request, env);
      if (!authed) {
        return jsonResponse({ error: 'Authentication required' }, 401);
      }

      try {
        if (url.pathname.startsWith('/api/tmdb/')) {
          return await handleTmdbProxy(request, url, env);
        }
        return jsonResponse({ error: 'Not found' }, 404);
      } catch (err) {
        console.error(JSON.stringify({ event: 'api_error', path: url.pathname, message: String(err) }));
        return jsonResponse({ error: 'Internal server error' }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
