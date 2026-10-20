// ============================================
// BASPAR PLASTICS - Mode Selector (Body Class v3)
// ============================================

window.CURRENT_MODE = null;

// ===== تابع اصلی مدیریت هدر با body class =====
window.applyModeClass = function() {
  var mode = window.CURRENT_MODE;
  var body = document.body;
  if (!body) return;

  // حذف کلاس‌های قبلی
  body.classList.remove('mode-repair', 'mode-production', 'mode-quality', 'mode-selector-active', 'mode-not-repair');

  // اضافه کردن کلاس جدید
  if (mode === 'repair') {
    body.classList.add('mode-repair');
  } else if (mode === 'production') {
    body.classList.add('mode-production');
  } else if (mode === 'quality') {
    body.classList.add('mode-quality');
  } else {
    body.classList.add('mode-selector-active', 'mode-not-repair');
  }

  // دکمه بازگشت هدر - در هر ۳ حالت نمایش داده شود (تعمیرات، تولید، کیفیت)
    // دکمه بازگشت هدر - در هر ۳ حالت نمایش داده شود
  var backBtn = document.getElementById('headerBackBtn');
  if (backBtn) {
    backBtn.style.display = (mode === 'repair' || mode === 'production' || mode === 'quality') ? 'inline-flex' : 'none';
  }
  
  // دکمه خروج - در هر ۳ حالت نمایش داده شود
  var logoutBtn = document.getElementById('headerLogoutBtn');
  if (logoutBtn) {
    logoutBtn.style.display = (mode === 'repair' || mode === 'production' || mode === 'quality') ? 'inline-flex' : 'none';
  }

  console.log('[MODE] Class applied:', mode || 'selector');

  if (typeof window.updateHeaderText === 'function') window.updateHeaderText();
  console.log('[MODE] Class applied:', mode || 'selector');
};

window.updateNavForMode = function() {
  var mode = window.CURRENT_MODE;

  // نوار پایین
  document.querySelectorAll('.nav-item').forEach(function(n) {
    var view = n.dataset.view;
    var show = false;
    if (mode === 'repair') {
      if (['new', 'list', 'dash', 'notif'].indexOf(view) >= 0) show = true;
    } else if (mode === 'production') {
      if (view === 'production') show = true;
    } else if (mode === 'quality') {
      if (view === 'quality') show = true;
    }
    n.style.display = show ? '' : 'none';
  });

  var bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) bottomNav.style.display = mode ? '' : 'none';

  // اعمال کلاس body
  window.applyModeClass();
};

// ===== دکمه بازگشت در هدر =====


// ===== حذف دکمه‌های شناور =====
function removeFloatingButtons() {
  ['globalBackBtn', 'globalExportBtn'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.remove();
  });
}

// ===== صفحه انتخاب حالت =====
window.showModeSelector = function() {
  var host = document.getElementById('viewInner');
  if (!host) return;

  // اعمال کلاس بدنه
  window.CURRENT_MODE = null;
  window.applyModeClass();

  // مخفی کردن مستقیم در صفحه ورودی
  var bottomNav = document.querySelector('.bottom-nav') || document.querySelector('nav.bottom-nav');
  if (bottomNav) bottomNav.style.display = 'none';
  
  var hdr = document.querySelector('.app-header') || document.querySelector('.hdr') || document.querySelector('header');
  if (hdr) hdr.style.display = 'none';
  
  var backBtn = document.getElementById('headerBackBtn');
  if (backBtn) backBtn.style.display = 'none';

  var userName = USER ? USER.name : 'کاربر';
  var userRole = USER ? (USER.role === 'admin' ? 'مدیر سیستم' : USER.role === 'operator' ? 'اپراتور' : USER.role === 'technician' ? 'تکنسین' : USER.role === 'supervisor' ? 'سرپرست' : USER.role) : '';

  host.innerHTML = `
    <style>
      .ms-root { min-height:100vh; background:#F8FAFC; display:flex; flex-direction:column; font-family:'Vazirmatn',Tahoma,sans-serif; margin:-16px; padding:0; }
      .ms-topbar { background:#fff; border-bottom:1px solid #E2E8F0; padding:16px 24px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10; }
      .ms-brand { display:flex; align-items:center; gap:12px; }
      .ms-brand-mark { width:40px; height:40px; background:#003D7A; border-radius:10px; display:grid; place-items:center; color:#fff; font-weight:900; font-size:16px; }
      .ms-brand-text { display:flex; flex-direction:column; line-height:1.2; }
      .ms-brand-title { font-size:15px; font-weight:900; color:#0F172A; }
      .ms-brand-sub { font-size:10.5px; color:#64748B; font-weight:600; margin-top:2px; }
      .ms-user-pill { display:flex; align-items:center; gap:8px; background:#F1F5F9; border-radius:100px; padding:8px 14px; font-size:12px; font-weight:700; color:#334155; }
      .ms-user-pill .avatar { width:26px; height:26px; background:#003D7A; color:#fff; border-radius:50%; display:grid; place-items:center; font-size:11px; font-weight:900; }
      .ms-main { flex:1; display:flex; flex-direction:column; align-items:center; padding:40px 20px 40px; }
      .ms-hero { text-align:center; margin-bottom:40px; max-width:540px; }
      .ms-hero h1 { font-size:28px; font-weight:900; color:#0F172A; letter-spacing:-.5px; margin-bottom:10px; }
      .ms-hero p { font-size:14px; color:#64748B; line-height:1.6; }
      .ms-hero .accent { width:60px; height:4px; background:#003D7A; border-radius:100px; margin:0 auto 20px; }
      .ms-cards { display:grid; grid-template-columns:1fr; gap:16px; width:100%; max-width:560px; }
      @media (min-width: 640px) { .ms-cards { grid-template-columns:1fr 1fr 1fr; } }
      .ms-card { background:#fff; border:1px solid #E2E8F0; border-radius:16px; padding:28px 20px; cursor:pointer; display:flex; flex-direction:column; align-items:center; text-align:center; gap:16px; transition:all .25s cubic-bezier(.2,.9,.3,1.3); position:relative; overflow:hidden; }
      .ms-card::after { content:''; position:absolute; top:0; right:0; left:0; height:3px; background:#003D7A; transform:scaleX(0); transform-origin:right; transition:transform .3s; }
      .ms-card:hover { border-color:#003D7A; transform:translateY(-4px); box-shadow:0 12px 32px rgba(0,61,122,.12); }
      .ms-card:hover::after { transform:scaleX(1); }
      .ms-icon-wrap { width:72px; height:72px; border-radius:50%; display:grid; place-items:center; font-size:32px; background:#F1F5F9; transition:all .3s; }
      .ms-card:hover .ms-icon-wrap { background:#003D7A; }
      .ms-card:hover .icon-emoji { filter:brightness(0) invert(1); }
      .ms-card h3 { font-size:16px; font-weight:900; color:#0F172A; }
      .ms-card p { font-size:12px; color:#64748B; line-height:1.6; margin-top:-8px; }
      .ms-card .enter { font-size:11px; font-weight:800; color:#003D7A; opacity:0; transition:opacity .3s; }
      .ms-card:hover .enter { opacity:1; }
      .ms-excel-wrap { width:100%; max-width:560px; margin-top:20px; }
      .ms-excel-btn { width:100%; background:#fff; border:1px dashed #16A34A; color:#16A34A; padding:16px; border-radius:14px; font-family:Vazirmatn,Tahoma,sans-serif; font-weight:900; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; transition:all .2s; }
      .ms-excel-btn:hover { background:#F0FDF4; border-style:solid; }
    </style>
    <div class="ms-root">
      <div class="ms-topbar">
        <div class="ms-brand">
          <div class="ms-brand-mark">BP</div>
          <div class="ms-brand-text">
            <span class="ms-brand-title">BASPAR PLASTICS</span>
            <span class="ms-brand-sub">سیستم مدیریت یکپارچه</span>
          </div>
        </div>
        <div class="ms-user-pill">
          <span class="avatar">${(userName||'?').charAt(0)}</span>
          <span>${userName}</span>
          <span style="color:#94A3B8">·</span>
          <span style="color:#64748B;font-weight:600">${userRole}</span>
        </div>
      </div>
      <div class="ms-main">
        <div class="ms-hero">
          <div class="accent"></div>
          <h1>خوش آمدید</h1>
          <p>برای شروع، بخش مورد نظر خود را انتخاب کنید</p>
        </div>
        <div class="ms-cards">
          <div class="ms-card" onclick="window.selectMode('repair')">
            <div class="ms-icon-wrap"><span class="icon-emoji">🔧</span></div>
            <h3>مدیریت تعمیرات</h3>
            <p>ثبت درخواست تعمیر، پیگیری گردش کار و گزارش‌گیری</p>
            <div class="enter">ورود ←</div>
          </div>
          <div class="ms-card" onclick="window.selectMode('production')">
            <div class="ms-icon-wrap"><span class="icon-emoji">🏭</span></div>
            <h3>مدیریت تولید</h3>
            <p>ثبت آمار روزانه تولید، شیفت‌ها، CT و Cav</p>
            <div class="enter">ورود ←</div>
          </div>
          <div class="ms-card" onclick="window.selectMode('quality')">
            <div class="ms-icon-wrap"><span class="icon-emoji">✅</span></div>
            <h3>کنترل کیفیت</h3>
            <p>ثبت Hold، Destroyed و نسبت‌های کیفیت</p>
            <div class="enter">ورود ←</div>
          </div>
        </div>
        <div class="ms-excel-wrap">
          <button class="ms-excel-btn" onclick="window.exportExcel()">
            <span style="font-size:20px">📥</span>
            <span>دریافت گزارش جامع Excel</span>
          </button>
        </div>
      </div>
    </div>
  `;
};

window.selectMode = function(mode) {
  window.CURRENT_MODE = mode;
  
  // نمایش دوباره نوار پایین و هدر - در هر ۳ حالت
  var bottomNav = document.querySelector('.bottom-nav') || document.querySelector('nav.bottom-nav');
  if (bottomNav) bottomNav.style.display = '';
  
  var hdr = document.querySelector('.app-header') || document.querySelector('.hdr') || document.querySelector('header');
  if (hdr) hdr.style.display = '';
  
  var backBtn = document.getElementById('headerBackBtn');
  if (backBtn) backBtn.style.display = 'inline-flex';
  
  var logoutBtn = document.getElementById('headerLogoutBtn');
  if (logoutBtn) logoutBtn.style.display = 'inline-flex';
  
  updateNavForMode();
  if (mode === 'repair') {
    VIEW = 'new';
    render();
  } else if (mode === 'production') {
    if (typeof window.viewProduction === 'function') {
      window.PQ_MODE = 'list';
      window.viewProduction();
    }
  } else if (mode === 'quality') {
    if (typeof window.viewQuality === 'function') {
      window.PQ_MODE = 'list';
      window.viewQuality();
    }
  }
};

window.backToModeSelector = function() {
  window.CURRENT_MODE = null;
  window.PQ_MODE = 'list';
  showModeSelector();
};

var _origRenderMS = window.render;
window.render = function() {
  if (USER && !window.CURRENT_MODE) {
    showModeSelector();
    return;
  }
  if (window.CURRENT_MODE === 'production' && VIEW !== 'production') {
    if (typeof window.viewProduction === 'function') {
      window.PQ_MODE = 'list';
      window.viewProduction();
      return;
    }
  }
  if (window.CURRENT_MODE === 'quality' && VIEW !== 'quality') {
    if (typeof window.viewQuality === 'function') {
      window.PQ_MODE = 'list';
      window.viewQuality();
      return;
    }
  }
  if (_origRenderMS) _origRenderMS();
};

// ===== راه‌اندازی =====
removeFloatingButtons();
setTimeout(injectBackButton, 500);
setTimeout(injectBackButton, 1500);
setTimeout(injectBackButton, 3000);

setTimeout(function() {
  document.querySelectorAll('.nav-item').forEach(function(n) {
    n.onclick = function() {
      VIEW = n.dataset.view;
      if (typeof vibrate === 'function') vibrate(6);
      if (VIEW === 'production' && typeof window.viewProduction === 'function') {
        window.PQ_MODE = 'list';
        window.viewProduction();
      } else if (VIEW === 'quality' && typeof window.viewQuality === 'function') {
        window.PQ_MODE = 'list';
        window.viewQuality();
      } else {
        render();
        if (VIEW === 'list' && typeof loadRequests === 'function') loadRequests();
      }
    };
  });
}, 800);

// اعمال اولیه class
setTimeout(window.applyModeClass, 200);

console.log('[MODE] Body Class v3 loaded');
// ===== مخفی/نمایش متن هدر =====
window.updateHeaderText = function() {
  var mode = window.CURRENT_MODE;
  var titleWrap = document.querySelector('.title-wrap') || document.querySelector('.app-header .title-wrap');
  var notifBtn = document.getElementById('notifBtn');
  var pushBtn = document.getElementById('pushToggleBtn');
  var backBtn = document.getElementById('headerBackBtn');
  
  if (mode === 'repair') {
    if (titleWrap) titleWrap.style.display = '';
    if (notifBtn) notifBtn.style.display = '';
    if (pushBtn) pushBtn.style.display = '';
    if (backBtn) backBtn.style.display = 'inline-flex';
  } else if (mode === 'production' || mode === 'quality') {
    if (titleWrap) titleWrap.style.display = 'none';
    if (notifBtn) notifBtn.style.display = 'none';
    if (pushBtn) pushBtn.style.display = 'none';
    if (backBtn) backBtn.style.display = 'inline-flex';
  } else {
    // selector
    if (titleWrap) titleWrap.style.display = 'none';
    if (notifBtn) notifBtn.style.display = 'none';
    if (pushBtn) pushBtn.style.display = 'none';
    if (backBtn) backBtn.style.display = 'none';
  }
};
function injectBackButton() {
  var old = document.getElementById('headerBackBtn');
  if (old) old.remove();

  var hdr = document.querySelector('.app-header') || document.querySelector('.hdr') || document.querySelector('header');
  if (!hdr) return;

  var btn = document.createElement('button');
  btn.id = 'headerBackBtn';
  btn.type = 'button';
  btn.title = 'بازگشت به حالت‌ها';
  btn.className = 'hdr-btn';
  btn.style.cssText = 'display:none';
  btn.onclick = function(e) {
    e.preventDefault();
    e.stopPropagation();
    window.backToModeSelector();
  };

  // درج در ابتدای هدر (سمت چپ در RTL)
  hdr.insertBefore(btn, hdr.firstChild);

  // اعمال آیکون‌ها
  if (typeof window.applyHeaderIcons === 'function') {
    setTimeout(window.applyHeaderIcons, 100);
  }
}