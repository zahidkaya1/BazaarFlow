const CACHE_PREFIX = 'bazaarflow-web-'
const CACHE_NAME = `${CACHE_PREFIX}v1`

function scopedUrl(path = '') {
  return new URL(path, self.registration.scope).toString()
}

const APP_SHELL = [
  '',
  'index.html',
  'manifest.webmanifest',
  'favicon.ico',
  'pwa-192.png',
  'pwa-512.png',
].map(scopedUrl)

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request

  if (request.method !== 'GET') {
    return
  }

  const requestUrl = new URL(request.url)
  const scopeUrl = new URL(self.registration.scope)

  if (requestUrl.origin !== scopeUrl.origin) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }

          return response
        })
        .catch(async () => {
          return (
            await caches.match(request)
            ?? await caches.match(scopedUrl(''))
            ?? await caches.match(scopedUrl('index.html'))
          )
        }),
    )

    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkResponse = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }

          return response
        })
        .catch(() => cachedResponse)

      return cachedResponse ?? networkResponse
    }),
  )
})
