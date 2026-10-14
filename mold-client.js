// ============ MOLD + DT CODE (v4 - Correct Flow) ============
window.MOLDS_CACHE = [];
window.MOLDS_LOADED = false;

async function loadMolds() {
  try {
    var molds = await pb.collection('molds').getFullList({ filter: 'isActive = true', sort: 'code', requestKey: 'molds_' + Date.now() });
    window.MOLDS_CACHE = molds;
    window.MOLDS_LOADED = true;
    console.log('[MOLDS] Loaded', molds.length);
  } catch(e) { console.error('Molds error:', e); }
}

window.searchMolds = function(q) {
  if (!q || q.length < 1) return [];
  var query = q.trim().toLowerCase();
  return (window.MOLDS_CACHE || []).filter(function(m) {
    return (m.code || '').toLowerCase().includes(query) || (m.name || '').toLowerCase().includes(query);
  }).slice(0, 30);
};

window.calcMinutesDiff = function(fromISO, toISO) {
  if (!fromISO || !toISO) return 0;
  try { var d = (new Date(toISO) - new Date(fromISO)) / 60000; return d > 0 ? Math.round(d) : 0; } catch(e) { return 0; }
};

// ===== Mold Picker (used in register form by operator) =====
window.showMoldPicker = function(currentMoldId) {
  var c = document.getElementById('moldPickerBox');
  if (!c) return;
  var html = '<div class="field"><label>قالب (Mold) — اگر روی ماشین نصب است</label>';
  html += '<input class="inp" id="moldSearch" placeholder="جستجو در کد یا نام قالب..." oninput="window.renderMoldResults()">';
  html += '<div id="moldResults" style="max-height:200px;overflow-y:auto;margin-top:8px;border:1px solid #E2E8F0;border-radius:8px;display:none"></div>';
  html += '<div id="moldSelected" style="display:none;margin-top:8px;padding:10px;background:#DCFCE7;border-radius:6px;justify-content:space-between;align-items:center">';
  html += '<span style="font-size:12px"><b>✅ انتخاب:</b> <span id="moldSelectedText"></span></span>';
  html += '<button type="button" onclick="window.clearMold()" style="background:#DC2626;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-family:inherit;font-weight:800">❌ حذف</button>';
  html += '</div>';
  html += '<input type="hidden" id="moldSelectedId" value="' + (currentMoldId || '') + '">';
  html += '</div>';
  c.innerHTML = html;
  if (currentMoldId && window.MOLDS_CACHE.length) {
    var m = window.MOLDS_CACHE.find(function(x){return x.id === currentMoldId;});
    if (m) { document.getElementById('moldSelected').style.display='flex'; document.getElementById('moldSelectedText').textContent = m.code + ' - ' + m.name; }
  }
};

window.renderMoldResults = function() {
  var q = document.getElementById('moldSearch').value.trim();
  var res = document.getElementById('moldResults');
  if (!res) return;
  if (q.length < 1) { res.style.display='none'; return; }
  var found = window.searchMolds(q);
  if (!found.length) { res.innerHTML = '<div style="padding:10px;text-align:center;color:#94A3B8;font-size:12px">موردی یافت نشد</div>'; res.style.display='block'; return; }
  var html = '';
  found.forEach(function(m) {
    html += '<div onclick="window.selectMold(\'' + m.id + '\',\'' + (m.code||'').replace(/\x27/g,"") + '\',\'' + (m.name||'').replace(/\x27/g,"") + '\')" style="padding:8px;border-bottom:1px solid #F1F5F9;cursor:pointer;font-size:12px">';
    html += '<span style="background:#1E5A9E;color:#fff;padding:2px 8px;border-radius:5px;font-family:monospace;font-weight:800">' + m.code + '</span> <span>' + m.name + '</span></div>';
  });
  res.innerHTML = html; res.style.display='block';
};

window.selectMold = function(id, code, name) {
  document.getElementById('moldSelectedId').value = id;
  var s = document.getElementById('moldSelected'); var t = document.getElementById('moldSelectedText');
  if (s && t) { s.style.display='flex'; t.textContent = code + ' - ' + name; }
  var r = document.getElementById('moldResults'); if (r) r.style.display='none';
  var i = document.getElementById('moldSearch'); if (i) i.value='';
};

window.clearMold = function() {
  document.getElementById('moldSelectedId').value = '';
  document.getElementById('moldSelected').style.display = 'none';
};

// ===== DT Code Picker (used in finish form by technician) =====
window.showDTPicker = function(containerId, currentCode, currentDuration, autoMinutes) {
  var c = document.getElementById(containerId);
  if (!c) return;
  var html = '<div class="card sec-red" style="margin-top:12px"><div class="card-head"><div class="ch-ico">📊</div><h3>کد توقف (DT Code)</h3></div><div class="card-body">';
  html += '<div class="field"><label>جستجوی مشکل</label><input class="inp" id="' + containerId + '_search" placeholder="تایپ کنید..." oninput="window.searchDTCodeIn(\'' + containerId + '\')"></div>';
  html += '<div id="' + containerId + '_results" style="max-height:200px;overflow-y:auto;margin-top:8px"></div>';
  html += '<div id="' + containerId + '_selected" style="display:none;margin-top:8px;padding:10px;background:#DCFCE7;border-radius:6px">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  html += '<span style="font-size:12px"><b>✅ انتخاب:</b> <span id="' + containerId + '_text"></span></span>';
  html += '<button type="button" onclick="window.clearDTIn(\'' + containerId + '\')" style="background:#DC2626;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-family:inherit;font-weight:800">❌ حذف</button>';
  html += '</div>';
  html += '<div style="border-top:1px solid #16A34A;padding-top:8px;margin-top:8px">';
  html += '<label style="font-size:11px;font-weight:800;display:block;margin-bottom:4px">⏱ مدت این توقف (دقیقه)</label>';
  if (autoMinutes > 0) {
    html += '<div style="background:#DBEAFE;color:#1E40AF;padding:6px 10px;border-radius:6px;font-size:11px;margin-bottom:6px">🔢 <b>محاسبه خودکار:</b> ' + autoMinutes + ' دقیقه</div>';
  }
  html += '<input type="number" min="0" class="inp" id="' + containerId + '_duration" placeholder="خالی = خودکار" value="' + (currentDuration || '') + '" data-auto="' + autoMinutes + '" style="width:100%">';
  html += '</div></div>';
  html += '<input type="hidden" id="' + containerId + '_code" value="' + (currentCode || '') + '">';
  html += '</div></div>';
  c.innerHTML = html;
  if (currentCode) {
    var dt = (window.DT_CODES || []).find(function(x){return x.c === currentCode;});
    if (dt) { document.getElementById(containerId + '_selected').style.display='block'; document.getElementById(containerId + '_text').textContent = dt.c + ' - ' + (dt.p || dt.r); }
  }
};

window.searchDTCodeIn = function(containerId) {
  var q = document.getElementById(containerId + '_search').value.trim();
  var res = document.getElementById(containerId + '_results');
  if (!res) return;
  if (q.length < 2) { res.innerHTML = '<div style="text-align:center;padding:8px;color:#94A3B8;font-size:11px">حداقل ۲ حرف</div>'; return; }
  var found = (window.searchDTCodes || function(){return [];})(q).slice(0, 15);
  if (!found.length) { res.innerHTML = '<div style="text-align:center;padding:8px;color:#DC2626;font-size:11px">یافت نشد</div>'; return; }
  var html = '';
  found.forEach(function(dt) {
    html += '<div onclick="window.selectDTCodeIn(\'' + containerId + '\',\'' + dt.c + '\',\'' + (dt.p||'').replace(/\x27/g,"") + '\')" style="padding:8px;border-bottom:1px solid #F1F5F9;cursor:pointer;font-size:12px">';
    html += '<span style="background:#C8102E;color:#fff;padding:2px 8px;border-radius:5px;font-family:monospace;font-weight:800">' + dt.c + '</span> <span>' + (dt.p || dt.r) + '</span></div>';
  });
  res.innerHTML = html;
};

window.selectDTCodeIn = function(containerId, code, persian) {
  document.getElementById(containerId + '_code').value = code;
  var s = document.getElementById(containerId + '_selected'); var t = document.getElementById(containerId + '_text');
  if (s && t) { s.style.display='block'; t.textContent = code + ' - ' + persian; }
  var r = document.getElementById(containerId + '_results'); if (r) r.innerHTML='';
  var i = document.getElementById(containerId + '_search'); if (i) i.value='';
};

window.clearDTIn = function(containerId) {
  document.getElementById(containerId + '_code').value = '';
  document.getElementById(containerId + '_selected').style.display = 'none';
  var d = document.getElementById(containerId + '_duration'); if (d) d.value='';
};

window.getDTFromContainer = function(containerId) {
  var code = document.getElementById(containerId + '_code');
  var dur = document.getElementById(containerId + '_duration');
  var manual = dur && dur.value ? parseFloat(dur.value) : 0;
  var auto = dur && dur.dataset.auto ? parseFloat(dur.dataset.auto) : 0;
  return {
    code: code ? code.value : '',
    duration: manual > 0 ? manual : auto
  };
};

setTimeout(function() { if (typeof pb !== 'undefined' && pb.authStore.isValid) loadMolds(); }, 2000);
window.loadMolds = loadMolds;