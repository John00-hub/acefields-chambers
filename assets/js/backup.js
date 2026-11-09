/* Acefields submission backup.

   Every form on the site is posted to FormSubmit, which emails the firm. Email
   can be delayed or lost, and a sending service can run out of credit, so the
   same answers are quietly saved to the firm's own database before the email
   leaves the browser.

   Two rules:
   - The backup never blocks the send. If it fails, the email still goes.
   - Attachments are not uploaded here. Only their file names are recorded, so
     client identity documents stay out of the database until the firm decides
     otherwise.

   Reads are closed to the public: only a signed-in firm user can open a row. */
(function () {
  var URL = 'https://dugdeofuabjpqmyaszur.supabase.co';
  var KEY = 'sb_publishable_UfW-w-9jbqs4Y7Rc2TtpYw_cKm2uRbp';

  /* the sending endpoints that this backup shadows */
  var WATCHED = ['formsubmit.co'];

  var MAX_FIELD = 4000;      /* one answer, in characters */
  var MAX_TOTAL = 120000;    /* the whole record, in characters */

  function clip(text, limit) {
    text = String(text == null ? '' : text);
    return text.length > limit ? text.slice(0, limit) + ' [cut]' : text;
  }

  function snapshot(form) {
    var fields = {};
    var files = [];
    var total = 0;
    var data;
    try { data = new FormData(form); } catch (e) { return null; }

    data.forEach(function (value, name) {
      if (typeof value !== 'string') {
        files.push(clip(value && value.name ? value.name : 'attachment', 120));
        return;
      }
      if (name === '_honey') return;
      if (name === '_captcha' || name === '_template' || name === '_next') return;
      if (total > MAX_TOTAL) return;
      var v = clip(value, MAX_FIELD);
      total += name.length + v.length;
      fields[clip(name, 160)] = v;
    });

    var subject = fields._subject || 'Website submission';
    delete fields._subject;

    return {
      form: clip(subject, 200),
      page: clip(location.pathname + location.hash, 200),
      fields: fields,
      attachments: files,
      user_agent: clip(navigator.userAgent, 300)
    };
  }

  function save(record) {
    if (!record) return;
    try {
      fetch(URL + '/rest/v1/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': KEY,
          'Authorization': 'Bearer ' + KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify([record]),
        /* keepalive lets the request finish even as the page navigates away */
        keepalive: true,
        mode: 'cors',
        credentials: 'omit'
      }).catch(function () { /* the email is the primary path */ });
    } catch (e) { /* never break a send over the backup */ }
  }

  /* the site posts with form.submit(), which fires no event, so the call
     itself is wrapped. Everything else behaves exactly as before. */
  var original = HTMLFormElement.prototype.submit;

  HTMLFormElement.prototype.submit = function () {
    try {
      var action = String(this.getAttribute('action') || '');
      var watched = WATCHED.some(function (host) { return action.indexOf(host) > -1; });
      if (watched) save(snapshot(this));
    } catch (e) { /* ignore */ }
    return original.apply(this, arguments);
  };

  window.__acefieldsBackup = save;
})();
