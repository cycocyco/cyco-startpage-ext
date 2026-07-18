// Clock module — HH:MM only, repaints only when the minute changes.
(function () {
  window.App = window.App || {};

  App.clock = {
    init() {
      const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
      const p = (n) => String(n).padStart(2, "0");
      const tEl = document.getElementById("clock-time");
      const dEl = document.getElementById("clock-date");
      let lastMin = -1;
      function tick() {
        const d = new Date();
        const min = d.getHours() * 60 + d.getMinutes();
        if (min === lastMin) return;
        lastMin = min;
        tEl.textContent = `${p(d.getHours())}:${p(d.getMinutes())}`;
        dEl.textContent =
          `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${weekdays[d.getDay()]}`;
      }
      tick();
      setInterval(tick, 1000);
    },
  };
})();
