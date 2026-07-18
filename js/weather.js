// Weather module — geolocation + open-meteo, with reverse-geocoded location label.
(function () {
  window.App = window.App || {};

  const WMO = {
    0: ["晴", "☀️"], 1: ["大致晴朗", "🌤️"], 2: ["局部多云", "⛅"], 3: ["阴", "☁️"],
    45: ["雾", "🌫️"], 48: ["雾凇", "🌫️"], 51: ["毛毛雨", "🌦️"], 53: ["毛毛雨", "🌦️"],
    55: ["毛毛雨", "🌦️"], 61: ["小雨", "🌧️"], 63: ["中雨", "🌧️"], 65: ["大雨", "🌧️"],
    71: ["小雪", "🌨️"], 73: ["中雪", "🌨️"], 75: ["大雪", "🌨️"], 80: ["阵雨", "🌦️"],
    81: ["阵雨", "🌦️"], 82: ["强阵雨", "⛈️"], 95: ["雷阵雨", "⛈️"], 96: ["雷阵雨伴雹", "⛈️"], 99: ["雷阵雨伴雹", "⛈️"],
  };

  App.weather = {
    init() {
      const elIcon = document.getElementById("weather-icon");
      const elTemp = document.getElementById("weather-temp");
      const elMeta = document.getElementById("weather-meta");
      const elDesc = document.getElementById("weather-desc");

      function fadeSwap(el, text) {
        if (!el || el.textContent === text) return;
        el.style.opacity = "0";
        setTimeout(() => { el.textContent = text; el.style.opacity = "1"; }, 180);
      }

      App.load("geoEnabled", true).then((on) => {
        document.getElementById("geo-toggle").classList.toggle("on", on);
        if (!on) { elMeta.textContent = "已关闭定位"; return; }
        getWeather();
      });

      document.getElementById("geo-toggle").addEventListener("click", async function () {
        const on = this.classList.toggle("on");
        await App.save("geoEnabled", on);
        if (!on) { elMeta.textContent = "已关闭定位"; return; }
        getWeather();
      });

      function renderWeather(c) {
        const [desc, icon] = WMO[c.weather_code] || ["未知", "❓"];
        const h = new Date().getHours();
        const period = (h >= 6 && h < 18) ? "日间" : "夜间";
        fadeSwap(elIcon, icon);
        fadeSwap(elDesc, `${period}-${desc}`);
        elTemp.textContent = Math.round(c.temperature_2m) + "°";
        elMeta.innerHTML = `体感 <b>${Math.round(c.apparent_temperature)}°</b> · 湿度 <b>${c.relative_humidity_2m}%</b>`;
      }

      async function resolveLocation(lat, lon) {
        const elLoc = document.getElementById("loc-info");
        if (!elLoc) return;
        const fallback = () => { elLoc.textContent = `📍 ${lat.toFixed(2)}, ${lon.toFixed(2)}`; };
        try {
          const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`;
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) throw new Error("http" + res.status);
          const j = await res.json();
          const name = j.city || j.locality || j.principalSubdivision || j.countryName;
          elLoc.textContent = name ? `📍 ${name}` : `📍 ${lat.toFixed(2)}, ${lon.toFixed(2)}`;
        } catch {
          fallback();
        }
      }

      async function getWeather() {
        let geo = await App.load(App.STORAGE_KEYS.geo, null);
        if (!geo) {
          geo = await new Promise((resolve) => {
            if (!navigator.geolocation) return resolve(null);
            navigator.geolocation.getCurrentPosition(
              (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
              () => resolve(null), { timeout: 8000 });
          });
          if (geo) await App.save(App.STORAGE_KEYS.geo, geo);
        }
        const lat = geo ? geo.lat : 39.9042;
        const lon = geo ? geo.lon : 116.4074;

        resolveLocation(lat, lon);

        const cached = await App.load(App.STORAGE_KEYS.weather, null);
        if (cached && cached.lat === lat && cached.lon === lon &&
            Date.now() - cached.ts < App.WEATHER_CACHE_MS) {
          renderWeather(cached.data);
          return;
        }

        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code`;
          const res = await fetch(url);
          const j = await res.json();
          if (!j.current || typeof j.current.temperature_2m !== "number") {
            throw new Error("天气接口返回数据格式错误");
          }
          renderWeather(j.current);
          await App.save(App.STORAGE_KEYS.weather, { ts: Date.now(), lat, lon, data: j.current });
        } catch {
          if (cached) { renderWeather(cached.data); }
          else { elDesc.textContent = "天气获取失败"; App.toast("天气获取失败，请检查网络"); }
        }
      }
    },
  };
})();
