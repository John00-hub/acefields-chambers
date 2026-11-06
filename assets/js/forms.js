/* Acefields registration intake.
   Turns the printed checklist pages into fillable forms.
   Nothing leaves the phone until the client taps the WhatsApp button.
   Applicants can be added for as many people as the filing needs, and
   passports and signatures can be attached as images. */
(function () {
  var WHATSAPP = '2348179911555';
  var MAX_IMAGE_EDGE = 900;


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
    var adders = page.querySelectorAll('.bn-prop');
    Array.prototype.forEach.call(adders, function (block) {
      var item = block.closest('.bn-item');
      if (!item) return;
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
        var first = clone.querySelector('.bn-input');
        if (first) first.focus();
      });

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

    /* ---------- passport and signature attachments ---------- */
    Array.prototype.forEach.call(page.querySelectorAll('.bn-item'), function (item) {
      var heading = item.querySelector('h2');
      var title = heading ? heading.innerText.replace(/^\s*\d+\s*/, '').trim().toLowerCase() : '';
      var kind = title.indexOf('passport') > -1 ? 'passport photograph'
        : title.indexOf('signature') > -1 ? 'signature'
        : title.indexOf('document') > -1 ? 'document' : '';
      if (!kind) return;

      var up = document.createElement('div');
      up.className = 'bn-upload';
      up.innerHTML = '<label>Attach a ' + kind + '</label>' +
        '<input type="file" accept="image/*" class="bn-file">' +
        '<div class="bn-files"></div>';
      item.appendChild(up);

      var fileInput = up.querySelector('.bn-file');
      var list = up.querySelector('.bn-files');
      var added = 0;

      fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        var label = (file.name || kind).slice(0, 40);
        var chip = document.createElement('span');
        chip.className = 'bn-chip';
        chip.setAttribute('data-kind', kind);
        chip.setAttribute('data-name', label);
        chip.setAttribute('data-value', 'attached');
        chip.innerText = label + ' (attached)';
        list.appendChild(chip);
        added++;
        fileInput.value = '';
        fileInput.setAttribute('data-uploaded', '1');
      });
    });

    /* ---------- free text ---------- */
    var cta = page.querySelector('.bn-cta');
    if (cta) {
      var box = document.createElement('div');
      box.className = 'bn-note';
      box.innerHTML = '<label for="bnNotes">Anything else the firm should know</label>' +
        '<textarea id="bnNotes" rows="3" placeholder="Optional"></textarea>';
      cta.parentNode.insertBefore(box, cta);
    }

    /* ---------- assemble and send ---------- */
    var send = cta ? cta.querySelector('a') : null;
    if (send) {
      send.addEventListener('click', function (e) {
        e.preventDefault();
        var lines = [];
        var title = (document.title || 'this filing').split('|')[0].replace(/\s+Checklist\s*$/i, '').trim();
        lines.push('Good day *Acefields Attorneys, Solicitors and Notary Public*,');
        lines.push('I would like to proceed with ' + title + '. The details are below.');
        lines.push('');

        var lastSection = '';
        var filled = 0;

        Array.prototype.forEach.call(page.querySelectorAll('.bn-input, .bn-chip'), function (node) {
          var value = node.classList.contains('bn-input') ? node.value.trim() : 'Yes, to follow by WhatsApp';
          if (!value) return;
          filled++;
          var section = node.getAttribute('data-section') || (node.closest('.bn-item') || {}).innerText;
          if (!node.classList.contains('bn-input')) {
            var item = node.closest('.bn-item');
            var heading = item ? item.querySelector('h2') : null;
            section = heading ? heading.innerText.replace(/^\s*\d+\s*/, '').trim() : 'Documents';
          }
          var label = node.getAttribute('data-label') || node.getAttribute('data-name') || 'Attachment';
          if (node.classList.contains('bn-chip')) label = node.getAttribute('data-name') + ' (' + node.getAttribute('data-kind') + ')';
          if (section !== lastSection) {
            lines.push('');
            lines.push('*' + section + '*');
            lastSection = section;
          }
          var who = node.getAttribute('data-applicant');
          var shown = prettyLabel(label);
          if (who && !node.classList.contains('bn-chip')) {
            var owner = prettyLabel(who);
            shown = owner + ', ' + shown.charAt(0).toLowerCase() + shown.slice(1);
          }
          lines.push('• ' + shown + ': ' + value);
        });

        var notes = document.getElementById('bnNotes');
        if (notes && notes.value.trim()) {
          lines.push('');
          lines.push('*Additional notes*');
          lines.push(notes.value.trim());
        }

        if (!filled && !(notes && notes.value.trim())) {
          alert('Please fill in the details you have, then tap send again.');
          return;
        }

        if (page.querySelector('.bn-upload')) {
          lines.push('');
          lines.push('I will send the passport photographs and signatures in this chat now.');
        }

        window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(lines.join(String.fromCharCode(10))), '_blank');
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
