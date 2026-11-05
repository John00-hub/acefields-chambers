/* Acefields visit measurement.
   Cloudflare Web Analytics, no cookies, so no consent banner is needed.
   Token belongs to the acefieldsattorneys.com.ng site in Cloudflare. */
(function () {
  var CF_TOKEN = "1e1fe8f02e34431eb847a2c8531c56c8";
  if (!CF_TOKEN) return;
  var s = document.createElement('script');
  s.type = 'module';
  s.src = "https://static.cloudflareinsights.com/beacon.min.js";
  s.setAttribute('data-cf-beacon', JSON.stringify({ token: CF_TOKEN }));
  document.head.appendChild(s);
})();
