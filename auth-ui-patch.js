// ===== AUTH UI PATCH: Strict 3-Step Screen Logic =====
(function() {
  window.addEventListener('DOMContentLoaded', function() {
    // تزریق استایل دکمه‌ها
    var style = document.createElement('style');
    style.textContent = `
      .global-logout { position: fixed; top: 20px; left: 20px; z-index: 9999; background: #FFF1F2; color: #E11D48; border: 1px solid #FECDD3; padding: 8px 16px; border-radius: 12px; font-family: inherit; font-weight: bold; cursor: pointer; display: none; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transition: all 0.2s; }
      .global-logout:hover { transform: translateY(-2px); background: #FFE4E6; }
      .header-back { background: rgba(255,255,255,0.15); color: #fff; border: 1px solid rgba(255,255,255,0.25); padding: 6px 12px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: bold; cursor: pointer; margin-left: 10px; display: none; }
      .header-back:hover { background: rgba(255,255,255,0.25); }
    `;
    document.head.appendChild(style);

    // ساخت دکمه‌ها
    var logoutBtn = document.createElement('button');
    logoutBtn.className = 'global-logout';
    logoutBtn.innerHTML = '⏻ خروج';
    logoutBtn.onclick = function() {
      if(confirm('از حساب کاربری خارج می‌شوید؟')) {
        if (window.pb && window.pb.authStore) window.pb.authStore.clear();
        localStorage.clear();
        location.reload();
      }
    };
    document.body.appendChild(logoutBtn);

    var backBtn = document.createElement('button');
    backBtn.className = 'header-back';
    backBtn.innerHTML = '⟵ بازگشت';
    backBtn.onclick = function() {
      localStorage.removeItem('CURRENT_MODE');
      localStorage.removeItem('baspar_mode');
      window.CURRENT_MODE = null;
      if (typeof showModeSelector === 'function') showModeSelector();
    };

    // منطق دقیق نمایش دکمه‌ها بر اساس سه مرحله
    function updateUI() {
      // 1. بررسی اینکه آیا کاربر لاگین کرده است یا خیر
      var loginScreen = document.getElementById('loginScreen');
      var isLoggedIn = loginScreen && loginScreen.style.display === 'none';
      
      // اگر لاگین نکرده باشد، هیچ دکمه‌ای نمایش داده نمی‌شود (مرحله 1: صفحه لاگین)
      if (!isLoggedIn) {
        logoutBtn.style.display = 'none';
        if(backBtn.parentNode) backBtn.parentNode.removeChild(backBtn);
        return;
      }

      // 2. بررسی اینکه در کدام صفحه هستیم
      var isSelector = document.body.classList.contains('mode-selector-active');
      var isInsideTab = document.body.classList.contains('mode-repair') || 
                        document.body.classList.contains('mode-production') || 
                        document.body.classList.contains('mode-quality');

      // مرحله 2: صفحه انتخاب سه تب (فقط دکمه خروج)
      if (isSelector) {
        logoutBtn.style.display = 'block';
        if(backBtn.parentNode) backBtn.parentNode.removeChild(backBtn);
      } 
      // مرحله 3: داخل تب‌ها (فقط دکمه بازگشت در هدر)
      else if (isInsideTab) {
        logoutBtn.style.display = 'none';
        var header = document.querySelector('.app-header');
        if (header && !backBtn.parentNode) {
          var logo = header.querySelector('.logo-mini');
          if (logo) header.insertBefore(backBtn, logo);
          else header.insertBefore(backBtn, header.firstChild);
        }
        backBtn.style.display = 'inline-flex'; // نمایش دکمه
      } else {
        logoutBtn.style.display = 'none';
        if(backBtn.parentNode) backBtn.parentNode.removeChild(backBtn);
      }
    }

    // رصد تغییرات و اجرای مداوم
    var observer = new MutationObserver(function() { setTimeout(updateUI, 50); });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    var loginObserver = new MutationObserver(function() { setTimeout(updateUI, 50); });
    var loginEl = document.getElementById('loginScreen');
    if (loginEl) loginObserver.observe(loginEl, { attributes: true, attributeFilter: ['style', 'class'] });
    
    setTimeout(updateUI, 200);
  });
})();