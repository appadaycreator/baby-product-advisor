// Service Worker for Baby Product Advisor (M16 PWA化実装)

const CACHE_NAME = 'baby-product-advisor-v1';
const ASSETS_TO_CACHE = [
  '/baby-product-advisor/',
  '/baby-product-advisor/index.html',
  '/baby-product-advisor/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+JP:wght@300;400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

// インストール時にアセットをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching assets for offline use');
        return cache.addAll(ASSETS_TO_CACHE).catch(err => {
          console.warn('Failed to cache some assets:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// アクティベート時に古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// フェッチ時にキャッシュを利用（Network first、失敗時に Cache fallback）
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 外部CDN・外部API は除外
  if (url.hostname !== 'appadaycreator.com' &&
      url.hostname !== 'localhost' &&
      !url.hostname.endsWith('googleapis.com') &&
      !url.hostname.endsWith('jsdelivr.net')) {
    return; // Pass through
  }

  // Network first: オンラインならネットワーク、失敗時はキャッシュ
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 成功時、キャッシュも更新
        if (response.ok) {
          const cacheCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cacheCopy);
          });
        }
        return response;
      })
      .catch(() => {
        // オフライン時：キャッシュから返す
        return caches.match(request)
          .then((response) => response || offlineResponse(request));
      })
  );
});

// オフライン時の代替レスポンス
function offlineResponse(request) {
  if (request.destination === 'document') {
    // HTML リクエストの場合、キャッシュされた index.html を返す
    return caches.match('/index.html');
  }
  // その他は 404 相当を返す
  return new Response('Offline - Resource not available', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: new Headers({ 'Content-Type': 'text/plain' })
  });
}
