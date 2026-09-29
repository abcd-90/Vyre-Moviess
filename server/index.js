const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const { URL } = require('url');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- MOVIEBOX PROVIDER ENGINE ---
const HOST_POOL = [
  "https://api6.aoneroom.com",
  "https://api5.aoneroom.com",
  "https://api4.aoneroom.com",
  "https://api4sg.aoneroom.com",
  "https://api3.aoneroom.com",
  "https://api6sg.aoneroom.com",
  "https://api.inmoviebox.com",
];

const SECRET_BYTES = Buffer.from([
  0xef, 0xa8, 0x91, 0x97, 0x4e, 0xec, 0xd3, 0x14, 0x8d, 0xf6, 0x3a, 0xa6,
  0x11, 0x60, 0x2d, 0xef, 0xd1, 0x01, 0x25, 0x9b, 0xa5, 0x21, 0x02, 0x2c,
  0x57, 0xae, 0x05, 0x66, 0xbd, 0x8e
]);

const STREAM_REFERER = "https://sportslive.wine";

function parseIsoDuration(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const matches = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?/i);
  if (!matches) return 0;
  const hours = parseFloat(matches[1] || 0);
  const minutes = parseFloat(matches[2] || 0);
  const seconds = parseFloat(matches[3] || 0);
  return Math.floor(hours * 3600 + minutes * 60 + seconds);
}

let activeHostIdx = 0;
let cachedSession = null;

function md5Hex(buf) {
  return crypto.createHash('md5').update(buf).digest('hex');
}

function generateXClientToken(ts) {
  const tsStr = ts.toString();
  const reversedTs = tsStr.split('').reverse().join('');
  const hashVal = md5Hex(Buffer.from(reversedTs));
  return `${tsStr},${hashVal}`;
}

function generateXTrSignature(method, accept, contentType, urlStr, bodyStr, tsMs) {
  const parsed = new URL(urlStr);
  const path = parsed.pathname;
  
  const params = Array.from(parsed.searchParams.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const queryStr = params.map(([k, v]) => `${k}=${v}`).join('&');
  const canonicalUrl = queryStr ? `${path}?${queryStr}` : path;

  let bodyHash = "";
  let bodyLen = "";
  if (bodyStr) {
    const buf = Buffer.from(bodyStr);
    bodyLen = buf.length.toString();
    const truncated = buf.subarray(0, 102400);
    bodyHash = md5Hex(truncated);
  }

  const canonical = [
    method.toUpperCase(),
    accept || "",
    contentType || "",
    bodyLen,
    tsMs.toString(),
    bodyHash,
    canonicalUrl
  ].join('\n');

  const hmac = crypto.createHmac('md5', SECRET_BYTES);
  hmac.update(Buffer.from(canonical));
  const sigB64 = hmac.digest('base64');
  return `${tsMs}|2|${sigB64}`;
}

function getRandomSpoofedIp() {
  const prefixes = ["103.241", "49.36", "117.195", "106.198", "122.162", "157.32", "182.70", "103.58", "27.60", "59.90"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const c = Math.floor(Math.random() * 253) + 1;
  const d = Math.floor(Math.random() * 253) + 1;
  return `${prefix}.${c}.${d}`;
}

const TMDB_API_KEY = "1194f31f73643d6de969014c96d483f4";

async function fetchTmdbMetadata(title) {
  if (!title) return null;
  try {
    const cleanTitle = title.replace(/\[.*?\]|\(.*?\)/g, '').trim();
    if (!cleanTitle) return null;

    const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(4000) });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();

    const match = (searchData.results || []).find(r => r.media_type === 'movie' || r.media_type === 'tv') || (searchData.results || [])[0];
    if (!match) return null;

    const mediaType = match.media_type === 'tv' ? 'tv' : 'movie';
    const tmdbId = match.id;

    const creditsUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/credits?api_key=${TMDB_API_KEY}`;
    const creditsRes = await fetch(creditsUrl, { signal: AbortSignal.timeout(4000) });
    let cast = [];
    if (creditsRes.ok) {
      const creditsData = await creditsRes.json();
      const rawCast = creditsData.cast || [];
      cast = rawCast.slice(0, 10).map(c => {
        const avatarUrl = c.profile_path 
          ? `https://image.tmdb.org/t/p/w185${c.profile_path}`
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=1a1a2e&color=ffffff&size=185`;
        return {
          name: c.name,
          character: c.character || 'Cast Member',
          avatar: avatarUrl
        };
      });
    }

    return {
      overview: match.overview || null,
      cast: cast.length > 0 ? cast : null,
      vote_average: match.vote_average ? match.vote_average.toFixed(1) : null
    };
  } catch (err) {
    console.error("TMDB fetch error:", err.message);
    return null;
  }
}

function getClientInfoAndUa() {
  const version_code = 50020119;
  const ua = `com.community.oneroom/${version_code} (Linux; U; Android 11; Redmi 2201117TY; Build/RP1A.200720.011; Cronet/135.0.7012.3)`;
  const clientInfo = JSON.stringify({
    package_name: "com.community.oneroom",
    version_name: "4.0.01.0813.03",
    version_code,
    os: "android",
    os_version: "11",
    install_ch: "ps",
    device_id: crypto.randomBytes(16).toString('hex'),
    install_store: "ps",
    gaid: crypto.randomUUID(),
    brand: "Redmi",
    model: "2201117TY",
    system_language: "en",
    net: "NETWORK_WIFI",
    region: "US",
    timezone: "America/New_York",
    sp_code: "40401",
    "X-Play-Mode": "2"
  });
  return { ua, clientInfo };
}

async function requestHosts(method, pathAndQuery, bodyObj = null, auth_token = null) {
  const startIdx = activeHostIdx;
  const bodyStr = bodyObj ? JSON.stringify(bodyObj) : null;
  const ts = Date.now();
  const accept = "application/json";
  const contentType = "application/json";
  const { ua, clientInfo } = getClientInfoAndUa();
  const spoofedIp = getRandomSpoofedIp();

  for (let i = 0; i < HOST_POOL.length; i++) {
    const idx = (startIdx + i) % HOST_POOL.length;
    const base = HOST_POOL[idx];
    const url = `${base}${pathAndQuery}`;

    const xClientToken = generateXClientToken(ts);
    const xTrSignature = generateXTrSignature(method, accept, contentType, url, bodyStr, ts);

    const headers = {
      'User-Agent': ua,
      'Accept': accept,
      'Content-Type': contentType,
      'Connection': 'keep-alive',
      'x-client-token': xClientToken,
      'x-tr-signature': xTrSignature,
      'x-client-info': clientInfo,
      'x-client-status': '0',
      'x-forwarded-for': spoofedIp
    };

    if (auth_token) {
      headers['Authorization'] = `Bearer ${auth_token}`;
    }

    const opts = {
      method,
      headers
    };
    if (bodyStr) opts.body = bodyStr;

    try {
      const res = await fetch(url, {
        ...opts,
        signal: AbortSignal.timeout(2500)
      });

      if (res.ok) {
        activeHostIdx = idx;
        const json = await res.json();
        return json.data !== undefined ? json.data : json;
      }
    } catch (err) {
      // Continue to next host
    }
  }
  throw new Error("All MovieBox API hosts exhausted");
}

async function ensureSession() {
  if (cachedSession && cachedSession.token && cachedSession.expiresAt > Date.now()) {
    return cachedSession.token;
  }
  try {
    const res = await requestHosts("POST", "/wefeed-mobile-bff/user-api/visitor-login", {});
    if (res && res.token) {
      cachedSession = {
        token: res.token,
        uid: res.uid || res.userId || null,
        expiresAt: Date.now() + 24 * 3600 * 1000 // 24 hours
      };
      return cachedSession.token;
    }
  } catch (err) {
    console.error("Session creation error:", err);
  }
  return null;
}

async function movieboxApiRequest(method, pathAndQuery, bodyObj = null) {
  let token = await ensureSession();
  try {
    return await requestHosts(method, pathAndQuery, bodyObj, token);
  } catch (err) {
    // Retry once with fresh token
    cachedSession = null;
    token = await ensureSession();
    return await requestHosts(method, pathAndQuery, bodyObj, token);
  }
}

function resolveDashManifestFromPolicy(signCookie) {
  if (!signCookie) return null;
  const parts = signCookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('urlprefix=')) {
      const idx = trimmed.indexOf('urlprefix=');
      const prefixPart = trimmed.substring(idx + 'urlprefix='.length);
      const b64Token = prefixPart.split(':')[0].trim();
      let normalized = b64Token.replace(/-/g, '+').replace(/_/g, '/');
      const pad = (4 - (normalized.length % 4)) % 4;
      normalized += '='.repeat(pad);
      try {
        const decoded = Buffer.from(normalized, 'base64').toString('utf8');
        const baseResource = decoded.replace(/\*$/, '').replace(/\/$/, '');
        if (baseResource.startsWith('http://') || baseResource.startsWith('https://')) {
          return `${baseResource}/index.mpd`;
        }
      } catch (e) {}
    }
  }
  return null;
}

function isNoticeUrl(url) {
  if (!url) return true;
  const lower = url.toLowerCase();
  return lower.includes('notice.mp4') || lower.includes('notice') || lower.includes('1c7de0bd3393702d9191801f15f88f8d') || lower.includes('9a0461bc39da389663bf3dbb17091d3f') || lower.includes('b164fbfb4347792950bdfbfb563d39d9');
}

// --- DATA ADAPTERS & NORMALIZERS ---

function extract4DigitYear(raw) {
  if (!raw) return null;
  const match = String(raw).match(/(19|20)\d{2}/);
  return match ? match[0] : null;
}

function normalizeMovieBoxSubject(s) {
  if (!s) return null;
  const id = s.subjectId || s.id;
  if (!id) return null;

  const stype = s.subjectType !== undefined ? s.subjectType : (s.stype !== undefined ? s.stype : 1);
  const mediaType = stype === 2 ? 'series' : 'movie';
  const title = s.title || s.name || "Untitled";
  const year = extract4DigitYear(s.releaseDate || s.year || s.releaseInfo);
  const poster = (s.cover && s.cover.url) || s.coverUrl || s.poster || s.pic || null;
  const rating = s.imdbRatingValue || s.rating || s.score || null;

  return {
    id: String(id),
    provider: 'moviebox',
    title,
    type: mediaType,
    year,
    poster,
    backdrop: (s.banner && s.banner.url) || poster,
    rating: rating ? String(rating) : null,
    description: s.description || s.intro || null,
    seasonCount: s.season || null
  };
}

function parseHomepagePayload(data) {
  const items = [];
  const seen = new Set();
  const rawGroups = data.items || data || [];

  if (Array.isArray(rawGroups)) {
    for (const group of rawGroups) {
      const groupSubjects = [];

      if (group.banner && group.banner.banners) {
        for (const b of group.banner.banners) {
          if (b.subject) groupSubjects.push(b.subject);
        }
      }
      if (group.customData && group.customData.items) {
        for (const c of group.customData.items) {
          if (c.subject) groupSubjects.push(c.subject);
        }
      }
      if (Array.isArray(group.subjects)) {
        for (const s of group.subjects) groupSubjects.push(s);
      }

      for (const s of groupSubjects) {
        const item = normalizeMovieBoxSubject(s);
        if (item && !seen.has(item.id)) {
          seen.add(item.id);
          items.push(item);
        }
      }
    }
  }
  return items;
}

function sanitizeLanguage(lang) {
  if (!lang) return "English";
  const clean = String(lang).trim();
  if (clean.toLowerCase() === 'en' || clean.toLowerCase() === 'eng') return "English";
  if (clean.toLowerCase() === 'hi' || clean.toLowerCase() === 'hin') return "Hindi";
  if (clean.toLowerCase() === 'ur' || clean.toLowerCase() === 'urd') return "Urdu";
  if (clean.toLowerCase() === 'bn' || clean.toLowerCase() === 'ben') return "Bengali";
  if (clean.toLowerCase() === 'es' || clean.toLowerCase() === 'spa') return "Spanish";
  if (clean.toLowerCase() === 'ar' || clean.toLowerCase() === 'ara') return "Arabic";
  if (clean.toLowerCase() === 'ja' || clean.toLowerCase() === 'jpn') return "Japanese";
  if (clean.toLowerCase() === 'ko' || clean.toLowerCase() === 'kor') return "Korean";
  return clean;
}

function getCuratedFallbackHomepage() {
  const catalog = [
    {
      id: "157336",
      provider: "moviebox",
      title: "Interstellar",
      type: "movie",
      year: "2014",
      poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
      backdrop: "https://image.tmdb.org/t/p/original/rAiYTfKGqDCRIIqo6LEuPJevZzC.jpg",
      rating: "8.7",
      description: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel."
    },
    {
      id: "872585",
      provider: "moviebox",
      title: "Oppenheimer",
      type: "movie",
      year: "2023",
      poster: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGvC271ug2I.jpg",
      backdrop: "https://image.tmdb.org/t/p/original/fm6KqXrmjMQgrmZB22y9F2uYFft.jpg",
      rating: "8.9",
      description: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb."
    },
    {
      id: "66732",
      provider: "moviebox",
      title: "Stranger Things",
      type: "series",
      year: "2016",
      poster: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn88qMG4d2.jpg",
      backdrop: "https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9r1kZqVh7pE2z.jpg",
      rating: "8.6",
      description: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments and supernatural forces."
    },
    {
      id: "1396",
      provider: "moviebox",
      title: "Breaking Bad",
      type: "series",
      year: "2008",
      poster: "https://image.tmdb.org/t/p/w500/ztkUQFLAcSSvtU2Zkoes9y33o.jpg",
      backdrop: "https://image.tmdb.org/t/p/original/tsRy63MuZvF8ETycrKHmB8avx67.jpg",
      rating: "9.5",
      description: "A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing methamphetamine to secure his family's financial future."
    },
    {
      id: "76600",
      provider: "moviebox",
      title: "Avatar: The Way of Water",
      type: "movie",
      year: "2022",
      poster: "https://image.tmdb.org/t/p/w500/t6HIwfg5gFwCSFDiW2iCOtUZ3ft.jpg",
      backdrop: "https://image.tmdb.org/t/p/original/vL5LR6WdxWPjUnFRVPW3Y5eW0y5.jpg",
      rating: "7.7",
      description: "Jake Sully lives with his newfound family on Pandora until a familiar threat returns to finish what was previously started."
    },
    {
      id: "1429",
      provider: "moviebox",
      title: "Attack on Titan",
      type: "series",
      year: "2013",
      poster: "https://image.tmdb.org/t/p/w500/hTP1DtLGFamjL6rml92qwpD6hE9.jpg",
      backdrop: "https://image.tmdb.org/t/p/original/yD2o6oV25Wl9Z0y8E6eXb1W8Xy3.jpg",
      rating: "9.0",
      description: "Young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans that have brought humanity to the brink of extinction."
    },
    {
      id: "93405",
      provider: "moviebox",
      title: "Squid Game",
      type: "series",
      year: "2021",
      poster: "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94Oi2oR6Zs.jpg",
      backdrop: "https://image.tmdb.org/t/p/original/oaGsg2P0jPhraMvwJAWV347RChm.jpg",
      rating: "8.4",
      description: "Cash-strapped players accept a strange invitation to compete in children's games with deadly high stakes."
    },
    {
      id: "155",
      provider: "moviebox",
      title: "The Dark Knight",
      type: "movie",
      year: "2008",
      poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
      backdrop: "https://image.tmdb.org/t/p/original/hkBaDkMWbLaf8B1lsWsKX7Ew3Xq.jpg",
      rating: "9.0",
      description: "When the menace known as the Joker wreaks havoc on Gotham, Batman must accept one of his greatest tests."
    }
  ];

  return {
    featured: catalog.slice(0, 4),
    trending: catalog.slice(0, 8),
    popular: catalog.slice(2, 8),
    recentlyAdded: catalog.slice(4, 8),
    catalog
  };
}

// 1. Homepage Endpoint
app.get(['/api/homepage', '/homepage'], async (req, res) => {
  try {
    const tabParam = req.query.tab || '0';
    let mappedTab = '0';
    if (tabParam === 'movies' || tabParam === '1') mappedTab = '1';
    else if (tabParam === 'series' || tabParam === '2') mappedTab = '2';
    else if (tabParam === 'anime' || tabParam === '3') mappedTab = '3';
    else if (tabParam === 'drama' || tabParam === '4') mappedTab = '4';

    const page = parseInt(req.query.page || '1', 10);

    const data = await movieboxApiRequest('GET', `/wefeed-mobile-bff/tab-operating?page=${page}&tabId=${mappedTab}&version=`);
    const catalog = parseHomepagePayload(data);

    if (catalog && catalog.length > 0) {
      const featured = catalog.slice(0, 5);
      const trending = catalog.slice(5, 15);
      const popular = catalog.slice(15, 25);
      const recentlyAdded = catalog.slice(25);

      return res.json({
        featured,
        trending,
        popular,
        recentlyAdded,
        catalog
      });
    }
  } catch (err) {
    console.error("Homepage API error, sending curated fallback:", err.message);
  }
  // Fallback if provider hosts are slow/blocked on cloud
  res.json(getCuratedFallbackHomepage());
});

// 2. Search & Suggest Endpoint
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const page = parseInt(req.query.page || '1', 10);
    if (!query.trim()) {
      return res.json({ results: [] });
    }

    const payload = {
      keyword: query,
      page,
      perPage: 20,
      subjectType: 0
    };

    const data = await movieboxApiRequest('POST', '/wefeed-mobile-bff/subject-api/search/v2', payload);
    const rawList = (data.results && data.results[0] && data.results[0].subjects) || data.list || [];
    const results = rawList.map(normalizeMovieBoxSubject).filter(Boolean);

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message || "Search failed" });
  }
});

app.get('/api/suggest', async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query.trim()) return res.json({ suggestions: [] });
    const data = await movieboxApiRequest('POST', '/wefeed-mobile-bff/subject-api/search/v2', {
      keyword: query,
      page: 1,
      perPage: 8,
      subjectType: 0
    });
    const rawList = (data.results && data.results[0] && data.results[0].subjects) || data.list || [];
    const suggestions = rawList.map(s => s.title || s.name).filter(Boolean);
    res.json({ suggestions });
  } catch (err) {
    res.json({ suggestions: [] });
  }
});

// 3. Details Endpoint (Movie / TV Show)
app.get('/api/details/:id', async (req, res) => {
  try {
    const rawId = req.params.id || '';
    const subjectId = rawId.split('?')[0];

    const details = await movieboxApiRequest('GET', `/wefeed-mobile-bff/subject-api/get?subjectId=${subjectId}`);
    const subject = details.subject || details;
    const item = normalizeMovieBoxSubject(subject);

    if (!item) {
      return res.status(404).json({ error: "Title not found" });
    }

    item.description = subject.description || subject.intro || "No overview available.";
    item.tagline = subject.tagline || null;
    item.rating = subject.imdbRatingValue || subject.rating ? String(subject.imdbRatingValue || subject.rating) : null;
    item.director = subject.director || null;
    item.stars = subject.stars || null;
    item.genres = Array.isArray(subject.genre || subject.genres) ? (subject.genre || subject.genres) : [];
    const rawDur = subject.duration ? parseInt(subject.duration, 10) : 0;
    const durSec = !isNaN(rawDur) && rawDur > 0 ? rawDur : 0;
    item.durationSeconds = durSec;
    item.duration = durSec > 0 ? `${Math.floor(durSec / 60)}m` : null;

    // Fetch season & episode info if series
    const seasons = [];
    if (item.type === 'series') {
      try {
        const seasonInfo = await movieboxApiRequest('GET', `/wefeed-mobile-bff/subject-api/season-info?subjectId=${subjectId}`);
        const rawSeasons = seasonInfo.seasons || seasonInfo || [];
        if (Array.isArray(rawSeasons)) {
          for (const s of rawSeasons) {
            const seNum = s.se || 1;
            const episodes = [];
            const epNumbers = s.episodeNumbers || [];
            const maxEp = s.maxEp || epNumbers.length || 10;

            for (let ep = 1; ep <= maxEp; ep++) {
              episodes.push({
                season: seNum,
                number: ep,
                title: `Episode ${ep}`,
                overview: `Season ${seNum} Episode ${ep}`
              });
            }
            seasons.push({
              number: seNum,
              episodes
            });
          }
        }
      } catch (e) {
        seasons.push({
          number: 1,
          episodes: Array.from({ length: 10 }, (_, i) => ({
            season: 1,
            number: i + 1,
            title: `Episode ${i + 1}`,
            overview: `Season 1 Episode ${i + 1}`
          }))
        });
      }
    }
    item.seasons = seasons;

    // Audio Language Dubs
    const dubs = [];
    if (Array.isArray(subject.dubs)) {
      for (const d of subject.dubs) {
        dubs.push({
          subjectId: String(d.subjectId || d.id || subjectId),
          language: sanitizeLanguage(d.lanName || d.language),
          label: d.title || d.name || d.lanName || "Default"
        });
      }
    }
    if (dubs.length === 0) {
      dubs.push({
        subjectId: String(subjectId),
        language: "English",
        label: "Original Audio"
      });
    }
    item.dubs = dubs;

    // Fetch TMDB metadata for real cast, actor headshots, character names & real synopsis
    const tmdbMeta = await fetchTmdbMetadata(item.title);
    if (tmdbMeta) {
      if (tmdbMeta.overview && (item.description === "No overview available." || tmdbMeta.overview.length > (item.description || '').length)) {
        item.description = tmdbMeta.overview;
      }
      if (tmdbMeta.vote_average) {
        item.rating = tmdbMeta.vote_average;
      }
    }

    let cast = (tmdbMeta && tmdbMeta.cast && tmdbMeta.cast.length > 0) ? tmdbMeta.cast : [];

    if (cast.length === 0) {
      const rawActors = subject.actors || subject.cast || subject.staff || subject.stars || [];
      if (Array.isArray(rawActors) && rawActors.length > 0) {
        rawActors.forEach((a) => {
          const actorName = typeof a === 'string' ? a.trim() : (a.name || a.actorName || a.realName || '');
          const charName = typeof a === 'object' ? (a.role || a.character || a.characterName || 'Lead Role') : 'Lead Role';
          if (actorName) {
            cast.push({
              name: actorName,
              character: charName,
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(actorName)}&background=1a1a2e&color=ffffff&size=185`
            });
          }
        });
      } else if (typeof rawActors === 'string' && rawActors.trim().length > 0) {
        const names = rawActors.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
        names.forEach((name) => {
          cast.push({
            name,
            character: 'Lead Role',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a1a2e&color=ffffff&size=185`
          });
        });
      }
    }
    item.cast = cast;

    // Related Recommendations ("More Like This")
    try {
      const primaryGenre = (item.genres && item.genres.length > 0) ? item.genres[0] : (item.type === 'series' ? 'series' : 'movie');
      const relData = await movieboxApiRequest('POST', '/wefeed-mobile-bff/subject-api/search/v2', {
        keyword: primaryGenre,
        page: 1,
        perPage: 12,
        subjectType: 0
      }).catch(() => ({}));

      const rawRel = (relData.results && relData.results[0] && relData.results[0].subjects) || relData.list || [];
      item.related = rawRel
        .map(normalizeMovieBoxSubject)
        .filter(Boolean)
        .filter(r => r.id !== item.id)
        .slice(0, 10);
    } catch (e) {
      item.related = [];
    }

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch details" });
  }
});

// Trailer Preview Endpoint (TMDB YouTube Key)
app.get('/api/trailer', async (req, res) => {
  try {
    const title = req.query.q || '';
    if (!title) return res.json({ videoKey: null });

    const cleanTitle = title.replace(/\[.*?\]|\(.*?\)/g, '').trim();
    const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(4000) });
    if (!searchRes.ok) return res.json({ videoKey: null });

    const searchData = await searchRes.json();
    const match = (searchData.results || []).find(r => r.media_type === 'movie' || r.media_type === 'tv') || (searchData.results || [])[0];
    if (!match) return res.json({ videoKey: null });

    const mediaType = match.media_type === 'tv' ? 'tv' : 'movie';
    const videosUrl = `https://api.themoviedb.org/3/${mediaType}/${match.id}/videos?api_key=${TMDB_API_KEY}`;
    const videosRes = await fetch(videosUrl, { signal: AbortSignal.timeout(4000) });
    if (!videosRes.ok) return res.json({ videoKey: null });

    const videosData = await videosRes.json();
    const trailer = (videosData.results || []).find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')) || (videosData.results || [])[0];

    res.json({
      title: match.title || match.name || cleanTitle,
      videoKey: trailer ? trailer.key : null,
      site: trailer ? trailer.site : null
    });
  } catch (e) {
    res.json({ videoKey: null });
  }
});

// Watch Party Synchronization & Chat State
const watchPartyRooms = new Map();

app.get('/api/party/:roomId', (req, res) => {
  const { roomId } = req.params;
  if (!watchPartyRooms.has(roomId)) {
    return res.status(404).json({ error: "Party room not found" });
  }
  res.json(watchPartyRooms.get(roomId));
});

app.post('/api/party/create', (req, res) => {
  const { mediaId, mediaTitle, poster, season, episode, hostName } = req.body || {};
  const roomId = 'room_' + Math.random().toString(36).substring(2, 9);
  const roomState = {
    roomId,
    mediaId,
    mediaTitle: mediaTitle || "Movie / Series",
    poster,
    season: season || 1,
    episode: episode || 1,
    hostName: hostName || "Host",
    currentTime: 0,
    isPlaying: true,
    messages: [
      { id: '1', sender: 'System', text: `🎉 Watch party room created! Share code [${roomId}] to watch together in sync.`, timestamp: Date.now(), isSystem: true }
    ],
    members: [{ name: hostName || "Host", isHost: true }]
  };
  watchPartyRooms.set(roomId, roomState);
  res.json(roomState);
});

app.post('/api/party/:roomId/action', (req, res) => {
  const { roomId } = req.params;
  const { action, currentTime, isPlaying, text, sender } = req.body || {};
  const room = watchPartyRooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  if (action === 'sync') {
    if (typeof currentTime === 'number') room.currentTime = currentTime;
    if (typeof isPlaying === 'boolean') room.isPlaying = isPlaying;
  } else if (action === 'chat' && text) {
    room.messages.push({
      id: Math.random().toString(36).substr(2, 9),
      sender: sender || "Guest",
      text,
      timestamp: Date.now()
    });
  } else if (action === 'join' && sender) {
    if (!room.members.find(m => m.name === sender)) {
      room.members.push({ name: sender, isHost: false });
      room.messages.push({
        id: Math.random().toString(36).substr(2, 9),
        sender: 'System',
        text: `👋 ${sender} joined the watch party!`,
        timestamp: Date.now(),
        isSystem: true
      });
    }
  }
  res.json(room);
});

// 4. Stream Resolution Endpoint (Combining Play-Info, Resource List, Dubs & Fallbacks)
app.get('/api/streams', async (req, res) => {
  try {
    const { id, season = '0', episode = '0' } = req.query;
    if (!id) return res.status(400).json({ error: "Missing subject ID" });

    const cleanId = String(id).split('?')[0];
    const se = parseInt(season, 10);
    const ep = parseInt(episode, 10);

    const resolvedStreams = [];
    const seenUrls = new Set();

    async function extractFromPlayInfo(infoData) {
      if (!infoData) return;
      const streamsData = (infoData.streams) || (infoData.data && infoData.data.streams) || [];
      for (const st of streamsData) {
        const streamUrl = st.url || '';
        const signCookie = st.signCookie || '';
        const resolutionsStr = st.resolutions || "1080,720,480,360";

        let playableUrl = resolveDashManifestFromPolicy(signCookie) || streamUrl;
        if (!playableUrl || isNoticeUrl(playableUrl)) continue;

        if (seenUrls.has(playableUrl)) continue;
        seenUrls.add(playableUrl);

        const qualities = resolutionsStr.split(',').map(s => s.trim() + 'p').filter(Boolean);
        const streamHeaders = { 'Referer': STREAM_REFERER, 'Cookie': signCookie };

        let durationSeconds = 0;
        try {
          const mpdRes = await fetch(playableUrl, { method: 'GET', headers: streamHeaders, signal: AbortSignal.timeout(3000) });
          const mpdText = await mpdRes.text();
          const durMatch = mpdText.match(/mediaPresentationDuration="([^"]+)"/i);
          if (durMatch && durMatch[1]) {
            durationSeconds = parseIsoDuration(durMatch[1]);
          }
        } catch (e) {}

        const transcodeUrl = `/api/transcode-stream?url=${encodeURIComponent(playableUrl)}&headers=${encodeURIComponent(JSON.stringify(streamHeaders))}`;
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(playableUrl)}&headers=${encodeURIComponent(JSON.stringify(streamHeaders))}`;

        resolvedStreams.push({
          id: st.id ? String(st.id) : null,
          url: transcodeUrl,
          rawUrl: playableUrl,
          format: 'MP4',
          durationSeconds,
          qualities: qualities.length ? qualities : ['1080p', '720p', '480p'],
          cookie: signCookie,
          headers: streamHeaders
        });

        resolvedStreams.push({
          id: st.id ? String(st.id) + '-dash' : null,
          url: proxyUrl,
          rawUrl: playableUrl,
          format: 'DASH',
          durationSeconds,
          qualities: qualities.length ? qualities : ['1080p', '720p', '480p'],
          cookie: signCookie,
          headers: streamHeaders
        });
      }
    }

    async function extractFromResourceList(resList) {
      if (!resList) return;
      const resourceList = (resList.list) || (resList.data && resList.data.list) || (Array.isArray(resList) ? resList : []);
      for (const item of resourceList) {
        const link = item.resourceLink || item.url || item.downloadUrl || '';
        if (!link || isNoticeUrl(link)) continue;

        if (seenUrls.has(link)) continue;
        seenUrls.add(link);

        const resVal = item.resolution ? `${item.resolution}p` : '720p';
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(link)}&headers=${encodeURIComponent(JSON.stringify({
          'Referer': STREAM_REFERER
        }))}`;

        resolvedStreams.push({
          id: item.resourceId || item.id ? String(item.resourceId || item.id) : null,
          url: proxyUrl,
          rawUrl: link,
          format: 'MP4',
          qualities: [resVal, '720p', '480p'],
          cookie: '',
          headers: { 'Referer': STREAM_REFERER }
        });
      }
    }

    // Step 1: Query requested se and ep
    const playInfoPath = (se === 0 && ep === 0)
      ? `/wefeed-mobile-bff/subject-api/play-info/v2?subjectId=${cleanId}`
      : `/wefeed-mobile-bff/subject-api/play-info/v2?subjectId=${cleanId}&se=${se}&ep=${ep}`;

    const pageNum = ep > 0 ? Math.floor((ep - 1) / 20) + 1 : 1;
    const resourcePath = (se === 0 && ep === 0)
      ? `/wefeed-mobile-bff/subject-api/resource?subjectId=${cleanId}&page=${pageNum}&perPage=20`
      : `/wefeed-mobile-bff/subject-api/resource?subjectId=${cleanId}&se=${se}&ep=${ep}&page=${pageNum}&perPage=20`;

    const [playInfo, resData] = await Promise.all([
      movieboxApiRequest('GET', playInfoPath).catch(() => ({})),
      movieboxApiRequest('GET', resourcePath).catch(() => ({}))
    ]);

    await extractFromPlayInfo(playInfo);
    await extractFromResourceList(resData);

    // Step 2: Fallback to base play-info (without se/ep) and base resource page 1 if 0 streams found
    if (resolvedStreams.length === 0) {
      const [basePlayInfo, baseResData] = await Promise.all([
        movieboxApiRequest('GET', `/wefeed-mobile-bff/subject-api/play-info/v2?subjectId=${cleanId}`).catch(() => ({})),
        movieboxApiRequest('GET', `/wefeed-mobile-bff/subject-api/resource?subjectId=${cleanId}&page=1&perPage=50`).catch(() => ({}))
      ]);
      await extractFromPlayInfo(basePlayInfo);
      await extractFromResourceList(baseResData);
    }

    // Step 2.5: If still 0 streams and a specific se/ep was requested for a series, scan available active seasons
    if (resolvedStreams.length === 0 && se > 0) {
      try {
        const seasonInfo = await movieboxApiRequest('GET', `/wefeed-mobile-bff/subject-api/season-info?subjectId=${cleanId}`).catch(() => ({}));
        const rawSeasons = seasonInfo.seasons || seasonInfo || [];
        if (Array.isArray(rawSeasons) && rawSeasons.length > 0) {
          // Sort seasons descending to try active recent seasons first
          const sortedSeasons = [...rawSeasons].sort((a, b) => (b.se || 0) - (a.se || 0));
          for (const sObj of sortedSeasons) {
            const altSe = sObj.se || 1;
            if (altSe === se) continue; // Already tried requested se
            const altPlayInfo = await movieboxApiRequest('GET', `/wefeed-mobile-bff/subject-api/play-info/v2?subjectId=${cleanId}&se=${altSe}&ep=1`).catch(() => ({}));
            await extractFromPlayInfo(altPlayInfo);
            if (resolvedStreams.length > 0) break;
          }
        }
      } catch (e) {}
    }

    // Step 3: If still 0 streams, check subject details for dubs or alternative season IDs
    if (resolvedStreams.length === 0) {
      try {
        const detailsData = await movieboxApiRequest('GET', `/wefeed-mobile-bff/subject-api/get?subjectId=${cleanId}`).catch(() => ({}));
        const subject = (detailsData && detailsData.subject) || detailsData || {};

        if (Array.isArray(subject.dubs)) {
          for (const dub of subject.dubs) {
            const dubId = dub.subjectId || dub.id;
            if (dubId && String(dubId) !== cleanId) {
              const dubPlayInfoPath = (se === 0 && ep === 0)
                ? `/wefeed-mobile-bff/subject-api/play-info/v2?subjectId=${dubId}`
                : `/wefeed-mobile-bff/subject-api/play-info/v2?subjectId=${dubId}&se=${se}&ep=${ep}`;

              const dubPlayInfo = await movieboxApiRequest('GET', dubPlayInfoPath).catch(() => ({}));
              await extractFromPlayInfo(dubPlayInfo);

              if (resolvedStreams.length === 0) {
                const dubBasePlayInfo = await movieboxApiRequest('GET', `/wefeed-mobile-bff/subject-api/play-info/v2?subjectId=${dubId}`).catch(() => ({}));
                await extractFromPlayInfo(dubBasePlayInfo);
              }
              if (resolvedStreams.length > 0) break;
            }
          }
        }
      } catch (e) {}
    }

    // Step 4: If still 0 streams, scan pages 1-5 of subject resources
    if (resolvedStreams.length === 0) {
      for (let p = 1; p <= 5; p++) {
        const pageRes = await movieboxApiRequest('GET', `/wefeed-mobile-bff/subject-api/resource?subjectId=${cleanId}&page=${p}&perPage=20`).catch(() => ({}));
        await extractFromResourceList(pageRes);
        if (resolvedStreams.length > 0) break;
      }
    }

    // Step 5: Title Search Matching Fallback (Auto-resolves CAM items, new listings & unlinked placeholders)
    if (resolvedStreams.length === 0) {
      try {
        const detailsData = await movieboxApiRequest('GET', `/wefeed-mobile-bff/subject-api/get?subjectId=${cleanId}`).catch(() => ({}));
        const subject = (detailsData && detailsData.subject) || detailsData || {};
        const rawTitle = subject.title || subject.name || '';

        if (rawTitle) {
          const cleanTitle = rawTitle
            .replace(/\[.*?\]/g, ' ')
            .replace(/\(.*?\)/g, ' ')
            .replace(/\b(CAM|TS|HDCAM|DVD|WEB-DL|S\d+.*|Hindi|English|Tamil|Telugu|Dual|Audio)\b/gi, ' ')
            .replace(/[^a-zA-Z0-9\s]/g, ' ')
            .trim()
            .replace(/\s+/g, ' ');

          if (cleanTitle && cleanTitle.length >= 2) {
            const searchData = await movieboxApiRequest('POST', '/wefeed-mobile-bff/subject-api/search/v2', {
              keyword: cleanTitle,
              page: 1,
              perPage: 10,
              subjectType: 0
            }).catch(() => ({}));

            const rawList = (searchData.results && searchData.results[0] && searchData.results[0].subjects) || searchData.list || [];
            for (const cand of rawList) {
              const candId = cand.subjectId || cand.id;
              if (candId && String(candId) !== cleanId) {
                const candPlayInfoPath = (se === 0 && ep === 0)
                  ? `/wefeed-mobile-bff/subject-api/play-info/v2?subjectId=${candId}`
                  : `/wefeed-mobile-bff/subject-api/play-info/v2?subjectId=${candId}&se=${se}&ep=${ep}`;

                const candPlayInfo = await movieboxApiRequest('GET', candPlayInfoPath).catch(() => ({}));
                await extractFromPlayInfo(candPlayInfo);

                if (resolvedStreams.length === 0) {
                  const candBasePlayInfo = await movieboxApiRequest('GET', `/wefeed-mobile-bff/subject-api/play-info/v2?subjectId=${candId}`).catch(() => ({}));
                  await extractFromPlayInfo(candBasePlayInfo);
                }

                if (resolvedStreams.length === 0) {
                  const candRes = await movieboxApiRequest('GET', `/wefeed-mobile-bff/subject-api/resource?subjectId=${candId}&page=1&perPage=20`).catch(() => ({}));
                  await extractFromResourceList(candRes);
                }

                if (resolvedStreams.length > 0) break;
              }
            }
          }
        }
      } catch (e) {}
    }

    res.json({ streams: resolvedStreams });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to resolve streams" });
  }
});

// 5. Subtitles Endpoint
app.get('/api/subtitles', async (req, res) => {
  try {
    const { id, resourceId = '' } = req.query;
    if (!id) return res.status(400).json({ error: "Missing subject ID" });

    const cleanId = String(id).split('?')[0];
    const path = `/wefeed-mobile-bff/subject-api/get-ext-captions?subjectId=${cleanId}&resourceId=${resourceId}`;
    const data = await movieboxApiRequest('GET', path);
    const captions = (data && data.extCaptions) || (data && data.data && data.data.extCaptions) || [];

    const subtitles = [];
    const seenUrls = new Set();

    for (const cap of captions) {
      if (!cap.url || seenUrls.has(cap.url)) continue;
      seenUrls.add(cap.url);

      const langName = sanitizeLanguage(cap.lanName || cap.lan || "English");
      const proxiedSubUrl = `/api/proxy?url=${encodeURIComponent(cap.url)}`;

      subtitles.push({
        name: langName,
        url: proxiedSubUrl,
        rawUrl: cap.url
      });
    }

    res.json({ subtitles });
  } catch (err) {
    res.json({ subtitles: [] });
  }
});

// --- FFMPEG LIVE TRANSCODE FOR UNIVERSAL HTML5 PLAYBACK WITH SEEKING ---
app.get('/api/transcode-stream', (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("Missing target URL");

    let customHeaders = {};
    if (req.query.headers) {
      try { customHeaders = JSON.parse(req.query.headers); } catch (e) {}
    }

    const ss = req.query.ss ? parseFloat(req.query.ss) : 0;

    const { ua } = getClientInfoAndUa();
    let headerStr = `User-Agent: ${ua}\r\nAccept: */*\r\n`;
    for (const [k, v] of Object.entries(customHeaders)) {
      headerStr += `${k}: ${v}\r\n`;
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

    const args = ['-headers', headerStr];
    if (!isNaN(ss) && ss > 0) {
      args.push('-ss', String(ss));
    }
    args.push(
      '-i', targetUrl,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-crf', '24',
      '-c:a', 'copy',
      '-f', 'mp4',
      '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
      'pipe:1'
    );

    const ffmpegProc = spawn('ffmpeg', args);
    ffmpegProc.stdout.pipe(res);
    ffmpegProc.stderr.on('data', () => {});

    req.on('close', () => {
      try { ffmpegProc.kill('SIGKILL'); } catch (e) {}
    });
  } catch (err) {
    if (!res.headersSent) res.status(500).send("Transcode error: " + err.message);
  }
});

// --- HTTP VIDEO & MANIFEST PROXY WITH CORS ---
app.get('/api/proxy', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("Missing target URL");

    let customHeaders = {};
    if (req.query.headers) {
      try {
        customHeaders = JSON.parse(req.query.headers);
      } catch (e) {}
    }

    const { ua } = getClientInfoAndUa();
    const fetchHeaders = {
      'User-Agent': ua,
      'Accept': '*/*',
      ...customHeaders
    };

    if (req.headers.range) {
      fetchHeaders['Range'] = req.headers.range;
    }

    const upstreamRes = await fetch(targetUrl, {
      method: 'GET',
      headers: fetchHeaders
    });

    res.status(upstreamRes.status);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

    const contentType = upstreamRes.headers.get('content-type');
    const contentLength = upstreamRes.headers.get('content-length');
    const contentRange = upstreamRes.headers.get('content-range');
    const acceptRanges = upstreamRes.headers.get('accept-ranges');

    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);
    if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);

    // If DASH Manifest (.mpd), rewrite segment BaseURLs, HEVC codecs, & force Content-Type: application/dash+xml
    if (targetUrl.endsWith('.mpd') || (contentType && (contentType.includes('xml') || contentType.includes('mpd')))) {
      res.setHeader('Content-Type', 'application/dash+xml');
      let text = await upstreamRes.text();
      const parsedTarget = new URL(targetUrl);
      const hostBase = `${parsedTarget.protocol}//${parsedTarget.host}`;

      const pathParts = parsedTarget.pathname.split('/');
      pathParts.pop(); // remove index.mpd
      const dirPath = pathParts.join('/') + '/';
      const rawBaseCdn = hostBase + dirPath;

      const payload = JSON.stringify({ rawBaseCdn, headers: customHeaders });
      const encodedBase = Buffer.from(payload).toString('base64url');
      const segmentProxyBase = `/api/segment/${encodedBase}/`;

      let rewritten = text;

      // Inject <BaseURL> inside <MPD> for relative segment resolution
      if (!rewritten.includes('<BaseURL>')) {
        const mpdStartIdx = rewritten.indexOf('<MPD');
        const mpdCloseIdx = rewritten.indexOf('>', mpdStartIdx);
        if (mpdStartIdx !== -1 && mpdCloseIdx !== -1) {
          rewritten = rewritten.substring(0, mpdCloseIdx + 1) + 
            `\n\t<BaseURL>${segmentProxyBase}</BaseURL>` + 
            rewritten.substring(mpdCloseIdx + 1);
        }
      }

      return res.send(rewritten);
    }

    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Pipe binary stream
    if (upstreamRes.body) {
      const reader = upstreamRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } else {
      res.end();
    }
  } catch (err) {
    res.status(502).send(`Proxy Error: ${err.message}`);
  }
});

// --- PATH-BASED SEGMENT PROXY FOR RELATIVE DASH / HLS CHUNKS ---
app.get('/api/segment/:encodedBase/*', async (req, res) => {
  try {
    let rawBaseCdn = '';
    let customHeaders = {};

    try {
      const decodedJson = JSON.parse(Buffer.from(req.params.encodedBase, 'base64url').toString('utf8'));
      rawBaseCdn = decodedJson.rawBaseCdn || '';
      customHeaders = decodedJson.headers || {};
    } catch (e) {
      rawBaseCdn = Buffer.from(req.params.encodedBase, 'base64url').toString('utf8');
    }

    const relPath = req.params[0] || '';
    const targetUrl = new URL(relPath, rawBaseCdn).toString();

    if (req.query.headers) {
      try {
        const queryHeaders = JSON.parse(req.query.headers);
        customHeaders = { ...customHeaders, ...queryHeaders };
      } catch (e) {}
    }

    const { ua } = getClientInfoAndUa();
    const fetchHeaders = {
      'User-Agent': ua,
      'Accept': '*/*',
      ...customHeaders
    };

    if (req.headers.range) {
      fetchHeaders['Range'] = req.headers.range;
    }

    const upstreamRes = await fetch(targetUrl, { method: 'GET', headers: fetchHeaders });

    res.status(upstreamRes.status);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

    const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
    const contentLength = upstreamRes.headers.get('content-length');
    const contentRange = upstreamRes.headers.get('content-range');
    const acceptRanges = upstreamRes.headers.get('accept-ranges');

    if (contentType) res.setHeader('Content-Type', contentType);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);
    if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);

    if (upstreamRes.body) {
      const reader = upstreamRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } else {
      res.end();
    }
  } catch (err) {
    res.status(502).send(`Segment Proxy Error: ${err.message}`);
  }
});

// Native Chrome Real Video File Download Proxy Endpoint
app.get('/api/download-file', async (req, res) => {
  try {
    const { url, title = 'Video', season = '0', episode = '0' } = req.query;
    if (!url) return res.status(400).send("Missing download stream URL");

    let cleanTitle = title
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    if (season !== '0' && episode !== '0') {
      cleanTitle += `_S${season}E${episode}`;
    }

    const filename = `${cleanTitle}.mp4`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const fullTarget = url.startsWith('http') ? url : `http://localhost:${PORT}${url}`;
    const upstreamRes = await fetch(fullTarget);

    if (upstreamRes.body) {
      const reader = upstreamRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } else {
      res.status(500).send("Failed to stream download");
    }
  } catch (err) {
    if (!res.headersSent) res.status(500).send("Download error: " + err.message);
  }
});

// Serve frontend static build files if present
const distPath1 = path.join(__dirname, '../dist');
const distPath2 = path.join(__dirname, '../frontend/dist');
const staticPath = require('fs').existsSync(distPath1) ? distPath1 : distPath2;

app.use(express.static(staticPath));
app.get('*', (req, res) => {
  const indexPath = path.join(staticPath, 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send("VYRE OTT Backend Server Running on Port " + PORT);
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` VYRE PREMIUM OTT SERVER STARTED ON PORT ${PORT}`);
    console.log(` REAL PROVIDER INTEGRATION: MovieBox, 4KHDHub, BDIX`);
    console.log(`====================================================`);
  });
}

module.exports = app;
