(function () {
  'use strict';
  console.log('%c[BASPAR-AUTOFILL] loaded', 'color:#00f;font-weight:bold;font-size:14px');

  function makeOptions(values) {
    var html = '';
    for (var i = 0; i < values.length; i++) {
      var v = String(values[i]).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      html += '<option value="' + v + '"></option>';
    }
    return html;
  }

  function ensureDatalist(id, values) {
    var dl = document.getElementById(id);
    if (!dl) { dl = document.createElement('datalist'); dl.id = id; document.body.appendChild(dl); }
    if (dl.dataset.count === String(values.length)) return;
    dl.innerHTML = makeOptions(values);
    dl.dataset.count = String(values.length);
    console.log('[BASPAR-AUTOFILL] datalist ' + id + ' => ' + values.length);
  }

  function run() {
    if (!window.AV_TYPE_DATA) {
      setTimeout(run, 500);
      return;
    }
    var molds = window.AV_TYPE_DATA.molds.map(function (m) { return m.name + ' - ' + m.code; });
    var lines = window.AV_TYPE_DATA.lines.map(function (l) { return l.code + ' / ' + l.nameEn + ' / ' + l.nameFa; });
    ensureDatalist('baspar-molds-list', molds);
    ensureDatalist('baspar-lines-list', lines);

    // استراتژی: هر input متنی خالی که placeholder ندارد یا داره رو بگیر
    var inputs = document.querySelectorAll('input[type="text"], input:not([type])');
    var moldsAssigned = 0, linesAssigned = 0;
    inputs.forEach(function (el) {
      if (el.readOnly || el.disabled) return;
      var ph = (el.placeholder || '').toLowerCase();
      var txt = '';
      // متن اطراف input (label)
      var wrap = el.closest('div, section, form') || el.parentElement;
      if (wrap) txt = (wrap.innerText || '').substring(0, 150);

      // اگر قبلاً assign شده، skip
      var existing = el.getAttribute('list');

      // AV: اگر placeholder شامل keratin/bottle/sss یا label شامل 'AV'
      if (!existing && (ph.indexOf('keratin') !== -1 || ph.indexOf('bottle') !== -1 || ph.indexOf('sss') !== -1 || /AV/.test(txt))) {
        el.setAttribute('list', 'baspar-molds-list');
        el.setAttribute('autocomplete', 'off');
        moldsAssigned++;
        console.log('[BASPAR-AUTOFILL] molds -> ' + (el.id || el.name || 'input') + ' | ph="' + ph + '"');
      }
      // Type: placeholder شامل ebm / im / injection
      else if (!existing && (ph.indexOf('ebm') !== -1 || ph.indexOf('/ im') !== -1 || ph.indexOf('injection') !== -1 || /Type/.test(txt))) {
        el.setAttribute('list', 'baspar-lines-list');
        el.setAttribute('autocomplete', 'off');
        linesAssigned++;
        console.log('[BASPAR-AUTOFILL] lines -> ' + (el.id || el.name || 'input') + ' | ph="' + ph + '"');
      }
    });
    console.log('%c[BASPAR-AUTOFILL] molds=' + moldsAssigned + ' lines=' + linesAssigned, 'color:#0a0;font-weight:bold');
  }

  var tries = 0;
  function loop() {
    tries++;
    if (tries > 30) return;
    run();
    setTimeout(loop, 1000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(loop, 300); });
  } else {
    setTimeout(loop, 300);
  }
})();