/* Acefields visit measurement.
   Cloudflare Web Analytics, no cookies, no consent banner needed.
   Paste the token Cloudflare gives you in place of the empty string below.
   Leave it empty and nothing loads, so the site stays fast and clean. */
(function () {
  var CF_TOKEN = "";
  if (!CF_TOKEN) return;
  var s = document.createElement('script');
  s.defer = true;
  s.src = "https://static.cloudflareinsights.com/beacon.min.js";
  s.setAttribute('data-cf-beacon', JSON.stringify({ token: CF_TOKEN }));
  document.head.appendChild(s);
})();
