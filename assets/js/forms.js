/* Acefields registration intake.
   Turns the printed checklist pages into fillable forms.
   Nothing leaves the device until the client chooses to send it.
   Applicants can be added for as many people as the filing needs.
   Submissions go by email, so the firm keeps a written record of every
   instruction. Required documents are attached to that email, not here. */
(function () {
  var EMAIL = 'info@acefieldsattorneys.com.ng';


  var KEEP_UPPER = { NIN: 1, CAC: 1, DOB: 1, TIN: 1, NGO: 1, IT: 1, BVN: 1 };
  function prettyLabel(text) {
    var t = String(text || '').trim();
    if (!t) return t;
    if (t !== t.toUpperCase()) return t;
    var words = t.toLowerCase().split(/\s+/);
    var out = words.map(function (w, i) {
      var bare = w.replace(/[^a-z0-9]/g, '').toUpperCase();
      if (KEEP_UPPER[bare]) return w.toUpperCase();
      return w;
    });
    var joined = out.join(' ');
    return joined.charAt(0).toUpperCase() + joined.slice(1);
  }

  function boot() {
    var page = document.querySelector('main');
    if (!page) return;

    var counters = {};

    function nextLabel(base) {
      counters[base] = (counters[base] || 0) + 1;
      var n = counters[base];
      return base + ' ' + n;
    }

    function convertFields(scope, section) {
      var fields = scope.querySelectorAll('.bn-field');
      Array.prototype.forEach.call(fields, function (f) {
        if (f.querySelector('input, textarea')) return;
        var text = f.innerText.replace(/\s+/g, ' ').trim();
        if (!text) return;
        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'bn-input';
        input.setAttribute('data-section', section);
        input.setAttribute('data-label', prettyLabel(text));
        var holder = f.closest('.bn-prop');
        var who = holder ? holder.querySelector('h3') : null;
        if (who) input.setAttribute('data-applicant', who.innerText.trim());
        input.setAttribute('aria-label', text);
        input.setAttribute('placeholder', 'Tap to fill');
        f.innerHTML = '';
        f.appendChild(document.createTextNode(text));
        f.appendChild(input);
      });
    }

    /* ---------- applicant blocks that can be added to ---------- */
    var done = [];
    var adders = page.querySelectorAll('.bn-prop');
    Array.prototype.forEach.call(adders, function (block) {
      var item = block.closest('.bn-item');
      if (!item || done.indexOf(item) > -1) return;
      done.push(item);
      var heading = item.querySelector('h2');
      var sectionName = heading ? heading.innerText.replace(/^\s*\d+\s*/, '').replace(/\s+/g, ' ').trim() : 'Applicant';
      function singular(word) {
        if (/ies$/i.test(word)) return word.replace(/ies$/i, 'y');
        if (/s$/i.test(word) && !/ss$/i.test(word)) return word.replace(/s$/, '');
        return word;
      }

      var rawBase = (sectionName || 'Applicant')
        .replace(/^\s*\d+\s*/, '')
        .replace(/particulars of\s*/i, '')
        .replace(/\s+information\s*$/i, '')
        .trim();
      var base = singular(rawBase) || 'Applicant';

      var existing = item.querySelectorAll('.bn-prop');
      Array.prototype.forEach.call(existing, function (b, i) {
        var h = b.querySelector('h3');
        if (h) h.innerText = base + ' ' + (i + 1);
        convertFields(b, sectionName);
      });
      counters[base] = existing.length;

      var add = document.createElement('button');
      add.type = 'button';
      add.className = 'bn-add';
      add.innerText = '+ Add another ' + base.toLowerCase();
      add.addEventListener('click', function () {
        var source = item.querySelector('.bn-prop');
        if (!source) return;
        counters[base] = counters[base] + 1;
        var clone = source.cloneNode(true);
        var holderName = base + ' ' + counters[base];
        var h = clone.querySelector('h3');
        if (h) h.innerText = holderName;
        Array.prototype.forEach.call(clone.querySelectorAll('.bn-input'), function (input) {
          input.value = '';
          input.setAttribute('data-applicant', holderName);
        });
        source.parentNode.insertBefore(clone, add);
        refreshIdentity();
        var first = clone.querySelector('.bn-input');
        if (first) first.focus();
      });
      refreshIdentity();

      // a secretary is one person, no adding needed
      if (/secretary/i.test(sectionName)) {
        var single = item.querySelector('.bn-prop h3');
        if (single) single.innerText = 'Company Secretary';
        if (/incorporated/i.test(document.title)) {
          var s2 = item.querySelector('.bn-prop h3');
          if (s2) s2.innerText = 'Secretary';
        }
        return;
      }

      item.appendChild(add);
    });

    /* anything outside an applicant block still needs its field */
    Array.prototype.forEach.call(page.querySelectorAll('.bn-item'), function (item) {
      var heading = item.querySelector('h2');
      var sectionName = heading ? heading.innerText.replace(/^\s*\d+\s*/, '').replace(/\s+/g, ' ').trim() : 'Section';
      convertFields(item, sectionName);
    });


    /* the NIN section must grow with the number of applicants */
    function refreshIdentity() {
      var identity = null;
      Array.prototype.forEach.call(page.querySelectorAll('.bn-item'), function (item) {
        var h = item.querySelector('h2');
        if (h && /identification/i.test(h.innerText)) identity = item;
      });
      if (!identity) return;
      var holder = page.querySelector('.bn-prop h3');
      var holderItem = holder ? holder.closest('.bn-item') : null;
      if (!holderItem) return;
      var names = Array.prototype.map.call(holderItem.querySelectorAll('.bn-prop h3'), function (h) {
        return prettyLabel(h.innerText);
      });
      var wrap = identity.querySelector('.bn-fields');
      if (!wrap) return;
      var count = names.length || 1;
      if (wrap.getAttribute('data-count') === String(count)) return;
      wrap.setAttribute('data-count', String(count));
      wrap.innerHTML = '';
      var sectionName = (identity.querySelector('h2').innerText || 'Means of Identification').replace(/^\s*\d+\s*/, '').trim();
      names.forEach(function (name) {
        var f = document.createElement('div');
        f.className = 'bn-field';
        f.innerHTML = 'NIN, ' + name.toLowerCase() + '<input type="text" class="bn-input" data-label="NIN, ' + name + '" data-section="' + sectionName + '" placeholder="Tap to fill" aria-label="NIN for ' + name + '">';
        wrap.appendChild(f);
      });
    }


    /* objects run a to g on the printed forms, but some filings need more */
    function setupObjects() {
      var letters = 'abcdefghijklmnopqrstuvwxyz';
      Array.prototype.forEach.call(page.querySelectorAll('.bn-item'), function (item) {
        var h = item.querySelector('h2');
        if (!h || !/objects?/i.test(h.innerText)) return;
        // the single object page already has its own core object field
        if (/core object/i.test(h.innerText)) return;
        var wrap = item.querySelector('.bn-fields');
        if (!wrap) return;
        var sectionName = h.innerText.replace(/^\s*\d+\s*/, '').trim();

        var add = document.createElement('button');
        add.type = 'button';
        add.className = 'bn-add';
        add.innerText = '+ Add another object';

        function wire(container, startAt) {
          var n = startAt;
          var row = document.createElement('div');
          row.className = 'bn-fields';
          var field = document.createElement('div');
          field.className = 'bn-field';
          var letter = letters[n] || ('extra ' + (n - 6));
          var label = 'Object (' + letter + ')';
          field.innerHTML = label + '<input type="text" class="bn-input" data-label="' + label + '" data-section="' + sectionName + '" placeholder="Tap to fill" aria-label="' + label + '">';
          row.appendChild(field);
          container.parentNode.insertBefore(row, container.nextSibling);
          container = row;
          return container;
        }

        var current = wrap;
        add.addEventListener('click', function () {
          var count = item.querySelectorAll('.bn-input').length;
          current = wire(current, count);
          var last = current.querySelector('.bn-input');
          if (last) last.focus();
        });
        item.appendChild(add);
      });
    }

    setupObjects();

    /* ---------- clear manual document handoff ---------- */
    Array.prototype.forEach.call(page.querySelectorAll('.bn-item'), function (item) {
      var heading = item.querySelector('h2');
      var title = heading ? heading.innerText.replace(/^\s*\d+\s*/, '').trim().toLowerCase() : '';
      var requiresDocument = title.indexOf('passport') > -1 || title.indexOf('signature') > -1 || title.indexOf('document') > -1;
      if (!requiresDocument) return;
      var note = document.createElement('p');
      note.className = 'bn-manual-attach';
      var docLabel = heading ? heading.innerText.replace(/^\s*\d+\s*/, '').trim() : 'Document';
      var filing = (document.title || '').split('|')[0].replace(/\s+Checklist\s*$/i, '').trim();
      var docSubject = encodeURIComponent(docLabel + ' — ' + filing);
      var docBody = encodeURIComponent(
        'Good day Acefields Attorneys, Solicitors and Notary Public,' +
        String.fromCharCode(10, 10) +
        'Please find attached my ' + docLabel.toLowerCase() + ' for ' + filing + '.' +
        String.fromCharCode(10, 10) +
        'Name: ' +
        String.fromCharCode(10) +
        'Telephone: ' +
        String.fromCharCode(10, 10) +
        '— Sent from the firm website'
      );
      note.innerHTML = '<strong>Send this separately by email.</strong> This form does not upload files. '
        + 'After your mail app opens, attach the requested document to that email before you send it. '
        + 'You can also email it on its own to '
        + '<a href="mailto:info@acefieldsattorneys.com.ng?subject=' + docSubject + '&body=' + docBody + '" '
        + 'style="color:#D0AC6E;border-bottom:1px solid rgba(208,172,110,.45);text-decoration:none;white-space:nowrap">'
        + 'info@acefieldsattorneys.com.ng</a>.';
      item.appendChild(note);
    });

    /* ---------- free text ---------- */
    var cta = page.querySelector('.bn-cta');
    if (cta) {
      var box = document.createElement('div');
      box.className = 'bn-note';
      box.innerHTML = '<label for="bnNotes">Anything else the firm should know</label>' +
        '<textarea id="bnNotes" rows="3" placeholder="Optional"></textarea>';
      /* the notes box belongs above the declaration, which sits directly before the buttons */
      var before = cta.parentNode.querySelector('.bn-declare') || cta;
      cta.parentNode.insertBefore(box, before);
    }

    /* ---------- assemble and send ---------- */
    var send = cta ? cta.querySelector('a') : null;
    if (send) {
      send.textContent = 'Send these details by email';
      send.addEventListener('click', function (e) {
        e.preventDefault();

        /* the declaration must be assented to before anything leaves the page */
        var consent = document.getElementById('bnConsent');
        if (consent && !consent.checked) {
          alert('Please confirm the consent statement underneath the form before sending. It authorises the firm to use the information you have supplied.');
          consent.focus();
          return;
        }

        var lines = [];
        var title = (document.title || 'this filing').split('|')[0].replace(/\s+Checklist\s*$/i, '').trim();
        lines.push('Good day Acefields Attorneys, Solicitors and Notary Public,');
        lines.push('');
        lines.push('I would like to proceed with ' + title + '. The details are below.');
        lines.push('');

        var lastSection = '';
        var filled = 0;

        Array.prototype.forEach.call(page.querySelectorAll('.bn-input'), function (node) {
          var value = node.value.trim();
          if (!value) return;
          filled++;
          var section = node.getAttribute('data-section') || (node.closest('.bn-item') || {}).innerText;
          var label = node.getAttribute('data-label') || 'Field';
          if (section !== lastSection) {
            lines.push('');
            lines.push(section.toUpperCase());
            lastSection = section;
          }
          var who = node.getAttribute('data-applicant');
          var shown = prettyLabel(label);
          if (who) {
            var owner = prettyLabel(who);
            shown = owner + ', ' + shown.charAt(0).toLowerCase() + shown.slice(1);
          }
          lines.push('• ' + shown + ': ' + value);
        });

        var notes = document.getElementById('bnNotes');
        if (notes && notes.value.trim()) {
          lines.push('');
          lines.push('ADDITIONAL NOTES');
          lines.push(notes.value.trim());
        }

        if (!filled && !(notes && notes.value.trim())) {
          alert('Please fill in the details you have, then tap send again.');
          return;
        }

        if (page.querySelector('.bn-manual-attach')) {
          lines.push('');
          lines.push('DOCUMENTS');
          lines.push('No files were attached by the website. Please attach each requested document (passport photograph, specimen signature and any other item listed) to this email before sending it.');
        }

        if (consent && consent.checked) {
          lines.push('');
          lines.push('DECLARATION');
          lines.push('I confirm that the information I have supplied is true, correct and authentic to the best of my knowledge.');
          lines.push('I consent to and authorise Acefields Attorneys, Solicitors and Notary Public to use the information I have provided in the execution of my instructions.');
        }

        var body = lines.join(String.fromCharCode(10)) + String.fromCharCode(10, 10)
                 + '— Sent from the firm intake form on acefieldsattorneys.com.ng';

        var subject = title + ' — details for the firm';

        /* A mailto link cannot carry a long intake: Gmail, iOS Mail and Outlook
           truncate or drop the body once the URL passes roughly 2,000 characters,
           which left the firm receiving empty emails. So the details are copied to
           the clipboard and shown on the page, and only the subject travels in the
           link. The client pastes the text into the email. */
        var href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject);

        showEmailPanel(cta, href, body, subject);
        copyToClipboard(body);
      });
    }

    /* ---------- email handoff panel ---------- */
    function copyToClipboard(text) {
      var state = document.getElementById('bnCopyState');
      var ok = function () {
        if (state) { state.textContent = 'Copied — paste it into the email'; }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok).catch(function () { legacyCopy(text, ok); });
      } else {
        legacyCopy(text, ok);
      }
    }

    function legacyCopy(text, done) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (err) {}
      document.body.removeChild(ta);
    }

    function downloadText(text, filename) {
      try {
        var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 1200);
      } catch (err) {}
    }

    function showEmailPanel(ctaNode, href, body, subject) {
      var existing = document.getElementById('bnEmailPanel');
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

      var panel = document.createElement('div');
      panel.id = 'bnEmailPanel';
      panel.setAttribute('style', [
        'margin-top:18px',
        'padding:20px',
        'border:1px solid rgba(208,172,110,.34)',
        'background:rgba(208,172,110,.06)',
        'font-size:.9rem',
        'line-height:1.62',
        'color:#B4AEA3'
      ].join(';'));

      var btn = 'display:inline-flex;align-items:center;justify-content:center;padding:11px 18px;'
              + 'font-size:.74rem;font-weight:500;letter-spacing:.09em;text-transform:uppercase;'
              + 'text-decoration:none;cursor:pointer;font-family:inherit;border:1px solid ';
      var solid = btn + '#D0AC6E;background:#D0AC6E;color:#15161A;';
      var ghost = btn + 'rgba(208,172,110,.34);background:transparent;color:#B4AEA3;';

      var html = '';
      html += '<p style="margin:0 0 12px;font-size:.98rem;color:#E6CB98;font-weight:600">Your details are ready to send</p>';
      html += '<p style="margin:0 0 12px">Email apps cannot carry a long pre-filled message, so the details below have been <strong style="color:#E6CB98">copied to your clipboard</strong>. Open the email, then paste them in.</p>';
      html += '<ol style="margin:0 0 14px;padding-left:20px">';
      html += '<li style="margin-bottom:5px">Tap <strong style="color:#E6CB98">Open email app</strong> below.</li>';
      html += '<li style="margin-bottom:5px">In the message body, paste the copied details.</li>';
      html += '<li>Attach your passport photographs and signatures before sending.</li>';
      html += '</ol>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:10px;margin:0 0 14px">'
            +   '<a href="' + href + '" style="' + solid + '">Open email app</a>'
            +   '<button type="button" id="bnCopyBtn" style="' + ghost + '">Copy details again</button>'
            +   '<button type="button" id="bnDownloadBtn" style="' + ghost + '">Save as text file</button>'
            + '</div>';
      html += '<p id="bnCopyState" style="margin:0 0 10px;color:#E6CB98;font-size:.78rem;letter-spacing:.05em"></p>';
      html += '<label for="bnEmailText" style="display:block;margin:0 0 6px;font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;color:#8A8279">The details, ready to copy</label>';
      html += '<textarea id="bnEmailText" readonly spellcheck="false" style="width:100%;box-sizing:border-box;height:170px;padding:12px;border:1px solid rgba(208,172,110,.24);background:#0E0F13;color:#D8D2C8;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.55;resize:vertical">'
            + body.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            + '</textarea>';
      html += '<p style="margin:12px 0 0">Or send it to <strong style="color:#E6CB98">' + EMAIL + '</strong> yourself, or call the firm on <a href="tel:+2349112111021" style="color:#D0AC6E">0911 211 1021</a>.</p>';

      panel.innerHTML = html;
      ctaNode.parentNode.insertBefore(panel, ctaNode.nextSibling);

      var copyBtn = document.getElementById('bnCopyBtn');
      if (copyBtn) copyBtn.addEventListener('click', function () {
        var ta = document.getElementById('bnEmailText');
        if (ta) { ta.focus(); ta.select(); }
        copyToClipboard(body);
      });

      var dl = document.getElementById('bnDownloadBtn');
      if (dl) dl.addEventListener('click', function () {
        var safe = subject.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        downloadText(body, safe + '.txt');
      });
    }

    var print = page.querySelector('.bn-print');
    if (print) {
      print.addEventListener('click', function () { window.print(); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
