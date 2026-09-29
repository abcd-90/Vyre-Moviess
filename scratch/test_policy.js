const crypto = require('crypto');

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
      const padding = (4 - (normalized.len % 4)) % 4;
      normalized += '='.repeat(padding);
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

const cookie = "Edge-Cache-Cookie=urlprefix=aHR0cHM6Ly9zYmNkbjMuaW5tb3ZpZWJveC5jb20vbXAvaW5jZXB0aW9uLw==:1700000000";
console.log("Manifest:", resolveDashManifestFromPolicy(cookie));
