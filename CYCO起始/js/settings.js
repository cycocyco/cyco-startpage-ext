// Settings module — gear panel, background swatches, light/dark theme, boot wiring.
(function () {
  window.App = window.App || {};

  App.settings = {
    init() {
      const gear = document.getElementById("gear-btn");
      const panel = document.getElementById("settings");
      gear.addEventListener("click", () => panel.classList.toggle("open"));
      document.addEventListener("click", (e) => {
        if (!panel.contains(e.target) && !gear.contains(e.target)) panel.classList.remove("open");
      });

      const THEME_KEY = "theme";
      const root = document.documentElement;

      // Boot: apply saved theme first, then background
      App.load(THEME_KEY, "dark").then((t) => {
        const light = t === "light";
        root.setAttribute("data-theme", light ? "light" : "dark");
        document.getElementById("theme-toggle").classList.toggle("on", light);
        return initBg();
      });

      // Theme toggle
      document.getElementById("theme-toggle").addEventListener("click", async function () {
        const light = this.classList.toggle("on");
        root.setAttribute("data-theme", light ? "light" : "dark");
        if (light) {
          root.style.removeProperty("--bg");
        } else {
          App.load(App.STORAGE_KEYS.bg, null).then((bg) => applyBg(bg));
        }
        await App.save(THEME_KEY, light ? "light" : "dark");
      });

      function applyBg(bg) {
        if (!bg || root.getAttribute("data-theme") === "light") {
          root.style.removeProperty("--bg");
          return;
        }
        root.style.setProperty("--bg", bg.value);
        document.getElementById("color-picker").value = bg.value;
      }

      function initBg() {
        return App.load(App.STORAGE_KEYS.bg, null).then((bg) => {
          if (bg && (bg.value === "#1A1813" || bg.value === "#221C16" || bg.value === "#2A211B")) {
            chrome.storage.local.remove(App.STORAGE_KEYS.bg);
            document.getElementById("color-picker").value = "#0c0d12";
            return;
          }
          if (bg) {
            applyBg(bg);
          } else {
            document.getElementById("color-picker").value = "#0c0d12";
          }
        });
      }

      // Color picker
      document.getElementById("color-picker").addEventListener("input", (e) => {
        const bg = { type: "solid", value: e.target.value };
        App.save(App.STORAGE_KEYS.bg, bg);
        applyBg(bg);
      });

      // Favicon refresh
      document.getElementById("refresh-favicons").addEventListener("click", () => {
        App.bookmarks.refresh();
      });
    },
  };

  // ---------- Boot ----------
  document.addEventListener("DOMContentLoaded", () => {
    // Clear stale hot cache
    chrome.storage.local.remove(["hotsearch", "hotsearch_v2", "hotsearch_v3"], () => {});
    App.clock.init();
    App.search.init();
    App.bookmarks.render();
    App.bookmarks.initToggle();
    App.bookmarks.initModal();
    App.weather.init();
    App.weatherWeekly.init();
    App.hot.init();
    App.settings.init();
  });
})();
