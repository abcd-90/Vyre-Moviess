const crypto = require('crypto');

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
  const prefixes = ["103.241", "49.36", "117.195", "106.198", "122.162", "157.32", "182.70", "103.58"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const c = Math.floor(Math.random() * 253) + 1;
  const d = Math.floor(Math.random() * 253) + 1;
  return `${prefix}.${c}.${d}`;
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

async function requestHosts(method, pathAndQuery, bodyObj = null, token = null) {
  const ts = Date.now();
  const accept = "application/json";
  const contentType = "application/json";
  const bodyStr = bodyObj ? JSON.stringify(bodyObj) : null;
  const { ua, clientInfo } = getClientInfoAndUa();
  const spoofedIp = getRandomSpoofedIp();

  for (const base of HOST_POOL) {
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

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const opts = {
      method,
      headers
    };
    if (bodyStr) opts.body = bodyStr;

    try {
      const res = await fetch(url, opts);
      if (res.ok) {
        const json = await res.json();
        return json.data !== undefined ? json.data : json;
      }
    } catch (e) {}
  }
  throw new Error("Hosts failed");
}

async function runTest() {
  const login = await requestHosts("POST", "/wefeed-mobile-bff/user-api/visitor-login", {});
  console.log("Token:", login.token ? "OK" : "FAILED");
  const homepage = await requestHosts("GET", "/wefeed-mobile-bff/tab-operating?page=1&tabId=0&version=", null, login.token);
  console.log("Homepage response keys:", Object.keys(homepage));
  console.log("Homepage items count:", homepage.items ? homepage.items.length : "None");
}

runTest().catch(e => console.error("Error:", e));
