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
        return App.load(App.STORAGE_KEYS.bg, { type: "solid", value: "#1A1813" }).then(applyBg);
      });

      // Theme toggle
      document.getElementById("theme-toggle").addEventListener("click", async function () {
        const light = this.classList.toggle("on");
        root.setAttribute("data-theme", light ? "light" : "dark");
        if (light) {
          root.style.removeProperty("--bg");
        } else {
          App.load(App.STORAGE_KEYS.bg, { type: "solid", value: "#1A1813" }).then((bg) => applyBg(bg));
        }
        await App.save(THEME_KEY, light ? "light" : "dark");
      });

      function applyBg(bg) {
        if (!bg) return;
        if (root.getAttribute("data-theme") !== "light") {
          root.style.setProperty("--bg", bg.value);
        }
        document.querySelectorAll(".swatch").forEach((s) =>
          s.classList.toggle("active", s.dataset.bg === bg.value));
      }

      // Swatches click
      document.getElementById("swatches").addEventListener("click", (e) => {
        const s = e.target.closest(".swatch"); if (!s) return;
        const bg = { type: "solid", value: s.dataset.bg };
        App.save(App.STORAGE_KEYS.bg, bg);
        applyBg(bg);
      });

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
