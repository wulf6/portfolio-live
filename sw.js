const CACHE = 'portfolio-v3';
const SHELL = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Space+Grotesk:wght@400;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL.map(u => new Request(u, {cache:'reload'}))))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Ignoruj chrome-extension a non-http requesty
  if(!url.startsWith('http')) return;

  // GitHub API a ceny — vždy network, nikdy necachuj
  if(url.includes('api.github.com') || url.includes('finance.yahoo') ||
     url.includes('allorigins') || url.includes('finnhub') ||
     url.includes('stooq') || url.includes('alphavantage')) return;

  // Fonty a CDN — cache first
  if(url.includes('fonts.gstatic.com') || url.includes('fonts.googleapis.com') ||
     url.includes('cdn.jsdelivr.net') || url.includes('cdnjs.cloudflare.com')){
    e.respondWith(
      caches.open(CACHE).then(c =>
        c.match(e.request).then(r => r || fetch(e.request).then(resp => {
          c.put(e.request, resp.clone()); return resp;
        }))
      )
    );
    return;
  }

  // Hlavní stránka — network first, fallback cache (offline)
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        const clone = resp.clone();
        // Ukládej do cache jen http/https requesty
        if(e.request.url.startsWith('http')){
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});
