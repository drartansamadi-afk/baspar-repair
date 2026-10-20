(function () {
  function buildList(id, values) {
    var dl = document.getElementById(id);
    if (!dl) { dl = document.createElement('datalist'); dl.id = id; document.body.appendChild(dl); }
    if (dl.dataset.n === String(values.length)) return;
    var s = '';
    for (var i = 0; i < values.length; i++) {
      var v = String(values[i]).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      s += '<option value="' + v + '"></option>';
    }
    dl.innerHTML = s;
    dl.dataset.n = String(values.length);
  }
  function attach(el, id) {
    if (!el) return;
    el.setAttribute('list', id);
    el.setAttribute('autocomplete', 'off');
  }
  function run() {
    if (!window.AV_TYPE_DATA) { console.warn('[BASPAR] AV_TYPE_DATA missing'); return false; }
    var molds = (window.AV_TYPE_DATA.molds || []).map(function (m) { return m.name + ' - ' + m.code; });
    var lines = (window.AV_TYPE_DATA.lines || []).map(function (l) { return l.code + ' / ' + l.nameEn + ' / ' + l.nameFa; });
    buildList('baspar-molds-list', molds);
    buildList('baspar-lines-list', lines);

    var all = document.querySelectorAll('input, textarea');
    var avN = 0, tpN = 0;
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var ph = (el.getAttribute('placeholder') || '').toLowerCase();
      // AV: keratin / bottle / sss
      if (ph.indexOf('keratin') !== -1 || ph.indexOf('bottle') !== -1 || ph.indexOf('sss') !== -1) {
        attach(el, 'baspar-molds-list'); avN++;
      }
      // Type: ebm / im / injection
      else if (ph.indexOf('ebm') !== -1 || ph.indexOf('/ im') !== -1 || ph.indexOf('injection') !== -1) {
        attach(el, 'baspar-lines-list'); tpN++;
      }
      // fallback: check parent label
      else {
        var wrap = el.closest('div,section,form') || el.parentElement;
        if (wrap) {
          var txt = (wrap.innerText || '').substring(0, 200);
          if (/(^|\s)AV(\s|\()/.test(txt) || txt.indexOf('\u0645\u062d\u0635\u0648\u0644') !== -1) {
            if (el.type !== 'date' && el.type !== 'number' && !el.readOnly) { attach(el, 'baspar-molds-list'); avN++; }
          } else if (txt.indexOf('Type') !== -1 && el.type !== 'date' && el.type !== 'number' && !el.readOnly) {
            attach(el, 'baspar-lines-list'); tpN++;
          }
        }
      }
    }
    console.log('%c[BASPAR] AV=' + avN + ' | Type=' + tpN + ' | molds=' + molds.length + ' | lines=' + lines.length, 'color:#0a0;font-weight:bold');
    return avN > 0 || tpN > 0;
  }
  function schedule() {
    [200, 500, 1000, 2000, 4000].forEach(function (t) { setTimeout(run, t); });
    document.addEventListener('DOMContentLoaded', function () {
      try { new MutationObserver(run).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();
  console.log('%c[BASPAR v3] Populate script loaded', 'color:#00f;font-weight:bold');
})();