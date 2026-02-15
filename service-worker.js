const CACHE = 'hayashi-app-v3'; // ← バージョンを上げて反映を確実に
const ASSETS = [
  './','./index.html','./styles.css',
  './config.js','./config-loader.js',
  './router.js','./renderers.js','./app.js','./manifest.json',
  './icons/icon-192.png','./icons/icon-512.png'
];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
});
self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  const isAsset = ASSETS.some(p=>url.pathname.endsWith(p.replace('./','/')));
  e.respondWith((isAsset? caches.match(e.request).then(r=>r||fetch(e.request)) : fetch(e.request).catch(()=>caches.match(e.request))));
});
