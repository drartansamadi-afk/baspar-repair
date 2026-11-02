// ===== UI PATCH: Fix Header Buttons Dynamically =====
(function() {
  function addCustomButtons() {
    // اگر در صفحه لاگین هستیم، هیچ دکمه‌ای اضافه نکن
    var loginScreen = document.getElementById('loginScreen');
    if (loginScreen && loginScreen.style.display !== 'none') return;

    var header = document.querySelector('.app-header');
    if (!header) return;

    var isSpecificMode = document.body.classList.contains('mode-repair') || 
                         document.body.classList.contains('mode-production') || 
                         document.body.classList.contains('mode-quality');

    // 1. مدیریت دکمه بازگشت (فقط در تب‌های داخلی)
    var existingBack = document.getElementById('customBackBtn');
    if (isSpecificMode && !existingBack) {
      var backBtn = document.createElement('button');
      backBtn.id = 'customBackBtn';
      backBtn.className = 'hdr-btn'; // استفاده از استایل اصلی دکمه‌های هدر
      backBtn.innerHTML = '⟵ بازگشت';
      backBtn.style.width = 'auto';
      backBtn.style.padding = '0 12px';
      backBtn.style.fontSize = '13px';
      backBtn.onclick = function() {
         localStorage.removeItem('CURRENT_MODE');
         if (typeof showModeSelector === 'function') showModeSelector();
      };
      var logo = header.querySelector('.logo-mini');
      if (logo) header.insertBefore(backBtn, logo);
    } else if (!isSpecificMode && existingBack) {
      existingBack.remove();
    }
  }

  // نظارت بر تغییرات صفحه و تزریق دکمه‌ها
  window.addEventListener('DOMContentLoaded', function() {
    var observer = new MutationObserver(function() {
      setTimeout(addCustomButtons, 100);
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    setTimeout(addCustomButtons, 200);
  });
})();