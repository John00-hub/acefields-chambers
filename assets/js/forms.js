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
        /* the asterisk is decoration, so it never becomes part of the label */
        text = text.replace(/\s*\*\s*$/, '');
        if (!text) return;
        var mandatory = f.classList.contains('bn-req');
        var long = f.hasAttribute('data-long');
        var input = document.createElement(long ? 'textarea' : 'input');
        if (long) input.rows = 3;
        else input.type = 'text';
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
        if (mandatory) {
          var star = document.createElement('span');
          star.className = 'bn-star';
          star.setAttribute('aria-hidden', 'true');
          star.textContent = ' *';
          f.appendChild(star);
          input.setAttribute('aria-required', 'true');
        }
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
        addPickersFor(holderName, sectionName);
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
      if (heading && /identification/i.test(heading.innerText)) return; /* built below, by person */
      var sectionName = heading ? heading.innerText.replace(/^\s*\d+\s*/, '').replace(/\s+/g, ' ').trim() : 'Section';
      convertFields(item, sectionName);
    });


    /* the NIN section must grow with the number of applicants */
    /* People inside a block marked optional, such as the second proprietor or
       the company secretary, are optional in every respect: their NIN, their
       passport photograph and their signature are not demanded. */
    function optionalPeopleNames() {
      var out = [];
      Array.prototype.forEach.call(page.querySelectorAll('.bn-prop.bn-opt'), function (b) {
        var h = b.querySelector('h3');
        if (!h) return;
        var n = prettyLabel(h.innerText.replace(/\s+/g, ' ').trim())
          .replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
        if (n && out.indexOf(n) === -1) out.push(n);
      });
      return out;
    }


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
      var stamp = names.join('|');
      if (wrap.getAttribute('data-count') === String(count) && wrap.getAttribute('data-names') === stamp) return;
      wrap.setAttribute('data-count', String(count));
      wrap.setAttribute('data-names', stamp);
      var sectionName = (identity.querySelector('h2').innerText || 'Means of Identification').replace(/^\s*\d+\s*/, '').trim();

      /* Rebuild by reusing the field that is already on the page for each person.
         Clearing the section and starting again used to throw away any number
         already typed, so adding a proprietor silently erased the NINs above. */
      var existing = {};
      Array.prototype.forEach.call(wrap.children, function (field) {
        var inp = field.querySelector('input');
        if (inp) existing[inp.getAttribute('data-label')] = field;
      });

      var optional = optionalPeopleNames();
      names.forEach(function (name) {
        var label = 'NIN, ' + name;
        var wanted = optional.indexOf(name) === -1;
        var field = existing[label];
        if (field) {
          delete existing[label];
          field.setAttribute('data-nin-person', label);
          field.className = 'bn-field' + (wanted ? ' bn-req' : '');
          var star = field.querySelector('.bn-star');
          if (star && !wanted) star.parentNode.removeChild(star);
          var inp = field.querySelector('input');
          if (inp) {
            if (wanted) inp.setAttribute('aria-required', 'true');
            else inp.removeAttribute('aria-required');
          }
          wrap.appendChild(field);   /* moving keeps everything already typed */
          return;
        }
        var f = document.createElement('div');
        f.className = 'bn-field' + (wanted ? ' bn-req' : '');
        f.setAttribute('data-nin-person', label);
        f.innerHTML = 'NIN, ' + name.toLowerCase()
          + (wanted ? '<span class="bn-star" aria-hidden="true"> *</span>' : '')
          + '<input type="text" class="bn-input" data-label="' + label + '" data-section="' + sectionName
          + '" placeholder="Tap to fill" aria-label="NIN for ' + name + '"'
          + (wanted ? ' aria-required="true"' : '') + '>';
        wrap.appendChild(f);
      });

      /* anything left over, including the printed placeholders that have no
         input yet, is cleared so the section holds exactly one field per person */
      Array.prototype.slice.call(wrap.children).forEach(function (field) {
        if (field.getAttribute('data-nin-person')) return;
        if (field.parentNode) field.parentNode.removeChild(field);
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

    /* ---------- "+ Add another member" and similar ---------- */
    /* Some lists are plain fields rather than applicant blocks, so they need
       their own button. Pressing it adds one more labelled field. */
    Array.prototype.forEach.call(page.querySelectorAll('.bn-add-fields'), function (btn) {
      btn.addEventListener('click', function () {
        var wrap = page.querySelector(btn.getAttribute('data-target'));
        if (!wrap) return;
        var item = wrap.closest('.bn-item');
        var heading = item ? item.querySelector('h2') : null;
        var sectionName = heading ? heading.innerText.replace(/^\s*\d+\s*/, '').replace(/\s+/g, ' ').trim() : 'Section';
        var prefix = btn.getAttribute('data-label') || 'Member';
        var n = wrap.querySelectorAll('.bn-field').length + 1;

        var f = document.createElement('div');
        f.className = 'bn-field' + (btn.hasAttribute('data-required') ? ' bn-req' : '');
        f.textContent = prefix + ' ' + n;
        wrap.appendChild(f);

        convertFields(item, sectionName);
        var input = f.querySelector('input');
        if (input) input.focus();
      });
    });

    /* ---------- documents: one labelled picker per person, per document ----------
       A single picker per document meant a second file replaced the first, so a
       form asking for a photograph and a signature from each proprietor could
       never carry both. Each document now gets one picker for every named person,
       and adding a person adds their pickers too. */
    var docSets = [];

    function peopleNames() {
      var out = [];
      Array.prototype.forEach.call(page.querySelectorAll('.bn-item'), function (item) {
        var h = item.querySelector('h2');
        if (!h) return;
        if (!/director|trustee|proprietor|secretary/i.test(h.innerText)) return;
        Array.prototype.forEach.call(item.querySelectorAll('.bn-prop h3'), function (h3) {
          var n = prettyLabel(h3.innerText.replace(/\s+/g, ' ').trim())
            .replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
          if (n && out.indexOf(n) === -1) out.push(n);
        });
      });
      return out;
    }

    function addPicker(set, person) {
      var wrap = document.createElement('div');
      wrap.className = 'bn-upload';

      var label = document.createElement('label');
      label.className = 'bn-upload-label';
      var id = 'bnFile' + Math.random().toString(36).slice(2, 9);
      label.setAttribute('for', id);
      label.textContent = 'Attach ' + set.title.toLowerCase() + (person ? ' for ' + person : '');
      var star = document.createElement('span');
      star.className = 'bn-star';
      star.setAttribute('aria-hidden', 'true');
      star.textContent = ' *';
      label.appendChild(star);

      var input = document.createElement('input');
      input.type = 'file';
      input.id = id;
      input.className = 'bn-file';
      input.name = 'attachment_' + (set.title + (person ? ' ' + person : '')).toLowerCase().replace(/[^a-z0-9]+/g, '_');
      input.setAttribute('data-doc', set.title + (person ? ' - ' + person : ''));
      input.setAttribute('data-person', person || '');
      input.setAttribute('data-wired', '1');
      input.accept = 'image/*,application/pdf';
      input.setAttribute('aria-required', 'true');

      var hint = document.createElement('p');
      hint.className = 'bn-upload-hint';
      hint.textContent = 'One file for this person: a photograph or a scan, JPG, PNG or PDF. All attachments together must stay under 10MB.';

      var status = document.createElement('p');
      status.className = 'bn-upload-status';
      status.setAttribute('aria-live', 'polite');

      input.addEventListener('change', function () {
        if (!input.files || !input.files.length) { status.textContent = ''; return; }
        var f = input.files[0];
        status.textContent = f.name + ' selected (' + Math.round(f.size / 1024) + ' KB)';
      });

      wrap.appendChild(label);
      wrap.appendChild(input);
      wrap.appendChild(hint);
      wrap.appendChild(status);
      set.wrap.appendChild(wrap);
    }

    function makeDocSet(item, title) {
      var set = { title: title, people: [], wrap: document.createElement('div') };
      set.wrap.className = 'bn-doc-set';

      var head = document.createElement('p');
      head.className = 'bn-doc-title';
      head.textContent = title;
      set.wrap.appendChild(head);

      item.appendChild(set.wrap);
      docSets.push(set);

      var names = peopleNames();
      if (!names.length) {
        addPicker(set, '');
      } else {
        names.forEach(function (n) { set.people.push(n); addPicker(set, n); });
      }
      return set;
    }

    /* when another applicant block is added, that person needs their own pickers */
    /* Only the roles the checklist asks documents for. Shareholders and other
       members are not asked for an identity card or signature, so adding one
       must not quietly create pickers for them. */
    function addPickersFor(person, role) {
      if (!person) return;
      if (role && !/director|trustee|proprietor|secretary/i.test(role)) return;
      var clean = prettyLabel(String(person).replace(/\s+/g, ' ').trim())
        .replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
      docSets.forEach(function (set) {
        if (set.people.indexOf(clean) > -1) return;
        set.people.push(clean);
        addPicker(set, clean);
      });
    }

    Array.prototype.forEach.call(page.querySelectorAll('.bn-item'), function (item) {
      var heading = item.querySelector('h2');
      if (!heading) return;
      var title = heading.innerText.replace(/^\s*\d+\s*/, '').trim().toLowerCase();

      if (title.indexOf('passport') > -1) { makeDocSet(item, 'Passport photograph'); return; }
      if (title.indexOf('signature') > -1) { makeDocSet(item, 'Signature'); return; }

      if (title.indexOf('document') > -1) {
        var text = (item.innerText || '').toLowerCase();
        if (text.indexOf('national identity') > -1 || text.indexOf('identity card') > -1) {
          makeDocSet(item, 'National identity card');
        }
        if (text.indexOf('signature') > -1) makeDocSet(item, 'Specimen signature');
        if (text.indexOf('passport photograph') > -1) makeDocSet(item, 'Passport photograph');
        if (!item.querySelector('.bn-doc-set')) makeDocSet(item, 'Supporting document');
      }
    });

    /* pickers written into the page by hand, such as an optional certificate */
    Array.prototype.forEach.call(page.querySelectorAll('.bn-file'), function (fi) {
      if (fi.getAttribute('data-wired')) return;
      fi.setAttribute('data-wired', '1');
      var status = fi.parentNode.querySelector('.bn-upload-status');
      if (!status) return;
      fi.addEventListener('change', function () {
        if (!fi.files || !fi.files.length) { status.textContent = ''; return; }
        var picked = fi.files[0];
        status.textContent = picked.name + ' selected (' + Math.round(picked.size / 1024) + ' KB)';
      });
    });

    /* ---------- free text ---------- */
    var cta = page.querySelector('.bn-cta');
    if (cta) {
      var box = document.createElement('div');
      box.className = 'bn-note';
      box.innerHTML =
        '<label for="bnEmail">Your email address</label>' +
        '<input id="bnEmail" type="email" name="email" placeholder="So the firm can reply to you" required>' +
        '<label for="bnPhone" style="margin-top:14px">Your telephone number</label>' +
        '<input id="bnPhone" type="tel" name="phone" placeholder="0803 ..." required>' +
        '<label for="bnNotes" style="margin-top:14px">Anything else the firm should know</label>' +
        '<textarea id="bnNotes" rows="3" placeholder="Optional"></textarea>';
      /* the notes box belongs above the declaration, which sits directly before the buttons */
      var before = cta.parentNode.querySelector('.bn-declare') || cta;
      cta.parentNode.insertBefore(box, before);
    }

    /* ---------- what is still missing, shown before the client sends ---------- */
    function buildDocCheck() {
      var picks = page.querySelectorAll('.bn-file');
      if (!picks.length) return;

      var box = document.createElement('div');
      box.className = 'bn-doc-check';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      box.innerHTML = '<p class="bn-doc-check-title"></p><ul class="bn-doc-check-list"></ul>' +
        '<p class="bn-doc-check-note">Every document listed here is required before the form can be sent.</p>';

      var cta = page.querySelector('.bn-cta');
      if (!cta || !cta.parentNode) return;
      cta.parentNode.insertBefore(box, cta);

      function refresh() {
        var all = requiredPickers();
        if (!all.length) { box.style.display = 'none'; return; }
        box.style.display = '';
        var missing = [];
        all.forEach(function (fi) {
          if (!fi.files || !fi.files.length) missing.push(fi.getAttribute('data-doc'));
        });
        var title = box.querySelector('.bn-doc-check-title');
        var list = box.querySelector('.bn-doc-check-list');
        var note = box.querySelector('.bn-doc-check-note');

        list.innerHTML = '';
        if (!missing.length) {
          box.className = 'bn-doc-check complete';
          title.textContent = all.length ? ('All ' + all.length + ' documents attached') : 'No documents required yet';
          note.textContent = 'Everything the checklist asks for is attached.';
          return;
        }
        box.className = 'bn-doc-check' + (missing.length === all.length ? ' none' : '');
        title.textContent = missing.length === all.length
          ? 'No documents attached yet'
          : missing.length + ' of ' + all.length + ' documents still to attach';
        missing.forEach(function (d) {
          var li = document.createElement('li');
          li.textContent = d;
          list.appendChild(li);
        });
        note.textContent = 'These are required. The form cannot be sent until each one is attached.';
      }

      Array.prototype.forEach.call(picks, function (fi) {
        fi.addEventListener('change', refresh);
      });
      page.addEventListener('change', function (e) {
        if (e.target && e.target.classList && e.target.classList.contains('bn-file')) refresh();
      });
      refresh();
      box.refresh = refresh;
    }
    buildDocCheck();


    function requiredPickers() {
      var skip = optionalPeopleNames();
      var out = [];
      Array.prototype.forEach.call(page.querySelectorAll('.bn-file'), function (fi) {
        if (fi.getAttribute('data-optional') === 'true') return;
        if (skip.indexOf(fi.getAttribute('data-person')) === -1) out.push(fi);
      });
      return out;
    }

    /* ---------- assemble and send through FormSubmit ---------- */
    var send = cta ? cta.querySelector('a') : null;
    if (send) {
      send.textContent = 'Send these details to the firm';
      send.addEventListener('click', function (e) {
        e.preventDefault();

        var consent = document.getElementById('bnConsent');
        if (consent && !consent.checked) {
          alert('Please confirm the consent statement underneath the form before sending. It authorises the firm to use the information you have supplied.');
          consent.focus();
          return;
        }

        var title = (document.title || 'this filing').split('|')[0].replace(/\s+Checklist\s*$/i, '').trim();
        var lastSection = '';
        var filled = 0;
        var entries = [];

        Array.prototype.forEach.call(page.querySelectorAll('.bn-input'), function (node) {
          var value = node.value.trim();
          if (!value) return;
          filled++;
          var section = node.getAttribute('data-section') || 'Details';
          var label = node.getAttribute('data-label') || 'Field';
          var who = node.getAttribute('data-applicant');
          var shown = prettyLabel(label);
          if (who) {
            var owner = prettyLabel(who);
            shown = owner + ', ' + shown.charAt(0).toLowerCase() + shown.slice(1);
          }
          entries.push({ section: section, label: shown, value: value });
        });

        var notes = document.getElementById('bnNotes');
        var noteText = notes ? notes.value.trim() : '';

        var files = [];
        Array.prototype.forEach.call(page.querySelectorAll('.bn-file'), function (fi) {
          if (fi.files && fi.files.length) files.push(fi);
        });

        var emailEl = document.getElementById('bnEmail');
        var phoneEl = document.getElementById('bnPhone');
        var emailVal = emailEl ? emailEl.value.trim() : '';
        var phoneVal = phoneEl ? phoneEl.value.trim() : '';

        /* nothing entered at all */
        if (!filled && !noteText && !files.length) {
          alert('Please fill in the details you have before sending.');
          return;
        }

        /* contact details are needed so the firm can reply */
        if (!emailVal) {
          alert('Please enter your email address so the firm can reply to you.');
          if (emailEl) emailEl.focus();
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailVal)) {
          alert('That email address does not look complete. Please check it and try again.');
          if (emailEl) emailEl.focus();
          return;
        }
        if (!phoneVal) {
          alert('Please enter your telephone number so the firm can reach you.');
          if (phoneEl) phoneEl.focus();
          return;
        }

        /* the asterisks mean something: no send while a required field is empty */
        var missingFields = [];
        var firstMissing = null;
        Array.prototype.forEach.call(page.querySelectorAll('.bn-input[aria-required="true"]'), function (n) {
          if (n.value.trim()) return;
          missingFields.push(n.getAttribute('data-label') || 'A required field');
          if (!firstMissing) firstMissing = n;
        });
        if (missingFields.length) {
          var shownList = missingFields.slice(0, 12).map(function (m) { return '  - ' + m; }).join('\n');
          if (missingFields.length > 12) shownList += '\n  ...and ' + (missingFields.length - 12) + ' more';
          alert('Please complete the fields marked with an asterisk before sending:\n\n' + shownList);
          if (firstMissing) {
            firstMissing.scrollIntoView({ block: 'center' });
            firstMissing.focus();
          }
          return;
        }

        /* reasonable substance, not a one word submission */
        if (filled < 2 && !noteText && !files.length) {
          alert('Please fill in a little more of your details before sending. If you have already added documents, you can send those on their own.');
          return;
        }

        var odd = files.filter(function (fi) {
          var t = fi.files[0].type || '';
          return t && t.indexOf('image/') !== 0 && t !== 'application/pdf';
        });
        if (odd.length) {
          alert('Please attach photographs, scans or PDF files only. ' + odd[0].files[0].name + ' is not one of those.');
          return;
        }

        /* The documents are required, so the form does not go without them.
           The message names exactly what is still missing. */
        var noFile = [];
        var firstEmpty = null;
        var required = requiredPickers();
        Array.prototype.forEach.call(required, function (fi) {
          if (fi.files && fi.files.length) return;
          noFile.push(fi.getAttribute('data-doc'));
          if (!firstEmpty) firstEmpty = fi;
        });
        if (noFile.length) {
          alert('Please attach the documents still missing before sending:\n\n'
            + noFile.map(function (d) { return '  - ' + d; }).join('\n')
            + '\n\nEach one is needed for the firm to lodge the application.');
          if (firstEmpty) {
            firstEmpty.scrollIntoView({ block: 'center' });
            firstEmpty.focus();
          }
          return;
        }

        var totalBytes = files.reduce(function (n, fi) { return n + fi.files[0].size; }, 0);
        if (totalBytes > 10 * 1024 * 1024) {
          alert('Those attachments come to more than 10MB. Please attach smaller photographs or scans and send again.');
          return;
        }

        var f = document.createElement('form');
        f.method = 'POST';
        f.action = 'https://formsubmit.co/' + EMAIL;
        f.enctype = 'multipart/form-data';
        f.style.display = 'none';

        function add(name, value) {
          var i = document.createElement('input');
          i.type = 'hidden';
          i.name = name;
          i.value = value;
          f.appendChild(i);
        }

        add('_subject', title + ' - new submission from the website');
        add('_template', 'table');
        add('_captcha', 'false');
        add('_honey', '');
        add('_next', location.origin + '/thank-you/');
        add('Filing', title);
        add('Client email', emailVal);
        add('Client telephone', phoneVal);
        add('email', emailVal);

        entries.forEach(function (en) {
          add(en.section + ' | ' + en.label, en.value);
        });

        if (noteText) add('Additional notes', noteText);

        var consentText = 'I confirm the information I have supplied is true, correct and authentic to the best of my knowledge, and I authorise Acefields Attorneys, Solicitors and Notary Public to use it in executing my instructions.';
        add('Declaration', consentText);

        files.forEach(function (fi) { add(fi.getAttribute('data-doc') + ' attached', fi.files[0].name); });

        /* Tell the firm exactly which documents did not come with the form.
           The client is not blocked, but nobody has to guess later. */
        var missing = [];
        var requiredFiles = requiredPickers();
        Array.prototype.forEach.call(requiredFiles, function (fi) {
          if (!fi.files || !fi.files.length) missing.push(fi.getAttribute('data-doc'));
        });
        var optionalMissing = [];
        Array.prototype.forEach.call(page.querySelectorAll('.bn-file'), function (fi) {
          if (fi.getAttribute('data-optional') !== 'true') return;
          if (!fi.files || !fi.files.length) optionalMissing.push(fi.getAttribute('data-doc'));
        });
        if (optionalMissing.length) {
          add('Optional documents not sent', optionalMissing.join('; '));
        }
        if (missing.length) {
          add('Documents NOT attached', missing.length + ' of ' + requiredFiles.length + ' requested. Missing: ' + missing.join('; '));
        } else if (files.length) {
          add('Documents NOT attached', 'None. All ' + files.length + ' requested documents are attached.');
        } else {
          add('Documents NOT attached', 'No documents requested on this form.');
        }

        f.style.position = 'absolute';
        f.style.left = '-9999px';
        document.body.appendChild(f);

        /* the real file inputs must sit inside the form for the files to travel */
        files.forEach(function (fi) { f.appendChild(fi); });

        try { f.submit(); } catch (err) {
          alert('The form could not send. Please check your connection and try again.');
        }
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
