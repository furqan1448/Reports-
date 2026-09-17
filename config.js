// ============================================================
// إعدادات عامة لنظام توثيق الأداء
// ============================================================

// رابط تطبيق الويب الخاص بـ Google Apps Script (Code.gs)
// بعد نشر Code.gs كـ Web App، الصقي الرابط هنا
const API_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";

// ------------------------------------------------------------
// نداء عام للـ API مع إعادة محاولة تلقائية عند الفشل
// ------------------------------------------------------------
async function callApi(action, payload, { retries = 2, timeoutMs = 12000 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ action, ...payload }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "حدث خطأ غير متوقع");
      return data;
    } catch (err) {
      clearTimeout(timer);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 800));
    }
  }
}

// ------------------------------------------------------------
// إظهار/إخفاء كلمة المرور
// ------------------------------------------------------------
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "🙈";
  } else {
    input.type = "password";
    btn.textContent = "👁️";
  }
}

// ------------------------------------------------------------
// حالة تحميل على الأزرار
// ------------------------------------------------------------
function setBtnBusy(btn, busy, busyText) {
  if (busy) {
    btn.dataset.originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `${busyText || "جارِ الحفظ..."}<span class="spinner"></span>`;
  } else {
    btn.disabled = false;
    if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
  }
}

// ------------------------------------------------------------
// عرض رسالة حالة (نجاح/خطأ)
// ------------------------------------------------------------
function showStatus(el, message, isError) {
  el.textContent = message;
  el.className = "status-msg " + (isError ? "err" : "ok");
  el.style.display = "block";
  if (!isError) {
    setTimeout(() => { el.style.display = "none"; }, 4000);
  }
}

// ------------------------------------------------------------
// جلسة المستخدم (تخزين محلي بسيط)
// ------------------------------------------------------------
const SESSION_KEY = "taqrir_ada_session";

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}
function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch (e) {
    return null;
  }
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
function requireSession(redirectTo) {
  const user = getSession();
  if (!user) {
    window.location.href = redirectTo || "index.html";
    return null;
  }
  return user;
}
function logout() {
  clearSession();
  window.location.href = "index.html";
}
