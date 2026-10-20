/* ============================================
   BASPAR PLASTICS - Push Client
   درخواست اجازه + ذخیره Subscription
   ============================================ */

const PUSH_SERVER = window.location.origin + '/push';
// اگر روی HTTPS هستیم، Push Server هم روی همان دامنه است ولی پورت 3000
// اگر Nginx پروکسی کند، مسیر /push/ می‌شود

let PUSH_SUBSCRIPTION = null;

// ===== ثبت Service Worker =====
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PUSH] Service Worker پشتیبانی نمی‌شود');
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[PUSH] Service Worker ثبت شد:', reg.scope);
    return reg;
  } catch (err) {
    console.error('[PUSH] خطا در ثبت SW:', err);
    return null;
  }
}

// ===== درخواست اجازه =====
async function requestPushPermission() {
  if (!('Notification' in window)) {
    toast('❌ مرورگر شما از نوتیفیکیشن پشتیبانی نمی‌کند', 'err');
    return false;
  }
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') {
    toast('❌ نوتیفیکیشن بلاک شده. از تنظیمات مرورگر فعال کنید', 'err');
    return false;
  }
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

// ===== فعال‌سازی Push =====
async function enablePushNotifications() {
  try {
    // ۱. اجازه
    const granted = await requestPushPermission();
    if (!granted) {
      toast('❌ اجازه نوتیفیکیشن داده نشد', 'err');
      return false;
    }

    // ۲. ثبت SW
    const reg = await registerServiceWorker();
    if (!reg) {
      toast('❌ ثبت Service Worker شکست خورد', 'err');
      return false;
    }
    await navigator.serviceWorker.ready;

    // ۳. گرفتن VAPID key
    const vapidRes = await fetch(`${PUSH_SERVER}/vapid-public-key`);
    const vapidData = await vapidRes.json();
    const publicKey = vapidData.publicKey;

    // ۴. Subscribe
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    PUSH_SUBSCRIPTION = subscription;

    // ۵. ذخیره در Push Server
    await fetch(`${PUSH_SERVER}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userId: USER?.id || '',
        userEmail: USER?.email || '',
        userRole: USER?.role || ''
      })
    });

    console.log('[PUSH] ✅ فعال شد');
    toast('✅ نوتیفیکیشن فعال شد', 'ok');

    // ذخیره وضعیت در localStorage
    localStorage.setItem('push_enabled', '1');
    updatePushButton();
    return true;
  } catch (err) {
    console.error('[PUSH] خطا:', err);
    toast('❌ خطا در فعال‌سازی: ' + err.message, 'err');
    return false;
  }
}

// ===== غیرفعال‌سازی =====
async function disablePushNotifications() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch(`${PUSH_SERVER}/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint })
      });
      await sub.unsubscribe();
    }
    localStorage.removeItem('push_enabled');
    updatePushButton();
    toast('🔕 نوتیفیکیشن غیرفعال شد', 'ok');
  } catch (err) {
    console.error('[PUSH] خطا:', err);
  }
}

// ===== بررسی وضعیت =====
async function checkPushStatus() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch (err) {
    return false;
  }
}

// ===== آپدیت دکمه =====
async function updatePushButton() {
  const btn = document.getElementById('pushToggleBtn');
  if (!btn) return;
  const enabled = await checkPushStatus();
  if (enabled) {
    btn.innerHTML = '🔔';
    btn.title = 'نوتیفیکیشن فعال';
    btn.style.background = 'rgba(22,163,74,.25)';
  } else {
    btn.innerHTML = '🔕';
    btn.title = 'فعال‌سازی نوتیفیکیشن';
    btn.style.background = 'rgba(255,255,255,.12)';
  }
}

// ===== Helpers =====
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}


// ===== Re-subscribe خودکار =====
async function autoReSubscribe() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission !== 'granted') return;
    
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    
    if (!sub) {
      console.log('[PUSH] No subscription, creating...');
      if (typeof enablePushNotifications === 'function') await enablePushNotifications();
      return;
    }
    
    const server = window.location.origin + '/push';
    const res = await fetch(server + '/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        userId: (typeof USER !== 'undefined' && USER) ? USER.id : '',
        userEmail: (typeof USER !== 'undefined' && USER) ? USER.email : '',
        userRole: (typeof USER !== 'undefined' && USER) ? USER.role : ''
      })
    });
    const result = await res.json();
    console.log('[PUSH] Auto re-registered:', result);
  } catch (err) {
    console.error('[PUSH] Auto re-subscribe error:', err);
  }
}

window.autoReSubscribe = autoReSubscribe;
// ===== Export =====
window.enablePushNotifications = enablePushNotifications;
window.disablePushNotifications = disablePushNotifications;
window.updatePushButton = updatePushButton;
window.checkPushStatus = checkPushStatus;
window.registerServiceWorker = registerServiceWorker;