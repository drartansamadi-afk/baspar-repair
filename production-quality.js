// ============================================
// BASPAR PLASTICS - Production & Quality v2
// ============================================

window.PQ_MODE = 'list';
window.PQ_CACHE = [];

function pqFmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fa-IR'); } catch(e) { return '—'; }
}

// ===== MACHINE PICKER (Search) =====
window.PQ_SELECTED_MACHINE = null;

window.showMachinePicker = function(currentId) {
  var container = document.getElementById('machinePickerBox');
  if (!container) return;
  var currentName = '';
  if (currentId && window.CURRENT_MACHINES) {
    var m = window.CURRENT_MACHINES.find(function(x) { return x.id === currentId; });
    if (m) currentName = m.code + ' - ' + m.name;
  }
  var html = '<div class="field" style="position:relative"><label>ماشین <span class="req">*</span></label>';
  html += '<input class="inp" id="machineSearch" placeholder="جستجو در کد یا نام ماشین..." autocomplete="off" value="' + (currentName || '') + '" oninput="window.renderMachineResults()" onfocus="window.renderMachineResults()">';
  html += '<div id="machineResults" style="position:absolute;top:100%;left:0;right:0;max-height:220px;overflow-y:auto;margin-top:4px;border:1px solid #E2E8F0;border-radius:8px;display:none;background:#fff;z-index:100;box-shadow:0 8px 24px rgba(15,23,42,.15)"></div>';
  html += '<input type="hidden" id="pqSelectedMachineId" value="' + (currentId || '') + '">';
  html += '</div>';
  container.innerHTML = html;
  window.PQ_SELECTED_MACHINE = currentId || null;
};

window.renderMachineResults = function() {
  var el = document.getElementById('machineSearch');
  if (!el) return;
  var q = (el.value || '').trim().toLowerCase();
  var res = document.getElementById('machineResults');
  if (!res) return;
  var machines = window.CURRENT_MACHINES || [];
  var found = machines.filter(function(m) {
    if (!q) return true;
    return (m.code || '').toLowerCase().includes(q) || (m.name || '').toLowerCase().includes(q);
  }).slice(0, 30);
  if (!found.length) {
    res.innerHTML = '<div style="padding:10px;text-align:center;color:#94A3B8;font-size:12px">موردی یافت نشد</div>';
    res.style.display = 'block';
    return;
  }
  var html = '';
  found.forEach(function(m) {
    html += '<div onclick="window.selectMachinePick(\'' + m.id + '\',\'' + (m.code || '').replace(/\x27/g, '') + '\',\'' + (m.name || '').replace(/\x27/g, '') + '\')" style="padding:10px;border-bottom:1px solid #F1F5F9;cursor:pointer;font-size:12px;display:flex;gap:8px;align-items:center">';
    html += '<span style="background:#1E5A9E;color:#fff;padding:2px 8px;border-radius:5px;font-family:monospace;font-weight:800">' + m.code + '</span>';
    html += '<span>' + m.name + '</span></div>';
  });
  res.innerHTML = html;
  res.style.display = 'block';
};

window.selectMachinePick = function(id, code, name) {
  window.PQ_SELECTED_MACHINE = id;
  document.getElementById('pqSelectedMachineId').value = id;
  document.getElementById('machineSearch').value = code + ' - ' + name;
  document.getElementById('machineResults').style.display = 'none';
};

window.clearMachinePick = function() {
  window.PQ_SELECTED_MACHINE = null;
  var el = document.getElementById('pqSelectedMachineId');
  if (el) el.value = '';
  var s = document.getElementById('machineSearch');
  if (s) s.value = '';
};

// ===== PRODUCTION VIEW =====
async function viewProduction() {
  const host = document.getElementById('viewInner');
  if (!host) return;
  if (window.PQ_MODE === 'new') { renderProductionForm(host); return; }

  host.innerHTML = '<div style="text-align:center;padding:40px;color:#94A3B8">در حال بارگذاری...</div>';
  try {
    if (!window.CURRENT_MACHINES || window.CURRENT_MACHINES.length === 0) {
      try {
        var machines = await pb.collection('machines').getFullList({ sort: 'code', requestKey: 'm_' + Date.now() });
        window.CURRENT_MACHINES = machines;
      } catch(e) {}
    }
    const data = await pb.collection('production_data').getList(1, 100, { sort: '-date,-created', expand: 'machine', requestKey: 'prod_' + Date.now() });
    window.PQ_CACHE = data.items;
    const totalRecords = data.totalItems;
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayRecords = data.items.filter(r => r.date && r.date.slice(0, 10) === todayStr).length;
    const totalProd = data.items.reduce((sum, r) => sum + (r.totalProduction || 0), 0);

    let html = `
      <div style="background:linear-gradient(135deg,#1E5A9E,#1E40AF);color:#fff;padding:16px;border-radius:14px;margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:18px;font-weight:900">🏭 تولید</div>
            <div style="font-size:11px;opacity:.85;margin-top:2px">ثبت و مشاهده اطلاعات تولید</div>
          </div>
          <button onclick="window.PQ_MODE='new';viewProduction()" style="background:#fff;color:#1E5A9E;border:none;border-radius:10px;padding:10px 16px;font-weight:900;font-family:inherit;cursor:pointer">➕ ثبت جدید</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px">
          <div style="background:rgba(255,255,255,.15);padding:10px;border-radius:10px;text-align:center"><div style="font-size:18px;font-weight:900">${totalRecords}</div><div style="font-size:10px;opacity:.85">کل رکوردها</div></div>
          <div style="background:rgba(255,255,255,.15);padding:10px;border-radius:10px;text-align:center"><div style="font-size:18px;font-weight:900">${todayRecords}</div><div style="font-size:10px;opacity:.85">امروز</div></div>
          <div style="background:rgba(255,255,255,.15);padding:10px;border-radius:10px;text-align:center"><div style="font-size:18px;font-weight:900">${totalProd.toLocaleString()}</div><div style="font-size:10px;opacity:.85">تولید کل</div></div>
        </div>
      </div>
    `;
    if (data.items.length === 0) {
      html += '<div class="empty-state"><div class="es-ico">🏭</div><h4>رکوردی نیست</h4><p>هنوز داده تولیدی ثبت نشده</p></div>';
    } else {
      html += '<div class="chart-card2">';
      data.items.forEach(r => {
        const machineName = r.expand && r.expand.machine ? (r.expand.machine.code + ' - ' + r.expand.machine.name) : '—';
        html += `<div style="padding:12px;border-bottom:1px solid #F1F5F9;cursor:pointer" onclick="window.openProductionDetail('${r.id}')">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="background:#1E5A9E;color:#fff;padding:3px 10px;border-radius:6px;font-family:monospace;font-weight:800;font-size:11px">${machineName}</span>
            <span style="font-size:11px;color:#64748B">${pqFmtDate(r.date)}</span>
          </div>
          <div style="font-size:13px;font-weight:800;margin-bottom:4px">${r.av || '—'}</div>
          <div style="display:flex;gap:8px;font-size:11px;color:#64748B">
            <span>نوع: ${r.type || '—'}</span><span>•</span>
            <span>تولید: <b style="color:#7C3AED">${(r.totalProduction || 0).toLocaleString()}</b></span>
          </div>
        </div>`;
      });
      html += '</div>';
    }
    host.innerHTML = html;
  } catch (err) {
    host.innerHTML = '<div class="empty-state"><div class="es-ico">❌</div><h4>خطا</h4><p>' + err.message + '</p></div>';
  }
}

// ===== PRODUCTION FORM =====
function renderProductionForm(host) {
  host.innerHTML = `
    <div style="background:linear-gradient(135deg,#1E5A9E,#1E40AF);color:#fff;padding:16px;border-radius:14px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:18px;font-weight:900">🏭 ثبت اطلاعات تولید</div>
          <div style="font-size:11px;opacity:.85;margin-top:2px">اطلاعات روزانه تولید را وارد کنید</div>
        </div>
        <button onclick="window.PQ_MODE='list';viewProduction()" style="background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:10px;padding:8px 14px;font-weight:800;font-family:inherit;cursor:pointer">بازگشت</button>
      </div>
    </div>
    <div class="chart-card2" style="padding:14px">
      <div id="machinePickerBox"></div>
      <div class="field"><label>تاریخ <span class="req">*</span></label><input class="inp" id="pqDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      <div class="field"><label>AV (محصول) <span class="req">*</span></label><input class="inp" id="pqAv" placeholder="مثلاً 954 - Bottle SSS Keratin Therapy 600ml Black"></div>
      <div class="field"><label>Type</label><input class="inp" id="pqType" placeholder="EBM / IM / ..."></div>
      <div style="border-top:1px solid #E2E8F0;margin:12px 0;padding-top:12px">
        <div style="font-size:13px;font-weight:800;margin-bottom:10px;color:#1E5A9E">📊 تولید شیفت‌ها</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          <div class="field"><label>شیفت A</label><input class="inp" id="pqShiftA" type="number" value="0" oninput="window.pqCalcTotal()"></div>
          <div class="field"><label>شیفت B</label><input class="inp" id="pqShiftB" type="number" value="0" oninput="window.pqCalcTotal()"></div>
          <div class="field"><label>شیفت C</label><input class="inp" id="pqShiftC" type="number" value="0" oninput="window.pqCalcTotal()"></div>
        </div>
        <div class="field"><label>تولید کل</label><input class="inp" id="pqTotalProduction" type="number" value="0" style="background:#F3E8FF;font-weight:900"></div>
      </div>
      <div style="border-top:1px solid #E2E8F0;margin:12px 0;padding-top:12px">
        <div style="font-size:13px;font-weight:800;margin-bottom:10px;color:#1E5A9E">⚙️ پارامترها</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
          <div class="field"><label>CT (Target)</label><input class="inp" id="pqCtTarget" type="number" step="0.1"></div>
          <div class="field"><label>Cav (Target)</label><input class="inp" id="pqCavTarget" type="number"></div>
          <div class="field"><label>CT (Actual)</label><input class="inp" id="pqCtActual" type="number" step="0.1"></div>
          <div class="field"><label>Cav (Actual)</label><input class="inp" id="pqCavActual" type="number"></div>
        </div>
      </div>
      <button class="btn btn-blue" onclick="window.pqSaveProduction()" style="width:100%;margin-top:12px;background:linear-gradient(135deg,#1E5A9E,#1E40AF);color:#fff;padding:14px;border-radius:12px;font-weight:900;font-family:inherit;cursor:pointer;border:none">💾 ذخیره</button>
    </div>
  `;
  // بارگذاری ماشین‌ها
  (async function() {
    if (!window.CURRENT_MACHINES || window.CURRENT_MACHINES.length === 0) {
      try {
        var machines = await pb.collection('machines').getFullList({ sort: 'code', requestKey: 'm_' + Date.now() });
        window.CURRENT_MACHINES = machines;
      } catch(e) {}
    }
    window.showMachinePicker('');
  })();
}

window.pqCalcTotal = function() {
  const a = parseInt(document.getElementById('pqShiftA').value) || 0;
  const b = parseInt(document.getElementById('pqShiftB').value) || 0;
  const c = parseInt(document.getElementById('pqShiftC').value) || 0;
  document.getElementById('pqTotalProduction').value = a + b + c;
};

window.pqSaveProduction = async function() {
  try {
    const machine = document.getElementById('pqSelectedMachineId').value;
    const date = document.getElementById('pqDate').value;
    const av = document.getElementById('pqAv').value.trim();
    if (!machine || !date || !av) { toast('❌ ماشین، تاریخ و AV الزامی است', 'err'); return; }
    await pb.collection('production_data').create({
      machine: machine,
      date: new Date(date + 'T00:00:00').toISOString(),
      av: av,
      type: document.getElementById('pqType').value.trim(),
      shiftA: parseInt(document.getElementById('pqShiftA').value) || 0,
      shiftB: parseInt(document.getElementById('pqShiftB').value) || 0,
      shiftC: parseInt(document.getElementById('pqShiftC').value) || 0,
      totalProduction: parseInt(document.getElementById('pqTotalProduction').value) || 0,
      ctTarget: parseFloat(document.getElementById('pqCtTarget').value) || 0,
      cavTarget: parseInt(document.getElementById('pqCavTarget').value) || 0,
      ctActual: parseFloat(document.getElementById('pqCtActual').value) || 0,
      cavActual: parseInt(document.getElementById('pqCavActual').value) || 0
    });
    toast('✅ ثبت شد', 'ok');
    window.PQ_MODE = 'list';
    viewProduction();
  } catch(err) { toast('❌ ' + err.message, 'err'); }
};

// ===== PRODUCTION DETAIL + EDIT =====
window.openProductionDetail = function(id) {
  var r = window.PQ_CACHE.find(function(x) { return x.id === id; });
  if (!r) return;
  var machineName = r.expand && r.expand.machine ? (r.expand.machine.code + ' - ' + r.expand.machine.name) : '—';
  document.getElementById('sheetTitle').textContent = '🏭 تولید - ' + pqFmtDate(r.date);
  document.getElementById('sheetBody').innerHTML = `
    <div class="card sec-blue"><div class="card-head"><div class="ch-ico">🏭</div><h3>اطلاعات تولید</h3></div><div class="card-body">
      <div class="info-row"><div class="label">ماشین</div><div class="value"><b>${machineName}</b></div></div>
      <div class="info-row"><div class="label">تاریخ</div><div class="value">${pqFmtDate(r.date)}</div></div>
      <div class="info-row"><div class="label">AV</div><div class="value">${r.av || '—'}</div></div>
      <div class="info-row"><div class="label">Type</div><div class="value">${r.type || '—'}</div></div>
    </div></div>
    <div class="card sec-purple"><div class="card-head"><div class="ch-ico">📊</div><h3>شیفت‌ها</h3></div><div class="card-body">
      <div class="info-row"><div class="label">Shift A</div><div class="value">${(r.shiftA || 0).toLocaleString()}</div></div>
      <div class="info-row"><div class="label">Shift B</div><div class="value">${(r.shiftB || 0).toLocaleString()}</div></div>
      <div class="info-row"><div class="label">Shift C</div><div class="value">${(r.shiftC || 0).toLocaleString()}</div></div>
      <div class="info-row"><div class="label">تولید کل</div><div class="value"><b style="color:#7C3AED;font-size:15px">${(r.totalProduction || 0).toLocaleString()}</b></div></div>
    </div></div>
    <div class="card sec-orange"><div class="card-head"><div class="ch-ico">⚙️</div><h3>پارامترها</h3></div><div class="card-body">
      <div class="info-row"><div class="label">CT (Target)</div><div class="value">${r.ctTarget || '—'}</div></div>
      <div class="info-row"><div class="label">Cav (Target)</div><div class="value">${r.cavTarget || '—'}</div></div>
      <div class="info-row"><div class="label">CT (Actual)</div><div class="value">${r.ctActual || '—'}</div></div>
      <div class="info-row"><div class="label">Cav (Actual)</div><div class="value">${r.cavActual || '—'}</div></div>
    </div></div>
  `;
  document.getElementById('sheetFoot').innerHTML = `
    <button class="btn btn-ghost" onclick="closeSheet()">بستن</button>
    <button class="btn btn-orange" onclick="closeSheet();setTimeout(function(){window.openEditProduction('${id}')},300)">✏️ ویرایش</button>
  `;
  document.getElementById('overlay').classList.add('show');
  document.getElementById('sheet').classList.add('show');
  if (window.resetSheetScroll) setTimeout(window.resetSheetScroll, 50);
};

window.openEditProduction = function(id) {
  var r = window.PQ_CACHE.find(function(x) { return x.id === id; });
  if (!r) { toast('❌ رکورد پیدا نشد', 'err'); return; }
  document.getElementById('sheetTitle').textContent = '✏️ ویرایش تولید';
  document.getElementById('sheetBody').innerHTML = `
    <div class="card sec-blue"><div class="card-head"><div class="ch-ico">🏭</div><h3>ویرایش اطلاعات</h3></div><div class="card-body">
      <div class="field"><label>تاریخ</label><input class="inp" id="edpDate" type="date" value="${r.date ? r.date.slice(0,10) : ''}"></div>
      <div class="field"><label>AV</label><input class="inp" id="edpAv" value="${r.av || ''}"></div>
      <div class="field"><label>Type</label><input class="inp" id="edpType" value="${r.type || ''}"></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        <div class="field"><label>شیفت A</label><input class="inp" id="edpShiftA" type="number" value="${r.shiftA || 0}"></div>
        <div class="field"><label>شیفت B</label><input class="inp" id="edpShiftB" type="number" value="${r.shiftB || 0}"></div>
        <div class="field"><label>شیفت C</label><input class="inp" id="edpShiftC" type="number" value="${r.shiftC || 0}"></div>
      </div>
      <div class="field"><label>تولید کل</label><input class="inp" id="edpTotal" type="number" value="${r.totalProduction || 0}" style="background:#F3E8FF;font-weight:900"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="field"><label>CT Target</label><input class="inp" id="edpCtT" type="number" step="0.1" value="${r.ctTarget || 0}"></div>
        <div class="field"><label>Cav Target</label><input class="inp" id="edpCavT" type="number" value="${r.cavTarget || 0}"></div>
        <div class="field"><label>CT Actual</label><input class="inp" id="edpCtA" type="number" step="0.1" value="${r.ctActual || 0}"></div>
        <div class="field"><label>Cav Actual</label><input class="inp" id="edpCavA" type="number" value="${r.cavActual || 0}"></div>
      </div>
      <div class="field"><label>دلیل ویرایش <span style="color:#DC2626">*</span></label><input class="inp" id="edpReason" placeholder="دلیل ویرایش"></div>
    </div></div>
  `;
  document.getElementById('sheetFoot').innerHTML = `
    <button class="btn btn-ghost" onclick="closeSheet()">انصراف</button>
    <button class="btn btn-red" onclick="window.pqDeleteProduction('${id}')">🗑 حذف</button>
    <button class="btn btn-blue" onclick="window.pqSaveEditProduction('${id}')">💾 ذخیره</button>
  `;
  document.getElementById('overlay').classList.add('show');
  document.getElementById('sheet').classList.add('show');
  if (window.resetSheetScroll) setTimeout(window.resetSheetScroll, 50);
};

window.pqSaveEditProduction = async function(id) {
  var reason = document.getElementById('edpReason').value.trim();
  if (!reason) { toast('❌ دلیل ویرایش الزامی است', 'err'); return; }
  try {
    await pb.collection('production_data').update(id, {
      date: new Date(document.getElementById('edpDate').value + 'T00:00:00').toISOString(),
      av: document.getElementById('edpAv').value.trim(),
      type: document.getElementById('edpType').value.trim(),
      shiftA: parseInt(document.getElementById('edpShiftA').value) || 0,
      shiftB: parseInt(document.getElementById('edpShiftB').value) || 0,
      shiftC: parseInt(document.getElementById('edpShiftC').value) || 0,
      totalProduction: parseInt(document.getElementById('edpTotal').value) || 0,
      ctTarget: parseFloat(document.getElementById('edpCtT').value) || 0,
      cavTarget: parseInt(document.getElementById('edpCavT').value) || 0,
      ctActual: parseFloat(document.getElementById('edpCtA').value) || 0,
      cavActual: parseInt(document.getElementById('edpCavA').value) || 0
    });
    try {
      await pb.collection('audit_log').create({
        action: 'update', requestTagNo: 'PROD-' + id.slice(0, 6),
        actorId: USER.id, actorName: USER.name, actorRole: USER.role,
        field: 'PRODUCTION_EDIT', oldValue: '', newValue: 'ویرایش شد', reason: reason
      });
    } catch(e) {}
    toast('✅ ویرایش شد', 'ok');
    closeSheet();
    viewProduction();
  } catch(err) { toast('❌ ' + err.message, 'err'); }
};

window.pqDeleteProduction = async function(id) {
  if (!confirm('آیا از حذف این رکورد مطمئن هستید؟')) return;
  var reason = prompt('دلیل حذف:');
  if (!reason) return;
  try {
    await pb.collection('production_data').delete(id);
    try {
      await pb.collection('audit_log').create({
        action: 'delete', requestTagNo: 'PROD-' + id.slice(0, 6),
        actorId: USER.id, actorName: USER.name, actorRole: USER.role,
        field: 'PRODUCTION_DELETE', oldValue: 'حذف شده', newValue: '', reason: reason
      });
    } catch(e) {}
    toast('✅ حذف شد', 'ok');
    closeSheet();
    viewProduction();
  } catch(err) { toast('❌ ' + err.message, 'err'); }
};

// ===== QUALITY VIEW =====
async function viewQuality() {
  const host = document.getElementById('viewInner');
  if (!host) return;
  if (window.PQ_MODE === 'new') { renderQualityForm(host); return; }

  host.innerHTML = '<div style="text-align:center;padding:40px;color:#94A3B8">در حال بارگذاری...</div>';
  try {
    const data = await pb.collection('quality_data').getList(1, 100, { sort: '-date,-created', requestKey: 'q_' + Date.now() });
    window.PQ_CACHE = data.items;
    const totalRecords = data.totalItems;
    const totalHold = data.items.reduce((sum, r) => sum + (r.holdTotal || 0), 0);
    const totalDestroyed = data.items.reduce((sum, r) => sum + (r.destroyedTotal || 0), 0);

    let html = `
      <div style="background:linear-gradient(135deg,#16A34A,#15803D);color:#fff;padding:16px;border-radius:14px;margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:18px;font-weight:900">✅ کنترل کیفیت</div>
            <div style="font-size:11px;opacity:.85;margin-top:2px">ثبت و مشاهده اطلاعات کیفیت</div>
          </div>
          <button onclick="window.PQ_MODE='new';viewQuality()" style="background:#fff;color:#16A34A;border:none;border-radius:10px;padding:10px 16px;font-weight:900;font-family:inherit;cursor:pointer">➕ ثبت جدید</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px">
          <div style="background:rgba(255,255,255,.15);padding:10px;border-radius:10px;text-align:center"><div style="font-size:18px;font-weight:900">${totalRecords}</div><div style="font-size:10px;opacity:.85">کل رکوردها</div></div>
          <div style="background:rgba(255,255,255,.15);padding:10px;border-radius:10px;text-align:center"><div style="font-size:18px;font-weight:900">${totalHold.toLocaleString()}</div><div style="font-size:10px;opacity:.85">مجموع Hold</div></div>
          <div style="background:rgba(255,255,255,.15);padding:10px;border-radius:10px;text-align:center"><div style="font-size:18px;font-weight:900">${totalDestroyed.toLocaleString()}</div><div style="font-size:10px;opacity:.85">مجموع Destroyed</div></div>
        </div>
      </div>
    `;
    if (data.items.length === 0) {
      html += '<div class="empty-state"><div class="es-ico">✅</div><h4>رکوردی نیست</h4><p>هنوز داده کیفیتی ثبت نشده</p></div>';
    } else {
      html += '<div class="chart-card2">';
      data.items.forEach(r => {
        html += `<div style="padding:12px;border-bottom:1px solid #F1F5F9;cursor:pointer" onclick="window.openQualityDetail('${r.id}')">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="background:#16A34A;color:#fff;padding:3px 10px;border-radius:6px;font-family:monospace;font-weight:800;font-size:11px">AV: ${r.avCode || '—'}</span>
            <span style="font-size:11px;color:#64748B">${pqFmtDate(r.date)}</span>
          </div>
          <div style="font-size:13px;font-weight:800;margin-bottom:4px">${r.articleVariant || '—'}</div>
          <div style="display:flex;gap:8px;font-size:11px;color:#64748B">
            <span>رنگ: ${r.color || '—'}</span><span>•</span>
            <span>Hold: <b style="color:#DC2626">${(r.holdTotal || 0).toLocaleString()}</b></span>
          </div>
        </div>`;
      });
      html += '</div>';
    }
    host.innerHTML = html;
  } catch (err) {
    host.innerHTML = '<div class="empty-state"><div class="es-ico">❌</div><h4>خطا</h4><p>' + err.message + '</p></div>';
  }
}

function renderQualityForm(host) {
  const now = new Date();
  const weekNum = Math.ceil((now - new Date(now.getFullYear(), 0, 1)) / 86400000 / 7);
  host.innerHTML = `
    <div style="background:linear-gradient(135deg,#16A34A,#15803D);color:#fff;padding:16px;border-radius:14px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:18px;font-weight:900">✅ ثبت اطلاعات کیفیت</div>
          <div style="font-size:11px;opacity:.85;margin-top:2px">اطلاعات روزانه کیفیت را وارد کنید</div>
        </div>
        <button onclick="window.PQ_MODE='list';viewQuality()" style="background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:10px;padding:8px 14px;font-weight:800;font-family:inherit;cursor:pointer">بازگشت</button>
      </div>
    </div>
    <div class="chart-card2" style="padding:14px">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div class="field"><label>تاریخ <span class="req">*</span></label><input class="inp" id="pq2Date" type="date" value="${now.toISOString().slice(0,10)}"></div>
        <div class="field"><label>ماه</label><input class="inp" id="pq2Month" type="number" min="1" max="12" value="${now.getMonth()+1}"></div>
        <div class="field"><label>هفته</label><input class="inp" id="pq2Week" type="number" min="1" max="53" value="${weekNum}"></div>
      </div>
      <div class="field"><label>AV Code <span class="req">*</span></label><input class="inp" id="pq2AvCode" placeholder="مثلاً 959"></div>
      <div class="field"><label>Article Variant</label><input class="inp" id="pq2ArticleVariant" placeholder="مثلاً 959 - BTL SSK CD Shine & Str Pink 350ml"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="field"><label>رنگ</label><input class="inp" id="pq2Color" placeholder="Pink / Blue / ..."></div>
        <div class="field"><label>شیفت</label><select class="inp" id="pq2Shift"><option value="A">A</option><option value="B">B</option><option value="C">C</option></select></div>
      </div>
      <div class="field"><label>Profit Center</label><input class="inp" id="pq2ProfitCenter" placeholder="EBM / IM / ..."></div>
      <div style="border-top:1px solid #E2E8F0;margin:12px 0;padding-top:12px">
        <div style="font-size:13px;font-weight:800;margin-bottom:10px;color:#16A34A">📊 داده‌های کیفیت</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div class="field"><label>Hold Total</label><input class="inp" id="pq2HoldTotal" type="number" value="0" oninput="window.pq2Calc()"></div>
          <div class="field"><label>Destroyed Total</label><input class="inp" id="pq2DestroyedTotal" type="number" value="0" oninput="window.pq2Calc()"></div>
        </div>
        <div class="field"><label>Defect Issue</label><input class="inp" id="pq2DefectIssue" placeholder="مثلاً Bicolor"></div>
        <div class="field"><label>Total Production (PCs)</label><input class="inp" id="pq2TotalProduction" type="number" value="0" oninput="window.pq2Calc()"></div>
        <div style="background:#F0FDF4;padding:10px;border-radius:8px;margin-top:10px">
          <div style="font-size:11px;font-weight:800;color:#15803D;margin-bottom:8px">🔢 محاسبه خودکار</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
            <div class="field"><label style="font-size:10px">Hold %</label><input class="inp" id="pq2HoldPercent" type="number" step="0.01" value="0" readonly style="background:#DCFCE7;font-weight:900"></div>
            <div class="field"><label style="font-size:10px">Destroyed (PPM)</label><input class="inp" id="pq2DestroyedPPM" type="number" value="0" readonly style="background:#DCFCE7;font-weight:900"></div>
            <div class="field"><label style="font-size:10px">Rejected Ratio</label><input class="inp" id="pq2RejectedRatio" type="number" step="0.01" value="0" readonly style="background:#DCFCE7;font-weight:900"></div>
          </div>
        </div>
      </div>
      <button class="btn btn-blue" onclick="window.pqSaveQuality()" style="width:100%;margin-top:12px;background:linear-gradient(135deg,#16A34A,#15803D);color:#fff;padding:14px;border-radius:12px;font-weight:900;font-family:inherit;cursor:pointer;border:none">💾 ذخیره</button>
    </div>
  `;
}

window.pq2Calc = function() {
  const hold = parseInt(document.getElementById('pq2HoldTotal').value) || 0;
  const destroyed = parseInt(document.getElementById('pq2DestroyedTotal').value) || 0;
  const total = parseInt(document.getElementById('pq2TotalProduction').value) || 0;
  if (total > 0) {
    document.getElementById('pq2HoldPercent').value = ((hold / total) * 100).toFixed(2);
    document.getElementById('pq2DestroyedPPM').value = Math.round((destroyed / total) * 1000000);
    document.getElementById('pq2RejectedRatio').value = ((hold / total) * 100).toFixed(2);
  } else {
    document.getElementById('pq2HoldPercent').value = 0;
    document.getElementById('pq2DestroyedPPM').value = 0;
    document.getElementById('pq2RejectedRatio').value = 0;
  }
};

window.pqSaveQuality = async function() {
  try {
    const date = document.getElementById('pq2Date').value;
    const avCode = document.getElementById('pq2AvCode').value.trim();
    if (!date || !avCode) { toast('❌ تاریخ و AV Code الزامی است', 'err'); return; }
    await pb.collection('quality_data').create({
      date: new Date(date + 'T00:00:00').toISOString(),
      month: parseInt(document.getElementById('pq2Month').value) || 0,
      weekNumber: parseInt(document.getElementById('pq2Week').value) || 0,
      avCode: avCode,
      articleVariant: document.getElementById('pq2ArticleVariant').value.trim(),
      color: document.getElementById('pq2Color').value.trim(),
      shiftNumber: document.getElementById('pq2Shift').value,
      profitCenter: document.getElementById('pq2ProfitCenter').value.trim(),
      holdTotal: parseInt(document.getElementById('pq2HoldTotal').value) || 0,
      destroyedTotal: parseInt(document.getElementById('pq2DestroyedTotal').value) || 0,
      defectIssue: document.getElementById('pq2DefectIssue').value.trim(),
      totalProductionPcs: parseInt(document.getElementById('pq2TotalProduction').value) || 0,
      holdPercent: parseFloat(document.getElementById('pq2HoldPercent').value) || 0,
      destroyedPPM: parseFloat(document.getElementById('pq2DestroyedPPM').value) || 0,
      rejectedRatio: parseFloat(document.getElementById('pq2RejectedRatio').value) || 0
    });
    toast('✅ ثبت شد', 'ok');
    window.PQ_MODE = 'list';
    viewQuality();
  } catch(err) { toast('❌ ' + err.message, 'err'); }
};

window.openQualityDetail = function(id) {
  var r = window.PQ_CACHE.find(function(x) { return x.id === id; });
  if (!r) return;
  document.getElementById('sheetTitle').textContent = '✅ کیفیت - AV ' + (r.avCode || '—');
  document.getElementById('sheetBody').innerHTML = `
    <div class="card sec-green"><div class="card-head"><div class="ch-ico">✅</div><h3>اطلاعات کیفیت</h3></div><div class="card-body">
      <div class="info-row"><div class="label">تاریخ</div><div class="value">${pqFmtDate(r.date)}</div></div>
      <div class="info-row"><div class="label">ماه / هفته</div><div class="value">${r.month || '—'} / ${r.weekNumber || '—'}</div></div>
      <div class="info-row"><div class="label">AV Code</div><div class="value mono"><b>${r.avCode || '—'}</b></div></div>
      <div class="info-row"><div class="label">Article Variant</div><div class="value">${r.articleVariant || '—'}</div></div>
      <div class="info-row"><div class="label">رنگ</div><div class="value">${r.color || '—'}</div></div>
      <div class="info-row"><div class="label">شیفت</div><div class="value">${r.shiftNumber || '—'}</div></div>
    </div></div>
    <div class="card sec-red"><div class="card-head"><div class="ch-ico">📊</div><h3>داده‌های کیفیت</h3></div><div class="card-body">
      <div class="info-row"><div class="label">Hold Total</div><div class="value"><b style="color:#DC2626">${(r.holdTotal || 0).toLocaleString()}</b></div></div>
      <div class="info-row"><div class="label">Destroyed Total</div><div class="value"><b style="color:#DC2626">${(r.destroyedTotal || 0).toLocaleString()}</b></div></div>
      <div class="info-row"><div class="label">Total Production</div><div class="value"><b>${(r.totalProductionPcs || 0).toLocaleString()}</b></div></div>
      <div class="info-row"><div class="label">Hold %</div><div class="value">${r.holdPercent || 0}%</div></div>
      <div class="info-row"><div class="label">Destroyed PPM</div><div class="value">${r.destroyedPPM || 0}</div></div>
    </div></div>
  `;
  document.getElementById('sheetFoot').innerHTML = `
    <button class="btn btn-ghost" onclick="closeSheet()">بستن</button>
    <button class="btn btn-orange" onclick="closeSheet();setTimeout(function(){window.openEditQuality('${id}')},300)">✏️ ویرایش</button>
  `;
  document.getElementById('overlay').classList.add('show');
  document.getElementById('sheet').classList.add('show');
  if (window.resetSheetScroll) setTimeout(window.resetSheetScroll, 50);
};

window.openEditQuality = function(id) {
  var r = window.PQ_CACHE.find(function(x) { return x.id === id; });
  if (!r) { toast('❌ رکورد پیدا نشد', 'err'); return; }
  document.getElementById('sheetTitle').textContent = '✏️ ویرایش کیفیت';
  document.getElementById('sheetBody').innerHTML = `
    <div class="card sec-green"><div class="card-head"><div class="ch-ico">✅</div><h3>ویرایش اطلاعات</h3></div><div class="card-body">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div class="field"><label>تاریخ</label><input class="inp" id="edqDate" type="date" value="${r.date ? r.date.slice(0,10) : ''}"></div>
        <div class="field"><label>ماه</label><input class="inp" id="edqMonth" type="number" value="${r.month || ''}"></div>
        <div class="field"><label>هفته</label><input class="inp" id="edqWeek" type="number" value="${r.weekNumber || ''}"></div>
      </div>
      <div class="field"><label>AV Code</label><input class="inp" id="edqAvCode" value="${r.avCode || ''}"></div>
      <div class="field"><label>Article Variant</label><input class="inp" id="edqArticleVariant" value="${r.articleVariant || ''}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="field"><label>رنگ</label><input class="inp" id="edqColor" value="${r.color || ''}"></div>
        <div class="field"><label>شیفت</label><select class="inp" id="edqShift"><option value="A" ${r.shiftNumber === 'A' ? 'selected' : ''}>A</option><option value="B" ${r.shiftNumber === 'B' ? 'selected' : ''}>B</option><option value="C" ${r.shiftNumber === 'C' ? 'selected' : ''}>C</option></select></div>
      </div>
      <div class="field"><label>Profit Center</label><input class="inp" id="edqProfitCenter" value="${r.profitCenter || ''}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="field"><label>Hold Total</label><input class="inp" id="edqHold" type="number" value="${r.holdTotal || 0}"></div>
        <div class="field"><label>Destroyed Total</label><input class="inp" id="edqDestroyed" type="number" value="${r.destroyedTotal || 0}"></div>
      </div>
      <div class="field"><label>Defect Issue</label><input class="inp" id="edqDefect" value="${r.defectIssue || ''}"></div>
      <div class="field"><label>Total Production</label><input class="inp" id="edqTotalProd" type="number" value="${r.totalProductionPcs || 0}"></div>
      <div class="field"><label>دلیل ویرایش <span style="color:#DC2626">*</span></label><input class="inp" id="edqReason" placeholder="دلیل ویرایش"></div>
    </div></div>
  `;
  document.getElementById('sheetFoot').innerHTML = `
    <button class="btn btn-ghost" onclick="closeSheet()">انصراف</button>
    <button class="btn btn-red" onclick="window.pqDeleteQuality('${id}')">🗑 حذف</button>
    <button class="btn btn-blue" onclick="window.pqSaveEditQuality('${id}')">💾 ذخیره</button>
  `;
  document.getElementById('overlay').classList.add('show');
  document.getElementById('sheet').classList.add('show');
  if (window.resetSheetScroll) setTimeout(window.resetSheetScroll, 50);
};

window.pqSaveEditQuality = async function(id) {
  var reason = document.getElementById('edqReason').value.trim();
  if (!reason) { toast('❌ دلیل ویرایش الزامی است', 'err'); return; }
  try {
    var hold = parseInt(document.getElementById('edqHold').value) || 0;
    var destroyed = parseInt(document.getElementById('edqDestroyed').value) || 0;
    var total = parseInt(document.getElementById('edqTotalProd').value) || 0;
    await pb.collection('quality_data').update(id, {
      date: new Date(document.getElementById('edqDate').value + 'T00:00:00').toISOString(),
      month: parseInt(document.getElementById('edqMonth').value) || 0,
      weekNumber: parseInt(document.getElementById('edqWeek').value) || 0,
      avCode: document.getElementById('edqAvCode').value.trim(),
      articleVariant: document.getElementById('edqArticleVariant').value.trim(),
      color: document.getElementById('edqColor').value.trim(),
      shiftNumber: document.getElementById('edqShift').value,
      profitCenter: document.getElementById('edqProfitCenter').value.trim(),
      holdTotal: hold,
      destroyedTotal: destroyed,
      defectIssue: document.getElementById('edqDefect').value.trim(),
      totalProductionPcs: total,
      holdPercent: total > 0 ? (hold / total * 100) : 0,
      destroyedPPM: total > 0 ? (destroyed / total * 1000000) : 0,
      rejectedRatio: total > 0 ? (hold / total * 100) : 0
    });
    try {
      await pb.collection('audit_log').create({
        action: 'update', requestTagNo: 'QUAL-' + id.slice(0, 6),
        actorId: USER.id, actorName: USER.name, actorRole: USER.role,
        field: 'QUALITY_EDIT', oldValue: '', newValue: 'ویرایش شد', reason: reason
      });
    } catch(e) {}
    toast('✅ ویرایش شد', 'ok');
    closeSheet();
    viewQuality();
  } catch(err) { toast('❌ ' + err.message, 'err'); }
};

window.pqDeleteQuality = async function(id) {
  if (!confirm('آیا از حذف این رکورد مطمئن هستید؟')) return;
  var reason = prompt('دلیل حذف:');
  if (!reason) return;
  try {
    await pb.collection('quality_data').delete(id);
    try {
      await pb.collection('audit_log').create({
        action: 'delete', requestTagNo: 'QUAL-' + id.slice(0, 6),
        actorId: USER.id, actorName: USER.name, actorRole: USER.role,
        field: 'QUALITY_DELETE', oldValue: 'حذف شده', newValue: '', reason: reason
      });
    } catch(e) {}
    toast('✅ حذف شد', 'ok');
    closeSheet();
    viewQuality();
  } catch(err) { toast('❌ ' + err.message, 'err'); }
};

// ===== EXPORT =====
window.exportProductionData = async function() {
  try {
    var data = await pb.collection('production_data').getFullList({ sort: '-date', expand: 'machine' });
    var headers = ['Machine', 'Date', 'AV', 'Type', 'Shift A', 'Shift B', 'Shift C', 'Total Production', 'CT (Target)', 'Cav (Target)', 'CT (Actual)', 'Cav (Actual)'];
    var rows = data.map(function(r) {
      var m = r.expand && r.expand.machine ? (r.expand.machine.code + ' - ' + r.expand.machine.name) : '';
      return [m, r.date ? r.date.slice(0, 10) : '', r.av || '', r.type || '', r.shiftA || 0, r.shiftB || 0, r.shiftC || 0, r.totalProduction || 0, r.ctTarget || 0, r.cavTarget || 0, r.ctActual || 0, r.cavActual || 0];
    });
    return { headers: headers, rows: rows };
  } catch(e) { console.error(e); return { headers: [], rows: [] }; }
};

window.exportQualityData = async function() {
  try {
    var data = await pb.collection('quality_data').getFullList({ sort: '-date' });
    var headers = ['Date', 'Month', 'Week Number', 'AV Code', 'Article Variant', 'Color', 'Shift Number', 'Profit Center', 'Hold Total', 'Destroyed Total', 'Defect Issue', 'Total Production PCs', 'Hold %', 'Destroyed (PPM)', 'Rejected Ratio of Hold%'];
    var rows = data.map(function(r) {
      return [r.date ? r.date.slice(0, 10) : '', r.month || '', r.weekNumber || '', r.avCode || '', r.articleVariant || '', r.color || '', r.shiftNumber || '', r.profitCenter || '', r.holdTotal || 0, r.destroyedTotal || 0, r.defectIssue || '', r.totalProductionPcs || 0, r.holdPercent || 0, r.destroyedPPM || 0, r.rejectedRatio || 0];
    });
    return { headers: headers, rows: rows };
  } catch(e) { console.error(e); return { headers: [], rows: [] }; }
};

window.viewProduction = viewProduction;
window.viewQuality = viewQuality;

console.log('[PQ] v2 loaded - with searchable machine picker');