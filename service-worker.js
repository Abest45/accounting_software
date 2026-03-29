const CACHE_NAME = 'finanalytics-static-v1';
const DATA_CACHE_NAME = 'finanalytics-data-v1';

const OFFLINE_PAGE = '/offline.html';

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/finance.css',
  '/finance.js',
  '/components-2fa-reports.js',
  '/manifest.webmanifest',
  '/offline.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.socket.io/4.7.2/socket.io.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (![CACHE_NAME, DATA_CACHE_NAME].includes(key)) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(async cache => {
        try {
          const response = await fetch(event.request);
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        } catch (error) {
          const cachedResponse = await cache.match(event.request);
          return cachedResponse || new Response(JSON.stringify({ success: false, message: 'Offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        }
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_PAGE);
        }
      });
    })
  );
});

self.addEventListener('sync', event => {
  if (event.tag === 'sync-finanalytics-posts') {
    event.waitUntil(processPendingRequests());
  }
});

async function processPendingRequests() {
  const requests = await getPendingRequests();
  for (const { url, method, headers, body } of requests) {
    try {
      await fetch(url, { method, headers, body: body ? JSON.parse(body) : undefined });
      await removePendingRequest(url, method, body);
    } catch (error) {
      console.error('Sync failed for', url, error);
      break;
    }
  }
}

function getPendingRequests() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('finanalytics-offline-db', 1);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = event => {
      const db = event.target.result;
      const tx = db.transaction('requests', 'readonly');
      const store = tx.objectStore('requests');
      const getAll = store.getAll();
      getAll.onsuccess = () => resolve(getAll.result);
      getAll.onerror = () => reject(getAll.error);
    };
    request.onerror = () => reject(request.error);
  });
}

function removePendingRequest(url, method, body) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('finanalytics-offline-db', 1);
    request.onsuccess = event => {
      const db = event.target.result;
      const tx = db.transaction('requests', 'readwrite');
      const store = tx.objectStore('requests');
      const getAll = store.getAll();
      getAll.onsuccess = () => {
        const matched = getAll.result.filter(item => item.url === url && item.method === method && item.body === body);
        matched.forEach(item => store.delete(item.id));
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}
