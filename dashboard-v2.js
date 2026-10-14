/* ============================================
   BASPAR PLASTICS - Dashboard v2
   Advanced Analytics with MTTR/MTBF
   ============================================ */

// ===== STATE =====
let DASH_PERIOD = 'month'; // day | week | month | year
let DASH_CHARTS = {};      // Chart.js instances

// ===== PERIOD FILTER =====
function getPeriodStart(period) {
  const now = new Date();
  const d = new Date(now);
  if (period === 'day')   { d.setHours(0,0,0,0); return d; }
  if (period === 'week')  { d.setDate(d.getDate() - 7); return d; }
  if (period === 'month') { d.setMonth(d.getMonth() - 1); return d; }
  if (period === 'year')  { d.setFullYear(d.getFullYear() - 1); return d; }
  return new Date(0);
}

function filterByPeriod(requests, period) {
  const start = getPeriodStart(period);
  return requests.filter(r => new Date(r.created) >= start);
}

// ===== MTTR / MTBF =====
function calcMTTR(requests) {
  const durations = requests
    .filter(r => r.startedAt && r.finishedAt)
    .map(r => (new Date(r.finishedAt) - new Date(r.startedAt)) / 3600000); // hours
  if (!durations.length) return 0;
  return durations.reduce((a,b)=>a+b,0) / durations.length;
}

function calcMTBF(requests, machineId) {
  const machineReqs = requests
    .filter(r => r.machine === machineId)
    .map(r => new Date(r.created).getTime())
    .sort((a,b)=>a-b);
  if (machineReqs.length < 2) return 0;
  let totalGap = 0;
  for (let i = 1; i < machineReqs.length; i++) {
    totalGap += machineReqs[i] - machineReqs[i-1];
  }
  return (totalGap / (machineReqs.length - 1)) / 3600000; // hours
}

// ===== PERSONNEL STATS =====
function calcPersonnelStats(requests, users) {
  const stats = {};
  users.forEach(u => {
    stats[u.id] = {
      id: u.id,
      name: u.fullName || u.email,
      role: u.role,
      reported: 0,
      assigned: 0,
      completed: 0,
      totalRepairTime: 0
    };
  });
  requests.forEach(r => {
    if (r.reportedBy && stats[r.reportedBy]) stats[r.reportedBy].reported++;
    if (r.assignedTo && stats[r.assignedTo]) {
      stats[r.assignedTo].assigned++;
      if (r.status === 'CLOSED' || r.status === 'DELIVERED') {
        stats[r.assignedTo].completed++;
        if (r.startedAt && r.finishedAt) {
          stats[r.assignedTo].totalRepairTime += (new Date(r.finishedAt) - new Date(r.startedAt)) / 3600000;
        }
      }
    }
  });
  return Object.values(stats).filter(s => s.reported > 0 || s.assigned > 0);
}

// ===== FORMAT HELPERS =====
function fmtHours(h) {
  if (!h || h === 0) return '—';
  if (h < 1) return Math.round(h * 60) + ' دقیقه';
  if (h < 24) return h.toFixed(1) + ' ساعت';
  return (h / 24).toFixed(1) + ' روز';
}

function machineShortCode(machine) {
  if (!machine) return '?';
  return machine.code || machine.id.substring(0,6);
}

function machineStatusClass(machine, requests) {
  const active = requests.find(r => r.machine === machine.id && ['SUBMITTED','IN_PROGRESS','ASSIGNED','APPROVED'].includes(r.status));
  if (active) {
    if (active.priority === 'A') return 'm-crit';
    if (active.priority === 'B') return 'm-warn';
    return 'm-info';
  }
  return 'm-ok';
}

// ===== MAIN RENDER =====
function renderDashV2() {
  const host = document.getElementById('viewInner');
  if (!host) return;
  
  const allReqs = CURRENT_REQUESTS || [];
  const periodReqs = filterByPeriod(allReqs, DASH_PERIOD);
  const machines = CURRENT_MACHINES || [];
  const lines = CURRENT_LINES || [];
  
  const total = periodReqs.length;
  const open = periodReqs.filter(r => ['SUBMITTED','APPROVED','ASSIGNED','IN_PROGRESS'].includes(r.status)).length;
  const pending = periodReqs.filter(r => r.status === 'SUPERVISOR_REVIEW').length;
  const closed = periodReqs.filter(r => ['CLOSED','DELIVERED'].includes(r.status)).length;
  const mttr = calcMTTR(periodReqs);
  
  // MTBF کلی
  let mtbfTotal = 0, mtbfCount = 0;
  machines.forEach(m => {
    const v = calcMTBF(periodReqs, m.id);
    if (v > 0) { mtbfTotal += v; mtbfCount++; }
  });
  const mtbf = mtbfCount ? (mtbfTotal / mtbfCount) : 0;
  
  // ===== دوره =====
  const periodLabels = { day: 'امروز', week: 'هفته اخیر', month: 'ماه اخیر', year: 'سال اخیر' };
  const periodBtns = ['day','week','month','year'].map(p => 
    `<button class="period-btn ${DASH_PERIOD===p?'active':''}" data-period="${p}">${periodLabels[p]}</button>`
  ).join('');
  
  // ===== کارت‌های ماشین =====
  const machinesHTML = machines.map(m => {
    const mReqs = periodReqs.filter(r => r.machine === m.id);
    const mOpen = mReqs.filter(r => !['CLOSED','DELIVERED'].includes(r.status)).length;
    const mMTTR = calcMTTR(mReqs);
    const mFailures = mReqs.length;
    const statusCls = machineStatusClass(m, periodReqs);
    const statusLabel = { 'm-ok':'سالم', 'm-info':'فعال', 'm-warn':'هشدار', 'm-crit':'توقف' }[statusCls];
    const lineName = lines.find(l => l.id === m.line)?.code || '—';
    
    return `
      <div class="machine-card ${statusCls}">
        <div class="mc-head">
          <div class="mc-code">${m.code || '—'}</div>
          <div class="mc-status">${statusLabel}</div>
        </div>
        <div class="mc-name">${m.name || '—'}</div>
        <div class="mc-line">خط: ${lineName}</div>
        <div class="mc-stats">
          <div class="mc-stat"><span class="mcs-val">${mFailures}</span><span class="mcs-lab">خرابی</span></div>
          <div class="mc-stat"><span class="mcs-val">${mOpen}</span><span class="mcs-lab">باز</span></div>
          <div class="mc-stat"><span class="mcs-val">${fmtHours(mMTTR)}</span><span class="mcs-lab">MTTR</span></div>
        </div>
      </div>
    `;
  }).join('');
  
  // ===== پرسنل =====
  const personnel = calcPersonnelStats(periodReqs, window.ALL_USERS || []);
  const personnelHTML = personnel.length ? personnel.map(p => `
    <tr>
      <td>${p.name}</td>
      <td><span class="role-badge role-${p.role}">${p.role}</span></td>
      <td>${p.reported}</td>
      <td>${p.completed}</td>
      <td>${p.completed > 0 ? fmtHours(p.totalRepairTime / p.completed) : '—'}</td>
    </tr>
  `).join('') : '<tr><td colspan="5" style="text-align:center;color:#94A3B8">داده‌ای نیست</td></tr>';
  
  // ===== HTML نهایی =====
  host.innerHTML = `
    <style>
      .dash2-head{background:linear-gradient(135deg,#C8102E 0%,#9B0C23 100%);color:#fff;padding:18px 16px;border-radius:16px;margin-bottom:14px;position:relative;overflow:hidden}
      .dash2-head::before{content:'';position:absolute;top:-50%;right:-20%;width:200px;height:200px;background:rgba(255,255,255,.05);border-radius:50%}
      .dash2-title{font-size:18px;font-weight:900;margin-bottom:4px;position:relative}
      .dash2-sub{font-size:11.5px;opacity:.85;position:relative}
      .period-bar{display:flex;gap:6px;margin-top:14px;position:relative}
      .period-btn{flex:1;padding:8px 6px;border-radius:10px;background:rgba(255,255,255,.12);color:#fff;font-size:11.5px;font-weight:800;border:1px solid rgba(255,255,255,.15);cursor:pointer;transition:.2s;font-family:inherit}
      .period-btn.active{background:#fff;color:#C8102E}
      .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
      @media(min-width:640px){.kpi-grid{grid-template-columns:repeat(6,1fr)}}
      .kpi2{background:#fff;border-radius:12px;padding:12px 10px;text-align:center;border:1px solid #E2E8F0;box-shadow:0 2px 6px rgba(15,23,42,.04)}
      .kpi2-val{font-size:20px;font-weight:900;color:#0F172A;line-height:1.1}
      .kpi2-val small{font-size:10px;color:#64748B;font-weight:700}
      .kpi2-lab{font-size:10px;color:#64748B;margin-top:4px;font-weight:700}
      .kpi2.blue .kpi2-val{color:#1E5A9E}
      .kpi2.green .kpi2-val{color:#16A34A}
      .kpi2.orange .kpi2-val{color:#F59E0B}
      .kpi2.purple .kpi2-val{color:#7C3AED}
      
      .chart-card2{background:#fff;border-radius:14px;padding:14px;margin-bottom:12px;border:1px solid #E2E8F0;box-shadow:0 2px 8px rgba(15,23,42,.04)}
      .chart-head2{display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:13px;font-weight:800;color:#0F172A}
      .chart-head2 .ico{width:28px;height:28px;border-radius:8px;background:#F1F5F9;display:grid;place-items:center;font-size:14px}
      .chart-wrap{position:relative;height:220px}
      
      .machines-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
      @media(min-width:640px){.machines-grid{grid-template-columns:repeat(3,1fr)}}
      .machine-card{background:#fff;border-radius:12px;padding:12px;border:1px solid #E2E8F0;position:relative;overflow:hidden;transition:.2s}
      .machine-card::before{content:'';position:absolute;top:0;right:0;width:4px;height:100%}
      .machine-card.m-ok::before{background:#16A34A}
      .machine-card.m-info::before{background:#3B82F6}
      .machine-card.m-warn::before{background:#F59E0B}
      .machine-card.m-crit::before{background:#DC2626;animation:pulse 1.5s infinite}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      .mc-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
      .mc-code{font-size:14px;font-weight:900;color:#1E5A9E;font-family:ui-monospace,monospace}
      .mc-status{font-size:9.5px;font-weight:800;padding:3px 7px;border-radius:5px;background:#F1F5F9;color:#475569}
      .m-ok .mc-status{background:#DCFCE7;color:#166534}
      .m-info .mc-status{background:#DBEAFE;color:#1E40AF}
      .m-warn .mc-status{background:#FEF3C7;color:#92400E}
      .m-crit .mc-status{background:#FEE2E2;color:#991B1B}
      .mc-name{font-size:11.5px;color:#475569;margin-bottom:2px;font-weight:600}
      .mc-line{font-size:10px;color:#94A3B8;margin-bottom:10px}
      .mc-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding-top:8px;border-top:1px solid #F1F5F9}
      .mc-stat{text-align:center}
      .mcs-val{display:block;font-size:13px;font-weight:900;color:#0F172A}
      .mcs-lab{display:block;font-size:9px;color:#94A3B8;margin-top:2px}
      
      .personnel-table{width:100%;border-collapse:collapse;font-size:12px}
      .personnel-table th{text-align:right;padding:8px 6px;background:#F8FAFC;font-size:10.5px;color:#64748B;font-weight:800;border-bottom:1px solid #E2E8F0}
      .personnel-table td{padding:8px 6px;border-bottom:1px solid #F1F5F9}
      .role-badge{font-size:9.5px;font-weight:800;padding:2px 7px;border-radius:5px;background:#F1F5F9;color:#475569}
      .role-admin{background:#FEE2E2;color:#991B1B}
      .role-supervisor{background:#FEF3C7;color:#92400E}
      .role-technician{background:#DBEAFE;color:#1E40AF}
      .role-operator{background:#DCFCE7;color:#166534}
      
      .empty-state2{text-align:center;padding:40px 20px;color:#94A3B8}
      .empty-state2 .ico{font-size:48px;margin-bottom:12px;opacity:.5}
    </style>
    
    <!-- هدر با فیلتر زمانی -->
    <div class="dash2-head">
      <div class="dash2-title">📊 داشبورد تحلیلی</div>
      <div class="dash2-sub">BASPAR PLASTICS · تحلیل زنده تعمیرات · ${periodLabels[DASH_PERIOD]}</div>
      <div class="period-bar">${periodBtns}</div>
      
      ${(USER && (USER.role === 'admin' || USER.role === 'supervisor' || USER.role === 'manager')) ? '<button onclick="renderAuditLog()" style="margin-top:8px;padding:10px 16px;background:#1E5A9E;color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit;width:100%">📋 گزارش تغییرات (Audit Log)</button>' : ''}
    </div>
    
    <!-- KPI ها -->
    <div class="kpi-grid">
      <div class="kpi2"><div class="kpi2-val">${total}</div><div class="kpi2-lab">کل درخواست</div></div>
      <div class="kpi2 blue"><div class="kpi2-val">${open}</div><div class="kpi2-lab">در جریان</div></div>
      <div class="kpi2 orange"><div class="kpi2-val">${pending}</div><div class="kpi2-lab">در انتظار</div></div>
      <div class="kpi2 green"><div class="kpi2-val">${closed}</div><div class="kpi2-lab">بسته شده</div></div>
      <div class="kpi2 purple"><div class="kpi2-val">${fmtHours(mttr)}</div><div class="kpi2-lab">MTTR</div></div>
      <div class="kpi2 blue"><div class="kpi2-val">${fmtHours(mtbf)}</div><div class="kpi2-lab">MTBF</div></div>
    </div>
    
    <!-- روند MTTR -->
    <div class="chart-card2">
      <div class="chart-head2"><span class="ico">📈</span><span>روند MTTR در ${periodLabels[DASH_PERIOD]}</span></div>
      <div class="chart-wrap"><canvas id="chartMTTR"></canvas></div>
    </div>
    
    <!-- توزیع وضعیت + اولویت -->
    <div style="display:grid;grid-template-columns:1fr;gap:12px">
      <div class="chart-card2">
        <div class="chart-head2"><span class="ico">🍩</span><span>توزیع وضعیت‌ها</span></div>
        <div class="chart-wrap" style="height:200px"><canvas id="chartStatus"></canvas></div>
      </div>
      <div class="chart-card2">
        <div class="chart-head2"><span class="ico">⚡</span><span>توزیع اولویت‌ها</span></div>
        <div class="chart-wrap" style="height:200px"><canvas id="chartPriority"></canvas></div>
      </div>
    </div>
    
    <!-- کارت‌های ماشین -->
    <div class="chart-card2">
      <div class="chart-head2"><span class="ico">🏭</span><span>وضعیت ماشین‌ها</span></div>
      <div class="machines-grid">${machinesHTML || '<div class="empty-state2" style="grid-column:1/-1"><div class="ico">🏭</div>ماشینی ثبت نشده</div>'}</div>
    </div>
    
    <!-- پرسنل -->
    <div class="chart-card2">
      <div class="chart-head2"><span class="ico">👥</span><span>عملکرد پرسنل</span></div>
      <div style="overflow-x:auto">
        <table class="personnel-table">
          <thead><tr><th>نام</th><th>نقش</th><th>ثبت</th><th>تکمیل</th><th>میانگین</th></tr></thead>
          <tbody>${personnelHTML}</tbody>
        </table>
      </div>
    </div>
  `;
  
  // ===== بایند دکمه‌های دوره =====
  host.querySelectorAll('.period-btn').forEach(btn => {
    btn.onclick = () => {
      DASH_PERIOD = btn.dataset.period;
      Object.values(DASH_CHARTS).forEach(c => c && c.destroy());
      DASH_CHARTS = {};
      renderDashV2();
    };
  });
  
  // ===== ساخت نمودارها =====
  setTimeout(() => buildCharts(periodReqs, machines), 50);
}

// ===== CHARTS =====
function buildCharts(requests, machines) {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded');
    return;
  }
  
  Chart.defaults.font.family = "'Vazirmatn', Tahoma, sans-serif";
  Chart.defaults.font.size = 11;
  
  // 1. MTTR Trend
  const trendDays = DASH_PERIOD === 'day' ? 24 : DASH_PERIOD === 'week' ? 7 : DASH_PERIOD === 'month' ? 30 : 12;
  const trendLabels = [];
  const trendData = [];
  
  if (DASH_PERIOD === 'year') {
    for (let i = trendDays - 1; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString('fa-IR', { month: 'short' });
      trendLabels.push(label);
      const monthReqs = requests.filter(r => {
        const rd = new Date(r.created);
        return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth();
      });
      trendData.push(calcMTTR(monthReqs));
    }
  } else {
    for (let i = trendDays - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('fa-IR', { month: '2-digit', day: '2-digit' });
      trendLabels.push(label);
      const dayReqs = requests.filter(r => {
        const rd = new Date(r.created);
        return rd.toDateString() === d.toDateString();
      });
      trendData.push(calcMTTR(dayReqs));
    }
  }
  
  const ctx1 = document.getElementById('chartMTTR');
  if (ctx1) {
    DASH_CHARTS.mttr = new Chart(ctx1, {
      type: 'line',
      data: {
        labels: trendLabels,
        datasets: [{
          label: 'MTTR (ساعت)',
          data: trendData,
          borderColor: '#1E5A9E',
          backgroundColor: 'rgba(30,90,158,.1)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#1E5A9E',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#F1F5F9' }, ticks: { color: '#94A3B8' } },
          x: { grid: { display: false }, ticks: { color: '#94A3B8' } }
        }
      }
    });
  }
  
  // 2. Status Donut
  const statusMap = { SUBMITTED:'ارسال شده', APPROVED:'تایید', ASSIGNED:'تخصیص', IN_PROGRESS:'در تعمیر', SUPERVISOR_REVIEW:'بررسی', DELIVERED:'تحویل', CLOSED:'بسته', CANCELLED:'لغو' };
  const statusColors = { SUBMITTED:'#60A5FA', APPROVED:'#818CF8', ASSIGNED:'#6366F1', IN_PROGRESS:'#3B82F6', SUPERVISOR_REVIEW:'#F59E0B', DELIVERED:'#10B981', CLOSED:'#16A34A', CANCELLED:'#94A3B8' };
  const statusCounts = {};
  requests.forEach(r => { statusCounts[r.status] = (statusCounts[r.status]||0)+1; });
  const statusLabels = Object.keys(statusCounts).map(k => statusMap[k] || k);
  const statusData = Object.values(statusCounts);
  const statusBg = Object.keys(statusCounts).map(k => statusColors[k] || '#94A3B8');
  
  const ctx2 = document.getElementById('chartStatus');
  if (ctx2) {
    DASH_CHARTS.status = new Chart(ctx2, {
      type: 'doughnut',
      data: { labels: statusLabels, datasets: [{ data: statusData, backgroundColor: statusBg, borderWidth: 2, borderColor: '#fff' }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { padding: 10, font: { size: 10 } } } },
        cutout: '65%'
      }
    });
  }
  
  // 3. Priority Bar
  const prioCounts = { A:0, B:0, C:0 };
  requests.forEach(r => { if (prioCounts[r.priority] !== undefined) prioCounts[r.priority]++; });
  
  const ctx3 = document.getElementById('chartPriority');
  if (ctx3) {
    DASH_CHARTS.priority = new Chart(ctx3, {
      type: 'bar',
      data: {
        labels: ['A - توقف کامل', 'B - احتمال خرابی', 'C - تماس فوری'],
        datasets: [{
          data: [prioCounts.A, prioCounts.B, prioCounts.C],
          backgroundColor: ['#DC2626', '#F59E0B', '#3B82F6'],
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#F1F5F9' }, ticks: { color: '#94A3B8' } },
          x: { grid: { display: false }, ticks: { color: '#475569', font: { size: 10 } } }
        }
      }
    });
  }
}


// ============================================
// AUDIT LOG VIEW
// ============================================
let AUDIT_FILTER = 'all';
let AUDIT_CACHE = [];

async function renderAuditLog() {
  const host = document.getElementById('viewInner');
  if (!host) return;
  
  // بررسی دسترسی
  if (!USER || (USER.role !== 'admin' && USER.role !== 'supervisor' && USER.role !== 'manager')) {
    host.innerHTML = '<div class="empty-state"><div class="es-ico">🔒</div><h4>دسترسی محدود</h4><p>فقط سرپرست و ادمین می‌توانند گزارش تغییرات را ببینند</p></div>';
    return;
  }
  
  host.innerHTML = '<div style="text-align:center;padding:40px;color:#94A3B8">در حال بارگذاری...</div>';
  
  try {
    const logs = await pb.collection('audit_log').getFullList({
      sort: '-created',
      requestKey: 'audit_' + Date.now()
    });
    AUDIT_CACHE = logs;
    
    // فیلتر
    let filtered = logs;
    if (AUDIT_FILTER !== 'all') {
      filtered = logs.filter(l => l.action === AUDIT_FILTER);
    }
    
    // شمارش بر اساس نوع
    const counts = {};
    logs.forEach(l => { counts[l.action] = (counts[l.action] || 0) + 1; });
    
    const actionLabels = {
      'create': 'ایجاد', 'update': 'به‌روزرسانی', 'delete': 'حذف',
      'accept': 'پذیرش', 'finish': 'پایان', 'verify': 'تایید',
      'deliver': 'تحویل', 'close': 'بستن', 'cancel': 'لغو'
    };
    
    const filterBtns = [
      { key: 'all', label: 'همه (' + logs.length + ')' },
      { key: 'create', label: 'ایجاد (' + (counts.create || 0) + ')' },
      { key: 'accept', label: 'پذیرش (' + (counts.accept || 0) + ')' },
      { key: 'finish', label: 'پایان (' + (counts.finish || 0) + ')' },
      { key: 'verify', label: 'تایید (' + (counts.verify || 0) + ')' },
      { key: 'close', label: 'بستن (' + (counts.close || 0) + ')' },
      { key: 'delete', label: 'حذف (' + (counts.delete || 0) + ')' }
    ];
    
    const rows = filtered.slice(0, 200).map(l => {
      const d = new Date(l.created);
      const dateStr = d.toLocaleDateString('fa-IR') + ' ' + d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      const actionColor = {
        'create': '#3B82F6', 'update': '#F59E0B', 'delete': '#DC2626',
        'accept': '#8B5CF6', 'finish': '#F97316', 'verify': '#10B981',
        'deliver': '#06B6D4', 'close': '#16A34A', 'cancel': '#EF4444'
      }[l.action] || '#64748B';
      
      return `
        <tr>
          <td style="padding:8px;text-align:right;font-size:11px">${dateStr}</td>
          <td style="padding:8px;text-align:center"><span style="background:${actionColor};color:#fff;padding:2px 8px;border-radius:5px;font-size:10px;font-weight:800">${actionLabels[l.action] || l.action}</span></td>
          <td style="padding:8px;text-align:right;font-family:monospace;font-size:10px;color:#1E5A9E;cursor:pointer" onclick="if(window.openDetail)openDetail('${l.relation || ''}')">${esc(l.requestTagNo || '—')}</td>
          <td style="padding:8px;text-align:right;font-size:11px">${esc(l.actorName || '—')} <span style="font-size:9px;color:#94A3B8">(${esc(l.actorRole || '')})</span></td>
          <td style="padding:8px;text-align:right;font-size:10px;color:#64748B">${esc(l.field || '—')}</td>
          <td style="padding:8px;text-align:right;font-size:10px">${esc((l.oldValue || '').substring(0, 40))}</td>
          <td style="padding:8px;text-align:right;font-size:10px">${esc((l.newValue || '').substring(0, 40))}</td>
          <td style="padding:8px;text-align:right;font-size:10px;color:#7C3AED">${esc(l.reason || '—')}</td>
        </tr>
      `;
    }).join('');
    
    host.innerHTML = `
      <style>
        .audit-filter{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
        .audit-filter button{padding:6px 12px;border-radius:8px;border:1px solid #E2E8F0;background:#fff;font-size:11px;font-weight:800;cursor:pointer;font-family:inherit;color:#475569}
        .audit-filter button.active{background:#1E5A9E;color:#fff;border-color:#1E5A9E}
        .audit-table{width:100%;border-collapse:collapse;font-size:11px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(15,23,42,.04)}
        .audit-table th{background:#F1F5F9;padding:10px 8px;text-align:right;font-size:10.5px;font-weight:800;color:#475569;border-bottom:1px solid #E2E8F0}
        .audit-table td{border-bottom:1px solid #F1F5F9}
        .audit-table tr:hover{background:#F8FAFC}
      </style>
      
      <div class="chart-card2">
        <div class="chart-head2"><span class="ico">📋</span><span>گزارش تغییرات (Audit Log)</span></div>
        <div class="audit-filter">
          ${filterBtns.map(f => '<button class="' + (AUDIT_FILTER===f.key?'active':'') + '" data-filter="' + f.key + '">' + f.label + '</button>').join('')}
        </div>
        <div style="overflow-x:auto">
          <table class="audit-table">
            <thead>
              <tr>
                <th>تاریخ</th>
                <th>اقدام</th>
                <th>TAG</th>
                <th>کاربر</th>
                <th>فیلد</th>
                <th>مقدار قبلی</th>
                <th>مقدار جدید</th>
                <th>دلیل</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="8" style="text-align:center;padding:20px;color:#94A3B8">رکوردی نیست</td></tr>'}
            </tbody>
          </table>
        </div>
        <div style="text-align:center;padding:10px;font-size:11px;color:#94A3B8">
          نمایش ${Math.min(200, filtered.length)} از ${filtered.length} رکورد
        </div>
      </div>
    `;
    
    // بایند دکمه‌های فیلتر
    host.querySelectorAll('.audit-filter button').forEach(btn => {
      btn.onclick = () => {
        AUDIT_FILTER = btn.dataset.filter;
        renderAuditLog();
      };
    });
  } catch (err) {
    console.error('[AUDIT] Error:', err);
    host.innerHTML = '<div class="empty-state"><div class="es-ico">❌</div><h4>خطا در بارگذاری</h4><p>' + err.message + '</p></div>';
  }
}

window.renderAuditLog = renderAuditLog;
// ===== EXPORT =====
window.renderDashV2 = renderDashV2;
window.DASH_PERIOD = DASH_PERIOD;