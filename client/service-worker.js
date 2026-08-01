const CACHE_NAME = 'ays-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/assets/images/ays-icon1.png',
    '/assets/images/collage-1.jpg',
    '/assets/images/collage-2.jpg',
    '/assets/images/collage-3.jpg',
    '/assets/images/collage-4.jpg',
    '/fonts/شکلات.ttf',
    '/fonts/AradVF.ttf',
    '/fonts/Acquire-BW0ox.otf',
    '/fonts/DujitsuFont-Demo.otf',
    '/fonts/Electro Garden.ttf'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
