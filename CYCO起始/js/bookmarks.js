// Bookmarks module — favicon resolution, render, drag-reorder, add modal,
// collapse toggle, and manual favicon refresh.
(function () {
  window.App = window.App || {};

  const DEFAULT_BOOKMARKS = [
    { id: "yt", title: "YouTube", url: "https://www.youtube.com" },
    { id: "bili", title: "Bilibili", url: "https://www.bilibili.com" },
    { id: "gh", title: "GitHub", url: "https://www.github.com" },
    { id: "mcmod", title: "MC百科", url: "https://www.mcmod.cn" },
  ];

  let dragSrcId = null;

  function faviconCandidates(url) {
    if (!url) return [];
    let raw = String(url).trim();
    raw = raw.replace(/^(microsoft-edge(-read)?|edge|microsoft-edge-pwa):/i, "");
    raw = raw.replace(/^\/+/, "");
    let u;
    try { u = new URL(raw); } catch {
      try { u = new URL("https://" + raw); } catch { return []; }
    }
    const h = u.hostname;
    if (!h) return [];
    // Skip non-routable / local hosts and insecure origins under CSP
    if (/^(127\.\d+\.\d+\.\d+|localhost|\.?)$/i.test(h)) return [];
    return [
      `https://${h}/favicon.ico`,
      `https://${h}/favicon.svg`,
      `https://api.iowen.cn/favicon/${h}.ico`,
    ];
  }
  function initialOf(title) { return (title || "?").trim().charAt(0).toUpperCase(); }

  function withBust(url) {
    return url + (url.includes("?") ? "&" : "?") + "bust=" + Date.now();
  }

  function loadFavicon(b, cands, fav, a, bust) {
    const img = new Image();
    img.width = 22; img.height = 22; img.alt = "";
    img.referrerPolicy = "no-referrer";
    let ci = 0;
    const tryNext = () => {
      if (ci >= cands.length) { a.dataset.iconLoaded = "0"; return; }
      const base = cands[ci++];
      const src = (bust || ci > 1) ? withBust(base) : base;
      img.src = src;
    };
    img.onload = () => {
      fav.textContent = ""; fav.appendChild(img); a.dataset.iconLoaded = "1";
      const resolved = img.src.split("?")[0];
      if (!resolved.startsWith("chrome://favicon")) {
        if (b.icon !== resolved) {
          b.icon = resolved;
          persistBookmarkIcon(b.id, resolved);
        }
      }
    };
    img.onerror = () => {
      if (ci === 1 && b.icon) { b.icon = null; persistBookmarkIcon(b.id, null); }
      tryNext();
    };
    tryNext();
  }

  async function persistBookmarkIcon(id, icon) {
    const list = await App.load(App.STORAGE_KEYS.bookmarks, []);
    if (!Array.isArray(list)) return;
    const item = list.find((x) => x.id === id);
    if (!item || item.icon === icon) return;
    item.icon = icon;
    await App.save(App.STORAGE_KEYS.bookmarks, list);
  }

  async function renderBookmarks(newId, bust) {
    const wrap = document.getElementById("bookmarks");
    let list = await App.load(App.STORAGE_KEYS.bookmarks, null);
    if (list === null) {
      list = DEFAULT_BOOKMARKS.map((b) => ({ ...b }));
      await App.save(App.STORAGE_KEYS.bookmarks, list);
    }
    if (!Array.isArray(list)) list = [];
    let dirty = false;
    list.forEach((b) => {
      if (b.icon && !/^https?:\/\//i.test(b.icon)) {
        b.icon = null; dirty = true;
      }
    });
    if (dirty) App.save(App.STORAGE_KEYS.bookmarks, list);
    wrap.innerHTML = "";
    list.forEach((b, i) => {
      const a = document.createElement("a");
      a.className = "bm";
      if (b.id === newId) a.classList.add("enter");
      a.style.animationDelay = (i * 0.04) + "s";
      let url = b.url;
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
      a.href = url;
      a.referrerPolicy = "no-referrer";
      a.title = b.title;
      a.draggable = true;
      a.dataset.id = b.id;
      a.dataset.iconLoaded = b.icon ? "1" : "0";

      // Open in new tab via App.navigate
      a.addEventListener("click", (e) => {
        e.preventDefault();
        App.navigate(a.href);
      });

      const del = document.createElement("div");
      del.className = "del"; del.textContent = "×"; del.title = "删除";
      del.addEventListener("click", async (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        a.style.transform = "scale(0.9)";
        a.style.opacity = "0";
        await new Promise((r) => setTimeout(r, 200));
        const arr = await App.load(App.STORAGE_KEYS.bookmarks, []);
        const idx = arr.findIndex((x) => x.id === b.id);
        if (idx >= 0) { arr.splice(idx, 1); await App.save(App.STORAGE_KEYS.bookmarks, arr); }
        renderBookmarks();
      });

      const fav = document.createElement("div");
      fav.className = "fav";
      if (b.icon) {
        const img = document.createElement("img");
        img.src = b.icon; img.width = 22; img.height = 22; img.alt = "";
        img.referrerPolicy = "no-referrer";
        img.onerror = () => { fav.textContent = initialOf(b.title); a.dataset.iconLoaded = "0"; };
        fav.appendChild(img);
      } else {
        fav.textContent = initialOf(b.title);
      }
      if (!b.icon || bust) {
        const cands = faviconCandidates(b.url);
        if (cands.length) loadFavicon(b, cands, fav, a, bust);
      }

      const title = document.createElement("div");
      title.className = "btitle"; title.textContent = b.title;

      a.append(del, fav, title);
      wrap.appendChild(a);

      // Drag
      a.addEventListener("dragstart", (e) => {
        dragSrcId = b.id;
        a.classList.add("dragging");
        if (e.dataTransfer) { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", b.id); }
      });
      a.addEventListener("dragend", () => { a.classList.remove("dragging"); dragSrcId = null; });
      a.addEventListener("dragover", (e) => { e.preventDefault(); a.classList.add("drag-over"); });
      a.addEventListener("dragleave", () => a.classList.remove("drag-over"));
      a.addEventListener("drop", async (e) => {
        e.preventDefault(); a.classList.remove("drag-over");
        const srcId = e.dataTransfer?.getData("text/plain") || dragSrcId;
        if (!srcId || srcId === b.id) return;
        const arr = await App.load(App.STORAGE_KEYS.bookmarks, []);
        const srcIdx = arr.findIndex((x) => x.id === srcId);
        const tgtIdx = arr.findIndex((x) => x.id === b.id);
        if (srcIdx < 0 || tgtIdx < 0) return;
        const [moved] = arr.splice(srcIdx, 1);
        arr.splice(tgtIdx, 0, moved);
        await App.save(App.STORAGE_KEYS.bookmarks, arr);
        renderBookmarks();
      });
    });

    const btn = document.getElementById("bm-toggle");
    btn.hidden = list.length <= 7;
    wrap.classList.toggle("collapsed", list.length > 7 && !btn.dataset.expanded);
    wrap.classList.toggle("expanded", list.length > 7 && btn.dataset.expanded);
  }

  App.bookmarks = {
    render(newId, bust) { renderBookmarks(newId, bust); },

    initToggle() {
      const btn = document.getElementById("bm-toggle");
      const wrap = document.getElementById("bookmarks");
      btn.addEventListener("click", () => {
        const expanded = !btn.dataset.expanded;
        btn.dataset.expanded = expanded ? "1" : "";
        wrap.classList.toggle("collapsed", !expanded);
        wrap.classList.toggle("expanded", expanded);
        btn.textContent = expanded ? "收起书签" : "展开书签";
      });
      btn.textContent = "展开书签";
    },

    initModal() {
      const modal = document.getElementById("bm-modal");
      const addBtn = document.getElementById("bm-add-btn");
      const closeBtn = document.getElementById("bm-modal-close");
      const tabs = modal.querySelectorAll(".modal-tabs .tab");
      const panels = modal.querySelectorAll(".tab-panel");

      function open() {
        modal.hidden = false;
        modal.classList.remove("closing");
        void modal.offsetWidth;
        populateTree();
      }
      function close() {
        modal.classList.add("closing");
        setTimeout(() => { modal.hidden = true; }, 350);
      }
      addBtn.addEventListener("click", open);
      closeBtn.addEventListener("click", close);
      modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

      tabs.forEach((t) => t.addEventListener("click", () => {
        tabs.forEach((x) => x.classList.remove("active"));
        t.classList.add("active");
        panels.forEach((p) => p.hidden = p.id !== "tab-" + t.dataset.tab);
      }));

      document.getElementById("bm-manual-save").addEventListener("click", async () => {
        const title = document.getElementById("manual-title").value.trim();
        let url = document.getElementById("manual-url").value.trim();
        if (!title || !url) { App.toast("请填写标题和网址"); return; }
        if (!/^https?:\/\//i.test(url)) url = "https://" + url;
        const arr = await App.load(App.STORAGE_KEYS.bookmarks, []);
        const id = "bm_" + Date.now();
        arr.push({ id, title, url });
        await App.save(App.STORAGE_KEYS.bookmarks, arr);
        App.toast("已添加书签");
        close();
        renderBookmarks(id);
      });

      document.getElementById("bm-tree-save").addEventListener("click", async () => {
        const selected = [...document.querySelectorAll(".tree-row.leaf.selected")];
        if (!selected.length) { App.toast("请先选择书签"); return; }
        const arr = await App.load(App.STORAGE_KEYS.bookmarks, []);
        let added = 0;
        selected.forEach((row) => {
          const url = row.dataset.url;
          const title = row.querySelector(".label")?.textContent || "书签";
          if (arr.some((x) => x.url === url)) return;
          arr.push({ id: "bm_" + Date.now() + "_" + added, title, url });
          added++;
        });
        if (added) {
          await App.save(App.STORAGE_KEYS.bookmarks, arr);
          App.toast(`已添加 ${added} 个书签`);
          close();
          renderBookmarks();
        } else {
          App.toast("所选书签已存在");
        }
      });

      const filter = document.getElementById("bm-filter");
      filter.addEventListener("input", () => {
        const q = filter.value.trim().toLowerCase();
        document.querySelectorAll(".tree-row").forEach((r) => {
          const match = (r.querySelector(".label")?.textContent || "").toLowerCase().includes(q);
          r.style.display = match ? "" : "none";
        });
      });

      async function populateTree() {
        const tree = document.getElementById("bm-tree");
        tree.innerHTML = "加载中…";
        try {
          if (!chrome.bookmarks) { tree.textContent = "缺少 bookmarks 权限"; return; }
          const treeData = await new Promise((resolve) =>
            chrome.bookmarks.getTree(resolve)
          );
          if (!Array.isArray(treeData) || !treeData.length) { tree.textContent = "收藏夹为空"; return; }
          const existing = (await App.load(App.STORAGE_KEYS.bookmarks, [])).map((x) => x.url);
          const existingSet = new Set(existing);
          tree.innerHTML = "";
          function build(nodes, parent) {
            (nodes || []).forEach((node) => {
              if (!node || !node.id) return;
              const isFolder = Array.isArray(node.children);
              if (!isFolder) {
                const row = document.createElement("div");
                row.className = "tree-row leaf";
                if (existingSet.has(node.url)) row.classList.add("added-locked");
                row.dataset.url = node.url || "";
                const label = document.createElement("span");
                label.className = "label";
                label.textContent = node.title || "";
                const check = document.createElement("div");
                check.className = "leaf-check";
                check.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
                row.append(label, check);
                row.addEventListener("click", (e) => {
                  if (row.classList.contains("added-locked")) return;
                  row.classList.toggle("selected");
                });
                parent.appendChild(row);
                return;
              }
              if (!node.title && !node.url) {
                build(node.children, parent); return;
              }
              const nodeEl = document.createElement("div");
              nodeEl.className = "tree-node";
              const row = document.createElement("div");
              row.className = "tree-row";
              const twist = document.createElement("span");
              twist.className = "twist";
              twist.textContent = "▸";
              const label = document.createElement("span");
              label.className = "label";
              label.textContent = node.title || "";
              row.append(twist, label);
              const children = document.createElement("div");
              children.className = "tree-children";
              row.addEventListener("click", (e) => {
                if (e.target.closest(".leaf-check")) return;
                children.classList.toggle("open");
                twist.classList.toggle("rot", children.classList.contains("open"));
              });
              nodeEl.append(row, children);
              parent.appendChild(nodeEl);
              build(node.children, children);
            });
          }
          build(treeData, tree);
        } catch (e) {
          tree.textContent = "无法读取收藏夹: " + (e?.message || e);
        }
      }
    },

    refresh() {
      renderBookmarks(null, true);
    },
  };
})();
