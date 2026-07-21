// Shared layer: namespace, storage helpers, constants, toast, and small
// pure utilities reused by several feature modules. Loaded first.
window.App = window.App || {};

App.STORAGE_KEYS = {
  bg: "bg",
  engine: "engine",
  bookmarks: "bookmarks",
  geo: "geo",
  hotEnabled: "hotsearchEnabled",
  hot: "hotsearch_v4",
  weather: "weather_v1",
};

App.HOT_CACHE_MS = 60 * 60 * 1000;
App.WEATHER_CACHE_MS = 60 * 60 * 1000;

App.load = function (key, fallback) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (r) => {
      const v = r[key];
      if (v === undefined || v === null) resolve(fallback);
      else { try { resolve(typeof v === "string" ? v : v); } catch { resolve(fallback); } }
    });
  });
};
App.save = function (key, val) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: val }, () => {
      if (chrome.runtime.lastError) { reject(chrome.runtime.lastError); return; }
      resolve();
    });
  });
};

let _toastTimer;
App.toast = function (msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.remove("closing"));
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    el.classList.add("closing");
    setTimeout(() => { el.hidden = true; }, 350);
  }, 2600);
};

App.isHttpUrl = function (value) {
  const v = (value || "").trim();
  if (!v) return false;
  const looksLikeHost = /[./:]/.test(v) || /^localhost$/i.test(v);
  if (!looksLikeHost) return false;
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return ["http:", "https:"].includes(url.protocol) && !!url.hostname;
  } catch { return false; }
};

// Same-tab navigation with no referrer.
App.navigate = function (url) {
  const a = document.createElement("a");
  a.href = url;
  a.referrerPolicy = "no-referrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
};
