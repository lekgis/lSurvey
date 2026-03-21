// ========== การตั้งค่าแคช ==========
const APP_CACHE_NAME = 'gis-survey-app-v2';
const MAP_CACHE_NAME = 'map-tiles-v2';

// ไฟล์แอปที่ต้องการแคช
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/icons/lb.ico',
  '/static/icons/lb-192.png',
  '/static/icons/lb-512.png'
];

// ✅ แก้ไข: ลบช่องว่างท้าย URL ของไทล์แผนที่
const TILE_URLS = [
  'https://mt0.google.com',
  'https://mt1.google.com',
  'https://mt2.google.com',
  'https://mt3.google.com'
];

// ========== Event: Install ==========
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    Promise.all([
      caches.open(APP_CACHE_NAME).then((cache) => {
        console.log('Caching app assets...');
        return cache.addAll(urlsToCache).catch((err) => {
          console.warn('Failed to cache app assets:', err);
        });
      }),
      caches.open(MAP_CACHE_NAME).then((cache) => {
        console.log('Map tile cache ready');
      })
    ]).then(() => {
      console.log('Service Worker installed successfully');
      return self.skipWaiting();
    })
  );
});

// ========== Event: Fetch ==========
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  if (TILE_URLS.some(tileUrl => url.startsWith(tileUrl.trim()))) {
    event.respondWith(handleMapTileRequest(event.request));
  } else {
    event.respondWith(handleAppRequest(event.request));
  }
});

async function handleMapTileRequest(request) {
  const cache = await caches.open(MAP_CACHE_NAME);
  try {
    const cachedResponse = await cache.match(request);
    const networkResponse = await fetch(request).catch(() => null);
      if (networkResponse && networkResponse.status === 200) {
        await cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }).catch(() => cachedResponse);
    return cachedResponse || networkFetch;
  } catch (err) {
    console.error('Error handling map tile request:', err);
    return fetch(request);
  }
}

async function handleAppRequest(request) {
  const cache = await caches.open(APP_CACHE_NAME);
  try {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;
    const networkResponse = await fetch(request);
    if (request.url.startsWith(self.location.origin)) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    console.error('Error handling app request:', err);
    return caches.match(request);
  }
}

// ========== Event: Activate ==========
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== APP_CACHE_NAME && cacheName !== MAP_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated successfully');
      return self.clients.claim();
    })
  );
});

// ========== ทำความสะอาดแคชไทล์ ==========
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAN_MAP_CACHE') {
    cleanMapCache();
  }
});

async function cleanMapCache() {
  const cache = await caches.open(MAP_CACHE_NAME);
  const keys = await cache.keys();
  const MAX_TILES = 300;
  if (keys.length > MAX_TILES) {
    const tilesToDelete = keys.slice(0, keys.length - MAX_TILES);
    await Promise.all(tilesToDelete.map(key => cache.delete(key)));
    console.log(`Cleaned map cache: deleted ${tilesToDelete.length} old tiles`);
  }
}
