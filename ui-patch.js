// ===== UI CONTROLLER: Prevent Auto-Redirect & Add Buttons =====
(function() {
  if (localStorage.getItem('sb-auth') || localStorage.getItem('pocketbase_auth')) {
    window.CURRENT_MODE = null;
    localStorage.removeItem('CURRENT_MODE');
    localStorage.removeItem('baspar_mode');
  }

  window.addEventListener('DOMContentLoaded', function() {
    var style = document.createElement('style');
    style.textContent = `
      .ui-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 18px; border-radius: 12px; font-family: inherit; font-weight: 700; font-size: 13.5px; cursor: pointer; transition: all 0.2s ease; border: 1px solid transparent; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
      .ui-btn-logout { background: #FFF1F2; color: #E11D48; border-color: #FECDD3; position: fixed; top: 20px; left: 20px; z-index: 9999; }
      .ui-btn-logout:hover { background: #FFE4E6; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(225,29,72,0.15); }
      .ui-btn-back { background: rgba(255, 255, 255, 0.15); color: #ffffff; border-color: rgba(255, 255, 255, 0.25); padding: 8px 14px; font-size: 12.5px; margin-left: 10px; border-radius: 10px; box-shadow: none; }
      .ui-btn-back:hover { background: rgba(255, 255, 255, 0.25); }
      .ui-svg { width: 18px; height: 18px; }
      #headerBackBtn { display: none !important; }
    `;
    document.head.appendChild(style);

    var logoutBtn = document.createElement('button');
    logoutBtn.className = 'ui-btn ui-btn-logout';
    logoutBtn.innerHTML = `<svg class="ui-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg><span>خروج</span>`;
    logoutBtn.onclick = function() {
      if(confirm('از حساب کاربری خارج می‌شوید؟')) {
        if (window.pb && window.pb.authStore) window.pb.authStore.clear();
        localStorage.removeItem('sb-auth');
        localStorage.removeItem('CURRENT_MODE');
        localStorage.removeItem('baspar_mode');
        location.reload();
      }
    };

    var backBtn = document.createElement('button');
    backBtn.className = 'ui-btn ui-btn-back';
    backBtn.innerHTML = `<svg class="ui-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg><span>بازگشت</span>`;
    backBtn.onclick = function() {
       if (typeof showModeSelector === 'function') {
         window.CURRENT_MODE = null;
         localStorage.removeItem('CURRENT_MODE');
         localStorage.removeItem('baspar_mode');
         showModeSelector();
       } else {
         document.body.classList.remove('mode-repair', 'mode-production', 'mode-quality');
         document.body.classList.add('mode-selector-active');
       }
    };

    function updateUI() {
      var loginScreen = document.getElementById('loginScreen');
      var isLoggedIn = !loginScreen || loginScreen.style.display === 'none';
      
      if (!isLoggedIn) {
        if (logoutBtn.parentNode) logoutBtn.parentNode.removeChild(logoutBtn);
        return;
      }

      var isModeSelector = document.body.classList.contains('mode-selector-active');
      var isSpecificMode = document.body.classList.contains('mode-repair') || 
                           document.body.classList.contains('mode-production') || 
                           document.body.classList.contains('mode-quality');

      if (isModeSelector) {
        if (!logoutBtn.parentNode) document.body.appendChild(logoutBtn);
      } else {
        if (logoutBtn.parentNode) logoutBtn.parentNode.removeChild(logoutBtn);
      }

      var header = document.querySelector('.app-header');
      if (header) {
        if (isSpecificMode && !header.querySelector('.ui-btn-back')) {
          var logo = header.querySelector('.logo-mini');
          if (logo) header.insertBefore(backBtn, logo);
          else header.insertBefore(backBtn, header.firstChild);
        } else if (!isSpecificMode) {
          var existingBack = header.querySelector('.ui-btn-back');
          if (existingBack) existingBack.parentNode.removeChild(existingBack);
        }
      }
    }

    var observer = new MutationObserver(function() { setTimeout(updateUI, 50); });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    var loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
      var loginObserver = new MutationObserver(function() { setTimeout(updateUI, 50); });
      loginObserver.observe(loginScreen, { attributes: true, attributeFilter: ['style'] });
    }
    
    setTimeout(updateUI, 200);
  });
})();