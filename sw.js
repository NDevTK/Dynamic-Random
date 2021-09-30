"use strict";
self.addEventListener('fetch', function (event) {
  event.respondWith(fetch(event.request).then(inject));
});

function inject(response) {
const headers = new Headers(response.headers);
headers.set('Content-Security-Policy', 'sandbox allow-scripts allow-modals;');
headers.set('X-Frame-Options', 'same-origin');
headers.set('Cross-Origin-Opener-Policy', 'same-origin');
headers.set('Strict-Transport-Security', 'max-age=31536000');
headers.set('X-Content-Type-Options', 'nosniff')
return new Response(response.body, { headers: headers });
}
