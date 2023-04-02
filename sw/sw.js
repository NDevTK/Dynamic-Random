"use strict";
self.addEventListener('fetch', function (event) {
  event.respondWith(fetch(event.request).then(inject));
});

function inject(response) {
const headers = new Headers(response.headers);
headers.set('Content-Security-Policy', 'sandbox allow-scripts');
return new Response(response.body, { headers: headers });
}
