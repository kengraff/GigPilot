// GigPilot v0.7.14: cache only first-party application shell files.
// Mapbox and all other external requests bypass the service worker cache.
const CACHE='gigpilot-v0714';
const ASSETS=['./','./index.html','./manifest.webmanifest'];
const shellPaths=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).pathname));
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('gigpilot-')&&key!==CACHE).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  // Crucial: never intercept, store, or replay external API responses.
  if(url.origin!==self.location.origin)return;
  if(!shellPaths.has(url.pathname))return;
  event.respondWith(fetch(request).then(response=>{
    if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}
    return response;
  }).catch(async()=>{
    const cached=await caches.match(request);
    if(cached)return cached;
    // A navigation to the app shell can use its installed offline copy.
    if(request.mode==='navigate')return caches.match(new URL('./index.html',self.registration.scope).href);
    return Response.error();
  }));
});
