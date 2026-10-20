/* ============================================
   BASPAR PLASTICS - Notifications System
   ============================================ */

let NOTIF_CACHE = [];
let NOTIF_LAST_CHECK = null;
let NOTIF_POLL_INTERVAL = null;

// ===== خواندن اعلان‌ها =====
async function loadNotifications(limit) {
  try {
    const res = await pb.collection('notifications').getList(1, limit || 50, {
      sort: '-created',
      expand: 'actorId,requestId',
      requestKey: 'notif_' + Date.now() + '_' + Math.random()
    });
    NOTIF_CACHE = res.items;
    return res.items;
  } catch (err) {
    // خطای autocancel را نادیده بگیر
    if (err && err.message && err.message.includes('autocancelled')) {
      return NOTIF_CACHE;
    }
    console.error('[NOTIF] Load error:', err);
    return [];
  }
}

// ===== شمارش اعلان‌های نخوانده =====
function countUnread(notifs) {
  if (!USER) return 0;
  return notifs.filter(n => {
    const readBy = n.readBy || [];
    return !readBy.includes(USER.id);
  }).length;
}

// ===== به‌روزرسانی Badge =====
function updateNotifBadge(count) {
  const badge = document.getElementById('notifBadge');
  const navBadge = document.getElementById('notifNavBadge');
  if (count > 0) {
    if (badge) { badge.textContent = count; badge.style.display = 'inline-flex'; }
    if (navBadge) { navBadge.textContent = count; navBadge.style.display = 'inline-flex'; }
  } else {
    if (badge) badge.style.display = 'none';
    if (navBadge) navBadge.style.display = 'none';
  }
}

// ===== فراخوانی و به‌روزرسانی =====
async function refreshNotifications() {
  const notifs = await loadNotifications(50);
  const unread = countUnread(notifs);
  updateNotifBadge(unread);
  return { notifs, unread };
}

// ===== صفحه اعلان‌ها =====
async function viewNotif() {
  const host = document.getElementById('viewInner');
  if (!host) return;
  
  host.innerHTML = '<div class="empty-state"><div class="es-ico">⏳</div><h4>در حال بارگذاری...</h4></div>';
  
  const notifs = await loadNotifications(100);
  const readBy = USER ? USER.id : '';
  
  if (!notifs.length) {
    host.innerHTML = '<div class="empty-state"><div class="es-ico">🔔</div><h4>اعلانی نیست</h4><p>اعلان‌ها هنگام تغییر وضعیت درخواست‌ها اینجا نمایش داده می‌شوند</p></div>';
    return;
  }
  
  const typeIcons = {
    'create': '🚨', 'update': '🔄', 'assign': '👤',
    'start': '🔧', 'finish': '✅', 'verify': '🔍',
    'deliver': '📦', 'cancel': '❌', 'note': '📝'
  };
  
  const itemsHTML = notifs.map(n => {
    const isRead = (n.readBy || []).includes(readBy);
    const icon = typeIcons[n.type] || '🔔';
    const timeAgo = getTimeAgo(new Date(n.created));
    const prioCls = n.priority === 'urgent' ? 'notif-urgent' : n.priority === 'high' ? 'notif-high' : '';
    const readCls = isRead ? 'notif-read' : 'notif-unread';
    
    return `
      <div class="notif-item ${prioCls} ${readCls}" data-id="${n.id}" onclick="openNotifDetail('${n.id}')">
        <div class="notif-icon">${icon}</div>
        <div class="notif-body">
          <div class="notif-title">${escapeHtml(n.title)}</div>
          <div class="notif-msg">${escapeHtml(n.message)}</div>
          <div class="notif-meta">
            ${n.tagNo ? '<span class="notif-tag">' + escapeHtml(n.tagNo) + '</span>' : ''}
            <span class="notif-time">${timeAgo}</span>
            ${!isRead ? '<span class="notif-dot"></span>' : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  host.innerHTML = `
    <style>
      .notif-item{background:#fff;border-radius:12px;padding:12px;margin-bottom:8px;display:flex;gap:12px;cursor:pointer;transition:.15s;border:1px solid #E2E8F0;position:relative;overflow:hidden}
      .notif-item:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(15,23,42,.08)}
      .notif-item.notif-unread{border-right:4px solid #C8102E}
      .notif-item.notif-urgent{border-right-color:#DC2626;background:linear-gradient(90deg,#FEF2F2 0%,#fff 20%)}
      .notif-item.notif-high{border-right-color:#F59E0B;background:linear-gradient(90deg,#FFFBEB 0%,#fff 20%)}
      .notif-icon{width:40px;height:40px;border-radius:10px;background:#F1F5F9;display:grid;place-items:center;font-size:20px;flex-shrink:0}
      .notif-body{flex:1;min-width:0}
      .notif-title{font-size:13px;font-weight:800;color:#0F172A;margin-bottom:3px}
      .notif-msg{font-size:11.5px;color:#475569;line-height:1.5;margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
      .notif-meta{display:flex;align-items:center;gap:8px;font-size:10px;color:#94A3B8}
      .notif-tag{background:#1E5A9E;color:#fff;padding:2px 7px;border-radius:5px;font-weight:800;font-family:ui-monospace,monospace}
      .notif-time{font-weight:700}
      .notif-dot{width:8px;height:8px;border-radius:50%;background:#C8102E;margin-inline-start:auto;animation:pulse 1.5s infinite}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    </style>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding:0 4px">
      <h3 style="font-size:15px;font-weight:800">🔔 اعلان‌ها (${notifs.length})</h3>
      <button onclick="markAllRead()" style="font-size:11px;color:#C8102E;font-weight:800;background:none;border:none;cursor:pointer;font-family:inherit">علامت‌گذاری همه</button>
    </div>
    ${itemsHTML}
  `;
}

// ===== باز کردن جزئیات اعلان =====
async function openNotifDetail(id) {
  const n = NOTIF_CACHE.find(x => x.id === id);
  if (!n) return;
  
  // علامت‌گذاری به عنوان خوانده‌شده
  await markNotifRead(id);
  
  if (n.requestId) {
    // برو به جزئیات درخواست
    VIEW = 'list';
    render();
    setTimeout(() => openDetail(n.requestId), 200);
  }
}

// ===== علامت‌گذاری یک اعلان =====
async function markNotifRead(id) {
  if (!USER) return;
  const n = NOTIF_CACHE.find(x => x.id === id);
  if (!n) return;
  const readBy = n.readBy || [];
  if (readBy.includes(USER.id)) return;
  readBy.push(USER.id);
  try {
    await pb.collection('notifications').update(id, { readBy: readBy });
    n.readBy = readBy;
    const unread = countUnread(NOTIF_CACHE);
    updateNotifBadge(unread);
  } catch (err) {
    console.error('[NOTIF] Mark read error:', err);
  }
}

// ===== علامت‌گذاری همه =====
async function markAllRead() {
  if (!USER) return;
  const unreadNotifs = NOTIF_CACHE.filter(n => !(n.readBy || []).includes(USER.id));
  for (const n of unreadNotifs) {
    const readBy = n.readBy || [];
    readBy.push(USER.id);
    try {
      await pb.collection('notifications').update(n.id, { readBy: readBy });
      n.readBy = readBy;
    } catch (err) {}
  }
  updateNotifBadge(0);
  viewNotif();
  toast('✅ همه اعلان‌ها خوانده شد', 'ok');
}

// ===== Polling =====
function startNotifPolling() {
  if (NOTIF_POLL_INTERVAL) clearInterval(NOTIF_POLL_INTERVAL);
  refreshNotifications();
  NOTIF_POLL_INTERVAL = setInterval(refreshNotifications, 30000);
}

function stopNotifPolling() {
  if (NOTIF_POLL_INTERVAL) {
    clearInterval(NOTIF_POLL_INTERVAL);
    NOTIF_POLL_INTERVAL = null;
  }
}

// ===== Helpers =====
function getTimeAgo(date) {
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'همین الان';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + ' دقیقه پیش';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + ' ساعت پیش';
  const day = Math.floor(hr / 24);
  if (day < 30) return day + ' روز پیش';
  return date.toLocaleDateString('fa-IR');
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

// ===== Realtime Subscription =====
function startNotifRealtime() {
  try {
    pb.collection('notifications').subscribe('*', function(e) {
      console.log('[REALTIME]', e.action, e.record);
      
      if (e.action === 'create') {
        const n = e.record;
        NOTIF_CACHE.unshift(n);
        const unread = countUnread(NOTIF_CACHE);
        updateNotifBadge(unread);
        showNotifToast(n);
        if (typeof VIEW !== 'undefined' && VIEW === 'notif' && typeof viewNotif === 'function') {
          viewNotif();
        }
      }
      
      if (e.action === 'update') {
        const idx = NOTIF_CACHE.findIndex(x => x.id === e.record.id);
        if (idx >= 0) NOTIF_CACHE[idx] = e.record;
        const unread = countUnread(NOTIF_CACHE);
        updateNotifBadge(unread);
      }
    });
    console.log('[REALTIME] Subscribed to notifications');
  } catch (err) {
    console.error('[REALTIME] Error:', err);
  }
}

// ===== Toast =====
function showNotifToast(n) {
  const container = document.getElementById('notifToastContainer') || (() => {
    const div = document.createElement('div');
    div.id = 'notifToastContainer';
    div.style.cssText = 'position:fixed;top:70px;left:12px;right:12px;z-index:9999;pointer-events:none;max-width:400px';
    document.body.appendChild(div);
    return div;
  })();
  
  const toast = document.createElement('div');
  toast.style.cssText = 'background:linear-gradient(135deg,#C8102E,#9B0C23);color:#fff;padding:14px 16px;border-radius:12px;margin-bottom:8px;box-shadow:0 8px 24px rgba(200,16,46,.4);display:flex;gap:10px;align-items:flex-start;animation:notifSlideDown .3s ease;pointer-events:auto;cursor:pointer';
  toast.innerHTML = `
    <div style="font-size:20px">${n.type === 'create' ? '🚨' : '🔔'}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:800;margin-bottom:2px">${n.title || 'اعلان'}</div>
      <div style="font-size:11px;opacity:.9;line-height:1.4">${n.message || ''}</div>
      ${n.tagNo ? '<div style="font-size:10px;margin-top:4px;background:rgba(255,255,255,.2);padding:2px 6px;border-radius:4px;display:inline-block;font-family:monospace">' + n.tagNo + '</div>' : ''}
    </div>
  `;
  toast.onclick = () => {
    toast.remove();
    if (n.requestId && typeof VIEW !== 'undefined') {
      VIEW = 'list';
      if (typeof render === 'function') render();
      setTimeout(() => { if (typeof openDetail === 'function') openDetail(n.requestId); }, 200);
    }
  };
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'notifSlideUp .3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 8000);
}

// ===== Toast Animations =====
(function addNotifAnimations() {
  if (document.getElementById('notifAnimations')) return;
  const style = document.createElement('style');
  style.id = 'notifAnimations';
  style.textContent = `
    @keyframes notifSlideDown{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes notifSlideUp{from{transform:translateY(0);opacity:1}to{transform:translateY(-20px);opacity:0}}
  `;
  document.head.appendChild(style);
})();

// ===== Export Realtime =====
window.startNotifRealtime = startNotifRealtime;
window.showNotifToast = showNotifToast;


// ===== Realtime برای repair_requests =====
let REQ_RT_SUB = null;

function startRequestsRealtime() {
  try {
    pb.collection('repair_requests').subscribe('*', function(e) {
      console.log('[REQ-RT]', e.action, e.record?.tagNo);
      
      // اگر در صفحه لیست یا داشبورد هستیم، خودکار رفرش کن
      if (typeof VIEW !== 'undefined') {
        if (VIEW === 'list' || VIEW === 'dash') {
          if (typeof loadRequests === 'function') {
            loadRequests();
          }
        }
        // اگر جزئیات یک درخواست باز است و همان تغییر کرده، دوباره باز کن
        if (VIEW === 'list' && typeof CURRENT_REQUESTS !== 'undefined') {
          const openSheet = document.getElementById('sheet');
          if (openSheet && openSheet.classList.contains('show')) {
            const sheetTitle = document.getElementById('sheetTitle')?.textContent || '';
            if (e.record && e.record.tagNo && sheetTitle.includes(e.record.tagNo)) {
              if (typeof openDetail === 'function') setTimeout(() => openDetail(e.record.id), 300);
            }
          }
        }
      }
    });
    console.log('[REQ-RT] Subscribed to repair_requests');
  } catch (err) {
    console.error('[REQ-RT] Error:', err);
  }
}

function stopRequestsRealtime() {
  try {
    pb.collection('repair_requests').unsubscribe('*');
    console.log('[REQ-RT] Unsubscribed');
  } catch (err) {}
}

window.startRequestsRealtime = startRequestsRealtime;
window.stopRequestsRealtime = stopRequestsRealtime;

// ===== Polling برای repair_requests (هر 10 ثانیه) =====
let REQ_POLL_INTERVAL = null;
let REQ_LAST_UPDATE = null;
let REQ_LAST_COUNT = -1;

function startRequestsPolling() {
  if (REQ_POLL_INTERVAL) clearInterval(REQ_POLL_INTERVAL);
  REQ_LAST_UPDATE = null;
  REQ_LAST_COUNT = -1;
  
  REQ_POLL_INTERVAL = setInterval(async () => {
    try {
      const res = await pb.collection('repair_requests').getList(1, 1, {
        sort: '-updated',
        fields: 'id,updated,status',
        requestKey: 'poll_' + Date.now() + '_' + Math.random()
      });
      const total = res.totalItems;
      const latest = res.items[0];
      const latestKey = latest ? (latest.id + '_' + latest.updated + '_' + latest.status) : 'empty';
      
      // فقط چاپ کن برای دیباگ
      console.log('[REQ-POLL] Check:', latestKey, '| Prev:', REQ_LAST_UPDATE, '| Total:', total);
      
      if (REQ_LAST_UPDATE !== null && (latestKey !== REQ_LAST_UPDATE || total !== REQ_LAST_COUNT)) {
        console.log('[REQ-POLL] ✅ Change detected — refreshing');
        if (typeof loadRequests === 'function') {
          await loadRequests();
        }
      }
      
      REQ_LAST_UPDATE = latestKey;
      REQ_LAST_COUNT = total;
    } catch (err) {
      console.error('[REQ-POLL] Error:', err);
    }
  }, 10000);
  
  console.log('[REQ-POLL] Started (10s)');
}

function stopRequestsPolling() {
  if (REQ_POLL_INTERVAL) {
    clearInterval(REQ_POLL_INTERVAL);
    REQ_POLL_INTERVAL = null;
  }
}

window.startRequestsPolling = startRequestsPolling;
window.stopRequestsPolling = stopRequestsPolling;
// ===== Export =====
window.refreshNotifications = refreshNotifications;
window.startNotifPolling = startNotifPolling;
window.stopNotifPolling = stopNotifPolling;
window.markAllRead = markAllRead;
window.openNotifDetail = openNotifDetail;
// ===== viewNotif Override (Global) =====
window.viewNotif = async function() {
  var host = document.getElementById('viewInner');
  if (!host) return;
  host.innerHTML = '<div style="text-align:center;padding:40px;color:#94A3B8">در حال بارگذاری اعلان‌ها...</div>';
  
  try {
    var notifs = await pb.collection('notifications').getList(1, 100, {
      sort: '-created',
      requestKey: 'notif_' + Date.now()
    });
    
    if (!notifs.items.length) {
      host.innerHTML = '<div class="empty-state"><div class="es-ico">🔔</div><h4>اعلانی نیست</h4><p>اعلان‌ها هنگام تغییر وضعیت درخواست‌ها اینجا نمایش داده می‌شوند</p></div>';
      return;
    }
    
    var typeIcons = {
      'create': '🚨', 'update': '🔄', 'assign': '👤',
      'start': '🔧', 'finish': '✅', 'verify': '🔍',
      'deliver': '📦', 'cancel': '❌', 'note': '📝',
      'accept': '🚀', 'close': '🎉'
    };
    
    var readBy = USER ? USER.id : '';
    var itemsHTML = notifs.items.map(function(n) {
      var isRead = (n.readBy || []).indexOf(readBy) >= 0;
      var icon = typeIcons[n.type] || '🔔';
      var d = new Date(n.created);
      var timeAgo = d.toLocaleString('fa-IR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
      var prioCls = n.priority === 'urgent' ? 'notif-urgent' : n.priority === 'high' ? 'notif-high' : '';
      var readCls = isRead ? 'notif-read' : 'notif-unread';
      
      return '<div class="notif-item ' + prioCls + ' ' + readCls + '" onclick="window.markNotifRead(\'' + n.id + '\')" style="background:#fff;border-radius:12px;padding:12px;margin-bottom:8px;display:flex;gap:12px;cursor:pointer;border:1px solid #E2E8F0;border-' + (isRead ? 'right' : 'right:4px solid #C8102E;border-') + 'right:4px solid ' + (isRead ? '#E2E8F0' : '#C8102E') + '">' +
        '<div style="width:40px;height:40px;border-radius:10px;background:#F1F5F9;display:grid;place-items:center;font-size:20px;flex-shrink:0">' + icon + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:13px;font-weight:800;color:#0F172A;margin-bottom:3px">' + (n.title || 'اعلان') + '</div>' +
          '<div style="font-size:11.5px;color:#475569;line-height:1.5;margin-bottom:6px">' + (n.message || '') + '</div>' +
          '<div style="display:flex;align-items:center;gap:8px;font-size:10px;color:#94A3B8">' +
            (n.tagNo ? '<span style="background:#1E5A9E;color:#fff;padding:2px 7px;border-radius:5px;font-weight:800;font-family:monospace">' + n.tagNo + '</span>' : '') +
            '<span>' + timeAgo + '</span>' +
            (!isRead ? '<span style="width:8px;height:8px;border-radius:50%;background:#C8102E;margin-inline-start:auto"></span>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    
    host.innerHTML = '<div style="padding:4px">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">' +
        '<h3 style="font-size:15px;font-weight:800">🔔 اعلان‌ها (' + notifs.items.length + ')</h3>' +
        '<button onclick="window.markAllRead()" style="font-size:11px;color:#C8102E;font-weight:800;background:none;border:none;cursor:pointer;font-family:inherit">علامت‌گذاری همه</button>' +
      '</div>' +
      itemsHTML +
    '</div>';
  } catch(err) {
    console.error('[NOTIF] Error:', err);
    host.innerHTML = '<div class="empty-state"><div class="es-ico">❌</div><h4>خطا در بارگذاری</h4><p>' + err.message + '</p></div>';
  }
};

// علامت‌گذاری خوانده‌شده
window.markNotifRead = async function(id) {
  try {
    var n = await pb.collection('notifications').getOne(id);
    var readBy = n.readBy || [];
    if (USER && readBy.indexOf(USER.id) < 0) {
      readBy.push(USER.id);
      await pb.collection('notifications').update(id, { readBy: readBy });
    }
  } catch(e) { console.warn('Mark read error:', e); }
};

window.markAllRead = async function() {
  try {
    var notifs = await pb.collection('notifications').getFullList({ requestKey: 'ma_' + Date.now() });
    for (var i = 0; i < notifs.length; i++) {
      var n = notifs[i];
      var readBy = n.readBy || [];
      if (USER && readBy.indexOf(USER.id) < 0) {
        readBy.push(USER.id);
        try { await pb.collection('notifications').update(n.id, { readBy: readBy }); } catch(e) {}
      }
    }
    if (typeof toast === 'function') toast('✅ همه اعلان‌ها خوانده شد', 'ok');
    window.viewNotif();
  } catch(e) { console.warn('Mark all error:', e); }
};

console.log('[NOTIF] viewNotif overridden');