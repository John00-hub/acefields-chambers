/* Acefields registration intake.
   Turns the printed checklist pages into fillable forms.
   Nothing leaves the phone until the client taps the WhatsApp button.
   The brief is assembled in the same line by line format the firm already receives. */
(function () {
  var WHATSAPP = '2348179911555';

  function boot() {
    var page = document.querySelector('main');
    if (!page) return;

    var CLIENT = [];
    var applicants = [];

    var items = page.querySelectorAll('.bn-item');
    Array.prototype.forEach.call(items, function (item) {
      var heading = item.querySelector('h2');
      var label = heading ? heading.innerText.replace(/\s+/g, ' ').trim() : 'Section';
      var fields = item.querySelectorAll('.bn-field');

      // an applicant block repeats per person, keep each one separate
      if (fields.length > 1 && /particulars|director|secretary|trustee|proprietor|member/i.test(label)) {
        applicants.push(label);
      }

      Array.prototype.forEach.call(fields, function (f) {
        var text = f.innerText.replace(/\s+/g, ' ').trim();
        if (!text) return;
        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'bn-input';
        input.setAttribute('data-section', label);
        input.setAttribute('data-label', text);
        input.setAttribute('aria-label', text);
        input.setAttribute('placeholder', 'Tap to fill');
        f.innerHTML = '';
        f.appendChild(document.createTextNode(text));
        f.appendChild(input);
      });
    });

    // the one free text area the client needs
    var cta = page.querySelector('.bn-cta');
    if (cta) {
      var box = document.createElement('div');
      box.className = 'bn-note';
      box.innerHTML = '<label for="bnNotes">Anything else the firm should know</label>' +
        '<textarea id="bnNotes" rows="3" placeholder="Optional"></textarea>';
      cta.parentNode.insertBefore(box, cta);
    }

    // the button must carry what was typed
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
        var inputs = page.querySelectorAll('.bn-input');
        Array.prototype.forEach.call(inputs, function (input) {
          var value = input.value.trim();
          if (!value) return;
          filled++;
          var section = input.getAttribute('data-section');
          if (section !== lastSection) {
            lines.push('');
            lines.push('*' + section + '*');
            lastSection = section;
          }
          lines.push('• ' + input.getAttribute('data-label') + ': ' + value);
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
