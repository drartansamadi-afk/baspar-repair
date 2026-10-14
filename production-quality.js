
// ==================== BASPAR_AV_TYPE_V5 ====================
(function () {
  var VERSION = 'v5';
  console.log('%c[BASPAR-AV] ' + VERSION + ' loaded', 'color:#00f;font-weight:bold;font-size:14px');

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function ensureDatalist(id, values) {
    var dl = document.getElementById(id);
    if (!dl) { dl = document.createElement('datalist'); dl.id = id; document.body.appendChild(dl); }
    if (dl.dataset.count === String(values.length)) return;
    var html = '';
    for (var i = 0; i < values.length; i++) { html += '<option value="' + esc(values[i]) + '"></option>'; }
    dl.innerHTML = html;
    dl.dataset.count = String(values.length);
    console.log('[BASPAR-AV] datalist#' + id + ' => ' + values.length + ' options');
  }

  function attachFields() {
    if (!window.AV_TYPE_DATA) {
      console.warn('[BASPAR-AV] AV_TYPE_DATA not loaded yet');
      return false;
    }
    var molds = window.AV_TYPE_DATA.molds.map(function (m) { return m.name + ' - ' + m.code; });
    var lines = window.AV_TYPE_DATA.lines.map(function (l) { return l.code + ' / ' + l.nameEn + ' / ' + l.nameFa; });
    ensureDatalist('baspar-molds-list', molds);
    ensureDatalist('baspar-lines-list', lines);

    var inputs = document.querySelectorAll('input[type="text"], input:not([type])');
    var avN = 0, tpN = 0;
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      if (el.readOnly || el.disabled) continue;
      var ph = (el.getAttribute('placeholder') || '').toLowerCase();

      // AV: Keratin / Bottle / SSS
      if (ph.indexOf('keratin') !== -1 || ph.indexOf('bottle') !== -1 || ph.indexOf('sss') !== -1) {
        el.setAttribute('list', 'baspar-molds-list');
        el.setAttribute('autocomplete', 'off');
        avN++;
        console.log('[BASPAR-AV] AV input attached (ph="' + ph.substring(0,40) + '...")');
      }
      // Type: EBM / IM / injection
      else if (ph.indexOf('ebm') !== -1 || ph.indexOf('/ im') !== -1 || ph.indexOf('injection') !== -1) {
        el.setAttribute('list', 'baspar-lines-list');
        el.setAttribute('autocomplete', 'off');
        tpN++;
        console.log('[BASPAR-AV] Type input attached (ph="' + ph.substring(0,40) + '...")');
      }
    }
    console.log('%c[BASPAR-AV] RESULT: AV=' + avN + ' | Type=' + tpN, 'color:#0a0;font-weight:bold');
    return avN > 0 && tpN > 0;
  }

  var tries = 0;
  function loop() {
    tries++;
    if (tries > 120) { console.warn('[BASPAR-AV] max tries reached'); return; }
    attachFields();
    setTimeout(loop, 500);
  }

  function start() {
    setTimeout(loop, 200);
    try {
      new MutationObserver(function () { attachFields(); }).observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
// ==================== END BASPAR_AV_TYPE_V5 ====================
