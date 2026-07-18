// Weekly weather module — a self-contained 7-day forecast card pinned to the
// top of the viewport. Does NOT touch the original weather module.
// A triangle toggle lives in the weather row; clicking anywhere outside the
// card (including bare background) collapses it back.
(function () {
  window.App = window.App || {};

  const WMO = {
    0: ["晴", "☀️"], 1: ["大致晴朗", "🌤️"], 2: ["局部多云", "⛅"], 3: ["阴", "☁️"],
    45: ["雾", "🌫️"], 48: ["雾凇", "🌫️"], 51: ["毛毛雨", "🌦️"], 53: ["毛毛雨", "🌦️"],
    55: ["毛毛雨", "🌦️"], 61: ["小雨", "🌧️"], 63: ["中雨", "🌧️"], 65: ["大雨", "🌧️"],
    71: ["小雪", "🌨️"], 73: ["中雪", "🌨️"], 75: ["大雪", "🌨️"], 80: ["阵雨", "🌦️"],
    81: ["阵雨", "🌦️"], 82: ["强阵雨", "⛈️"], 95: ["雷阵雨", "⛈️"], 96: ["雷阵雨伴雹", "⛈️"], 99: ["雷阵雨伴雹", "⛈️"],
  };
  const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  App.weatherWeekly = {
    async init() {
      const weatherEl = document.getElementById("weather");
      if (!weatherEl) return;

      // ---- triangle toggle button (right side of the weather row) ----
      const toggle = document.createElement("button");
      toggle.id = "weather-expand";
      toggle.className = "weather-expand";
      toggle.title = "七日天气";
      toggle.setAttribute("aria-label", "七日天气");
      toggle.innerHTML = "<svg viewBox='0 0 24 24' width='16' height='16'><path d='M9 6l6 6-6 6' fill='none' stroke='currentColor' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/></svg>";
      weatherEl.appendChild(toggle);

      // ---- overlay card (fixed at viewport top, above everything) ----
      const card = document.createElement("div");
      card.id = "weather-weekly";
      card.className = "weather-weekly";
      card.hidden = true;
      document.body.appendChild(card);

      let open = false;
      let loaded = false;

      function render(data) {
        const days = data.time || [];
        const codes = data.weather_code || [];
        const tmax = data.temperature_2m_max || [];
        const tmin = data.temperature_2m_min || [];
        card.innerHTML = "";
        const row = document.createElement("div");
        row.className = "ww-row";
        days.forEach((iso, i) => {
          const d = new Date(iso + "T00:00");
          const [desc, icon] = WMO[codes[i]] || ["未知", "❓"];
          const cell = document.createElement("div");
          cell.className = "ww-day";
          cell.innerHTML =
            `<div class="ww-dow">${i === 0 ? "今天" : WEEKDAYS[d.getDay()]}</div>` +
            `<div class="ww-icon">${icon}</div>` +
            `<div class="ww-desc">${desc}</div>` +
            `<div class="ww-temp"><b>${Math.round(tmax[i])}°</b> ${Math.round(tmin[i])}°</div>`;
          row.appendChild(cell);
        });
        card.appendChild(row);
      }

      async function loadData() {
        let geo = await App.load(App.STORAGE_KEYS.geo, null);
        const lat = geo ? geo.lat : 39.9042;
        const lon = geo ? geo.lon : 116.4074;
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
            `&forecast_days=7&timezone=auto`;
          const res = await fetch(url);
          const j = await res.json();
          if (!j.daily) throw new Error("no daily");
          render(j.daily);
          loaded = true;
        } catch {
          card.innerHTML = '<div class="ww-row"><div class="ww-day ww-fail">七日天气获取失败</div></div>';
          loaded = true;
        }
      }

      function show() {
        open = true;
        toggle.classList.add("open");
        if (!loaded) loadData();
        card.hidden = false;
        void card.offsetWidth;
        card.classList.add("open");
        setTimeout(() => document.addEventListener("click", onDocClick, true), 0);
      }
      function hide() {
        open = false;
        toggle.classList.remove("open");
        card.classList.remove("open");
        document.removeEventListener("click", onDocClick, true);
        const onEnd = () => { if (!open) card.hidden = true; card.removeEventListener("transitionend", onEnd); };
        card.addEventListener("transitionend", onEnd);
        setTimeout(() => { if (!open) card.hidden = true; }, 300);
      }
      function onDocClick(e) {
        if (card.contains(e.target) || toggle.contains(e.target)) return;
        hide();
      }

      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        open ? hide() : show();
      });
    },
  };
})();
