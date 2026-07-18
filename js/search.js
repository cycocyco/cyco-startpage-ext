// Search module — engine switch, query vs URL dispatch, suggest w/ JSONP fallback.
(function () {
  window.App = window.App || {};

  const SEARCH_URLS = {
    bing: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
    google: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    baidu: (q) => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}`,
    yandex: (q) => `https://yandex.ru/search/?text=${encodeURIComponent(q)}`,
    duckduckgo: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  };

  App.search = {
    init() {
      const input = document.getElementById("search-input");
      const btn = document.getElementById("search-btn");
      const suggest = document.getElementById("suggest");
      let engine = "bing";
      let seq = 0;
      let activeIdx = -1;

      const suggestList = document.getElementById("suggest-list");
      const suggestInner = document.getElementById("suggest-inner");
      suggest.hidden = false;
      suggest.classList.remove("open");
      suggestInner.innerHTML = "";

      const sw = document.getElementById("engine-switch");
      const indicator = document.createElement("span");
      indicator.className = "indicator";
      sw.appendChild(indicator);

      function moveIndicator() {
        const active = sw.querySelector("button.active");
        if (!active) return;
        indicator.style.width = active.offsetWidth + "px";
        indicator.style.transform = `translateX(${active.offsetLeft - 4}px)`;
      }
      requestAnimationFrame(moveIndicator);
      window.addEventListener("resize", moveIndicator);

      App.load(App.STORAGE_KEYS.engine, "bing").then((e) => {
        engine = e;
        document.querySelectorAll("#engine-switch button").forEach((b) =>
          b.classList.toggle("active", b.dataset.engine === engine));
        moveIndicator();
      });

      document.getElementById("engine-switch").addEventListener("click", (ev) => {
        const b = ev.target.closest("button"); if (!b) return;
        engine = b.dataset.engine;
        document.querySelectorAll("#engine-switch button").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        moveIndicator();
        App.save(App.STORAGE_KEYS.engine, engine);
      });

      function doSearch(q) {
        q = (q || input.value).trim();
        if (!q) return;
        if (App.isHttpUrl(q)) {
          App.navigate(q.startsWith("http") ? q : "https://" + q);
        } else {
          App.navigate(SEARCH_URLS[engine](q));
        }
      }

      btn.addEventListener("click", () => doSearch());
      input.addEventListener("keydown", (e) => {
        const items = [...suggest.querySelectorAll("li")];
        if (e.key === "Enter") {
          if (activeIdx >= 0 && items[activeIdx]) doSearch(items[activeIdx].dataset.q);
          else doSearch();
          hideSuggest();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          activeIdx = Math.min(activeIdx + 1, items.length - 1);
          updateActive(items);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          activeIdx = Math.max(activeIdx - 1, 0);
          updateActive(items);
        } else if (e.key === "Escape") {
          hideSuggest();
        }
      });

      function updateActive(items) {
        items.forEach((li, i) => li.classList.toggle("active", i === activeIdx));
        if (activeIdx >= 0 && items[activeIdx]) {
          items[activeIdx].scrollIntoView({ block: "nearest" });
        }
      }
      function hideSuggest() {
        suggest.classList.remove("open");
        activeIdx = -1;
        clearTimeout(hideSuggest._t);
      }
      function showSuggest() {
        clearTimeout(hideSuggest._t);
        suggest.classList.add("open");
      }

      let debounceT;
      input.addEventListener("input", () => {
        clearTimeout(debounceT);
        const q = input.value.trim();
        if (!q) { hideSuggest(); return; }
        debounceT = setTimeout(() => fetchSuggest(q, ++seq), 140);
      });

      async function fetchSuggest(q, s) {
        const eng = engine;
        const urls = {
          bing: `https://api.bing.microsoft.com/v7.0/suggestions?q=${encodeURIComponent(q)}`,
          google: `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}`,
          baidu: `https://suggestion.baidu.com/su?wd=${encodeURIComponent(q)}&cb=?`,
        };
        const url = urls[eng];
        if (!url) return;

        try {
          let data;
          if (eng === "baidu") {
            data = await jsonp(url);
          } else if (eng === "google") {
            data = await jsonp(url);
          } else {
            const res = await fetch(url, { headers: { "Ocp-Apim-Subscription-Key": "YOUR_BING_KEY" } });
            data = await res.json();
          }
          if (s !== seq) return;
          const list = parseSuggest(data, eng);
          renderSuggest(list, q);
        } catch {
          hideSuggest();
        }
      }

      function jsonp(url) {
        return new Promise((resolve, reject) => {
          const script = document.createElement("script");
          const cbName = "_cb_" + Date.now();
          script.src = url.replace("cb=?", "cb=" + cbName);
          window[cbName] = (data) => { resolve(data); cleanup(); };
          script.onerror = () => { reject(); cleanup(); };
          document.head.appendChild(script);
          function cleanup() { delete window[cbName]; script.remove(); }
          setTimeout(() => { reject(); cleanup(); }, 5000);
        });
      }

      function parseSuggest(data, eng) {
        try {
          if (eng === "bing") {
            const j = typeof data === "string" ? JSON.parse(data) : data;
            return j?.AS?.Results?.[0]?.Suggests?.map((x) => x.Txt) || [];
          }
          if (eng === "google" || eng === "baidu") {
            const arr = typeof data === "string" ? JSON.parse(data.replace(/^[^(]*\(/, "").replace(/\);?$/, "")) : data;
            return (Array.isArray(arr) ? arr[1] : []).filter((x) => typeof x === "string");
          }
        } catch { return []; }
        return [];
      }

      function renderSuggest(list, q) {
        if (!list.length) { hideSuggest(); return; }
        clearTimeout(hideSuggest._t);
        suggestInner.innerHTML = "";
        list.slice(0, 8).forEach((s, i) => {
          const li = document.createElement("li");
          li.dataset.q = s;
          li.textContent = s;
          li.style.animationDelay = (i * 0.03) + "s";
          li.addEventListener("click", () => doSearch(s));
          li.addEventListener("mouseenter", () => { activeIdx = [...suggestInner.children].indexOf(li); });
          suggestInner.appendChild(li);
        });
        showSuggest();
        activeIdx = -1;
      }

      document.addEventListener("click", (e) => { if (!e.target.closest(".search-card")) hideSuggest(); });
    },
  };
})();
