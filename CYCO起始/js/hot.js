// Hot search module — 7 aggregated sources, cached 1h, with same-tab navigation.
(function () {
  window.App = window.App || {};

  App.hot = {
    async init() {
      const wrap = document.getElementById("hot-wrap");
      const grid = document.getElementById("hot-grid");
      let enabled = await App.load(App.STORAGE_KEYS.hotEnabled, true);
      document.getElementById("hot-toggle").classList.toggle("on", enabled);
      applyEnabled();

      document.getElementById("hot-toggle").addEventListener("click", async function () {
        enabled = this.classList.toggle("on");
        await App.save(App.STORAGE_KEYS.hotEnabled, enabled);
        applyEnabled();
      });

      function applyEnabled() {
        if (!enabled) {
          wrap.hidden = true;
          document.querySelector(".wrap").classList.add("hot-hidden");
          return;
        }
        wrap.hidden = false;
        document.querySelector(".wrap").classList.remove("hot-hidden");
        loadHot();
      }

      const SOURCES = [
        { key: "baidu",   label: "百度热搜",   url: "https://dabenshi.cn/other/api/hot.php?type=baidu",
          parse: (j) => (j && j.success && Array.isArray(j.data))
            ? j.data.map((d) => ({ title: d.title, url: d.url, pic: d.pic || d.img || "" })) : [] },
        { key: "toutiao", label: "头条热榜",   url: "https://60s.viki.moe/v2/toutiao",
          parse: (j) => (j && j.code === 200 && Array.isArray(j.data))
            ? j.data.map((d) => ({ title: d.title, url: d.link || "#", pic: d.cover || "" })) : [] },
        { key: "weibo",   label: "微博热搜",   url: "https://60s.viki.moe/v2/weibo",
          parse: (j) => (j && j.code === 200 && Array.isArray(j.data))
            ? j.data.map((d) => ({ title: d.title, url: d.link || "#", pic: "" })) : [] },
        { key: "douyin",  label: "抖音热搜",   url: "https://60s.viki.moe/v2/douyin",
          parse: (j) => (j && j.code === 200 && Array.isArray(j.data))
            ? j.data.map((d) => ({ title: d.title, url: d.link || "#", pic: "" })) : [] },
        { key: "zhihu",   label: "知乎热榜",   url: "https://60s.viki.moe/v2/zhihu",
          parse: (j) => (j && j.code === 200 && Array.isArray(j.data))
            ? j.data.map((d) => ({ title: d.title, url: d.link || "#", pic: "" })) : [] },
        { key: "qqnews",  label: "腾讯新闻",   url: "https://api.guiguiya.com/api/hotlist/qq_news?type=new",
          parse: (j) => (j && j.success && Array.isArray(j.data))
            ? j.data.map((d) => ({ title: d.title, url: d.url || "#", pic: "" })) : [] },
        { key: "sina",    label: "新浪热搜",   url: "https://api.guiguiya.com/api/hotlist/sina?type=search",
          parse: (j) => (j && j.success && Array.isArray(j.data))
            ? j.data.map((d) => ({ title: d.title, url: d.url || "#", pic: "" })) : [] },
      ];
      const PER_SOURCE = 12;
      const FETCH_RETRIES = 2;

      async function fetchJson(url) {
        let lastErr;
        for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {
          if (attempt > 0) await new Promise((r) => setTimeout(r, 600 * attempt));
          try {
            const res = await fetch(url, { mode: "cors", cache: "no-store" });
            if (!res.ok) throw new Error("http" + res.status);
            return await res.json();
          } catch (e) { lastErr = e; }
        }
        throw lastErr;
      }

      async function loadHot() {
        const CACHE_KEY = "hotsearch_v3";
        const CACHE_MS = 60 * 60 * 1000;
        const cached = await App.load(CACHE_KEY, null);
        let data;
        if (cached && Date.now() - cached.ts < CACHE_MS) {
          data = cached.data;
        } else {
          data = [];
          for (const src of SOURCES) {
            try {
              const j = await fetchJson(src.url);
              const items = src.parse(j);
              data.push({ label: src.label, items: items.slice(0, PER_SOURCE) });
            } catch {
              data.push({ label: src.label, items: [], failed: true });
            }
          }
          await App.save(CACHE_KEY, { ts: Date.now(), data });
        }
        render(data);
      }

      function render(groups) {
        grid.innerHTML = "";
        groups.forEach((g) => {
          const source = document.createElement("div");
          source.className = "hot-source";
          if (g.failed) {
            source.innerHTML = `${g.label} <span class="hot-source-fail">源获取失败</span>`;
          } else {
            source.textContent = g.label;
          }
          grid.appendChild(source);

          const emojiMap = {
            "百度热搜": "🔍", "头条热榜": "📰", "微博热搜": "🐦", "抖音热搜": "🎥",
            "知乎热榜": "📚", "腾讯新闻": "📢", "新浪热搜": "🌐",
          };
          const emoji = emojiMap[g.label] || "●";

          g.items.forEach((item, i) => {
            const rank = i + 1;
            const a = document.createElement("a");
            a.className = "hot-card";
            a.href = item.url || "#";
            a.style.animationDelay = (i * 0.03) + "s";
            a.addEventListener("click", (e) => {
              if (item.url && item.url !== "#") {
                e.preventDefault();
                App.navigate(item.url);
              }
            });

            const ext = document.createElement("span");
            ext.className = "ext-btn";
            ext.title = "新标签打开";
            ext.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>`;
            ext.addEventListener("click", (e) => {
              e.stopPropagation();
              window.open(item.url || "#", "_blank", "noopener,noreferrer");
            });

            const body = document.createElement("div");
            body.className = "hbody";

            const rankEl = document.createElement("span");
            rankEl.className = "rank";
            rankEl.textContent = String(rank).padStart(2, "0");
            if (rank <= 3) rankEl.classList.add("top");

            const title = document.createElement("span");
            title.className = "htitle";
            title.textContent = item.title || "";

            body.append(rankEl, title);

            if (item.pic) {
              const head = document.createElement("div");
              head.className = "himg";
              const img = document.createElement("img");
              img.alt = ""; img.decoding = "async";
              img.loading = "eager"; img.fetchPriority = "high";
              img.onerror = () => { head.textContent = emoji; };
              img.src = item.pic;
              head.appendChild(img);
              a.append(head, body, ext);
            } else {
              a.classList.add("text-only");
              a.append(body, ext);
            }

            grid.appendChild(a);
          });
        });
      }
    },
  };
})();
