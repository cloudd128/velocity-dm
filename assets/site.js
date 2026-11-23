// VELOCITY DM website: language switch, translucent nav edge, scroll reveals, and an
// interruptible, spring-driven illustration of a segmented download.
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ------------------------------------------------------------ language
  var STRINGS = {
    en: { pause: "Pause", resume: "Resume", restarting: "Restarting Windows…", resumed: "Resumed from the last checkpoint", connections: "connections", connection: "connection", complete: "Complete — verified" },
    ar: { pause: "إيقاف مؤقت", resume: "استكمال", restarting: "ويندوز بيعمل ريستارت…", resumed: "كمّل من آخر نقطة اتحفظت", connections: "اتصالات", connection: "اتصال", complete: "خلص — واتأكد منه" },
  };
  var KEY = "vdm-lang";
  var lang = "en";
  try {
    lang = localStorage.getItem(KEY) || ((navigator.language || "").toLowerCase().indexOf("ar") === 0 ? "ar" : "en");
  } catch (e) {}

  function t(k) {
    return STRINGS[lang][k];
  }

  function applyLanguage(l) {
    lang = l === "ar" ? "ar" : "en";
    var root = document.documentElement;
    root.lang = lang;
    root.dir = lang === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-en]").forEach(function (el) {
      var v = el.getAttribute("data-" + lang);
      if (v != null) el.textContent = v;
    });
    document.querySelectorAll("[data-en-html]").forEach(function (el) {
      var v = el.getAttribute("data-" + lang + "-html");
      if (v != null) el.innerHTML = v; // trusted, static markup from this page
    });
    document.querySelectorAll("[data-lang-block]").forEach(function (el) {
      el.hidden = el.getAttribute("data-lang-block") !== lang;
    });
    var btn = document.getElementById("lang");
    if (btn) {
      btn.textContent = lang === "ar" ? "English" : "عربي";
      btn.lang = lang === "ar" ? "en" : "ar";
    }
    if (demo) demo.relabel();
  }

  // ------------------------------------------------------------ nav edge
  var nav = document.getElementById("nav");
  function onScroll() {
    if (nav) nav.classList.toggle("nav--scrolled", window.scrollY > 4);
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  // ------------------------------------------------------------ reveals
  var revealer =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          function (entries) {
            entries.forEach(function (e) {
              if (e.isIntersecting) {
                e.target.classList.add("in");
                revealer.unobserve(e.target);
              }
            });
          },
          { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
        )
      : null;
  document.querySelectorAll(".reveal").forEach(function (el) {
    if (revealer) revealer.observe(el);
    else el.classList.add("in");
  });

  // ------------------------------------------------------------ demo
  var demo = (function () {
    var root = document.getElementById("demo");
    if (!root) return null;
    var bar = document.getElementById("demo-bar");
    var pct = document.getElementById("demo-pct");
    var info = document.getElementById("demo-speed");
    var toggle = document.getElementById("demo-toggle");
    var restartBtn = document.getElementById("demo-restart");

    var MAX_CONNECTIONS = 8;
    var BASE = 0.016; // file fraction per second per connection at full rate

    // Rate spring (Apple: damping ratio 1.0, response ~0.45 s) — critically damped,
    // re-targetable at any moment from its current value and velocity.
    var rate = { x: 0, v: 0, target: 1, response: 0.45, damping: 1 };
    function stepSpring(s, dt) {
      var w = (2 * Math.PI) / s.response;
      var a = -w * w * (s.x - s.target) - 2 * s.damping * w * s.v;
      s.v += a * dt;
      s.x += s.v * dt;
      if (Math.abs(s.x - s.target) < 0.0005 && Math.abs(s.v) < 0.0005) {
        s.x = s.target;
        s.v = 0;
      }
    }

    var segs = [];
    var paused = false;
    var restarting = false;
    var message = "";
    var doneAt = 0;
    var seed = 7;
    function rand() {
      seed = (seed * 16807) % 2147483647;
      return (seed % 1000) / 1000;
    }

    function makeSeg(start, end) {
      var el = document.createElement("div");
      el.className = "demo__seg";
      var fill = document.createElement("div");
      fill.className = "demo__fill";
      el.appendChild(fill);
      bar.appendChild(el);
      return { start: start, end: end, pos: start, active: true, speed: 0.75 + rand() * 0.6, el: el, fill: fill };
    }

    function reset() {
      bar.innerHTML = "";
      segs = [];
      for (var i = 0; i < MAX_CONNECTIONS; i++) segs.push(makeSeg(i / MAX_CONNECTIONS, (i + 1) / MAX_CONNECTIONS));
      doneAt = 0;
      message = "";
      rate.x = 0;
      rate.v = 0;
      rate.target = paused ? 0 : 1;
    }

    // A finished connection takes half of the largest unfinished slice (work stealing).
    function steal(freed) {
      var best = null;
      segs.forEach(function (s) {
        if (s.active && (!best || s.end - s.pos > best.end - best.pos)) best = s;
      });
      if (!best || best.end - best.pos < 0.03) return;
      var mid = best.pos + (best.end - best.pos) / 2;
      var n = makeSeg(mid, best.end);
      n.speed = freed.speed;
      best.end = mid;
      segs.push(n);
    }

    function render() {
      var done = 0;
      var active = 0;
      segs.forEach(function (s) {
        var span = s.end - s.start;
        s.el.style.left = s.start * 100 + "%";
        s.el.style.width = span * 100 + "%";
        s.fill.style.width = (span > 0 ? ((s.pos - s.start) / span) * 100 : 100) + "%";
        s.el.classList.toggle("demo__seg--done", !s.active);
        done += s.pos - s.start;
        if (s.active) active++;
      });
      pct.textContent = Math.min(100, Math.round(done * 1000) / 10).toFixed(1) + "%";
      if (message) info.textContent = message;
      else if (active === 0) info.textContent = t("complete");
      else info.textContent = active + " " + (active === 1 ? t("connection") : t("connections"));
    }

    var last = 0;
    var running = false;
    function frame(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      stepSpring(rate, dt);
      var anyActive = false;
      segs.slice().forEach(function (s) {
        if (!s.active) return;
        anyActive = true;
        s.pos += s.speed * BASE * Math.max(0, rate.x) * dt * 7;
        if (s.pos >= s.end) {
          s.pos = s.end;
          s.active = false;
          steal(s);
        }
      });
      if (!anyActive) {
        if (!doneAt) doneAt = now;
        else if (now - doneAt > 2200 && !paused) reset();
      }
      render();
      requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      last = 0;
      requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
    }

    // Respond on press, not on release.
    toggle.addEventListener("pointerdown", function () {
      paused = !paused;
      rate.target = paused || restarting ? 0 : 1; // re-target from the current value and velocity
      relabel();
    });
    toggle.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle.dispatchEvent(new Event("pointerdown"));
      }
    });

    restartBtn.addEventListener("click", function () {
      if (restarting) return;
      restarting = true;
      // A power cut is abrupt, not a gesture: the transfer stops at once.
      rate.x = 0;
      rate.v = 0;
      rate.target = 0;
      root.classList.add("demo--off");
      message = t("restarting");
      setTimeout(function () {
        // Data after the last checkpoint is fetched again: roll back a little.
        segs.forEach(function (s) {
          if (s.active) s.pos = Math.max(s.start, s.pos - 0.008);
        });
        root.classList.remove("demo--off");
        restarting = false;
        message = t("resumed");
        rate.target = paused ? 0 : 1;
        setTimeout(function () {
          message = "";
        }, 2200);
      }, 1700);
    });

    function relabel() {
      toggle.textContent = paused ? t("resume") : t("pause");
      if (message === STRINGS.en.restarting || message === STRINGS.ar.restarting) message = t("restarting");
      if (message === STRINGS.en.resumed || message === STRINGS.ar.resumed) message = t("resumed");
      render();
    }

    // Only animate while visible.
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) start();
          else stop();
        });
      }).observe(root);
    } else {
      start();
    }

    reset();
    render();
    return { relabel: relabel };
  })();

  // ------------------------------------------------------------ wire up
  var langBtn = document.getElementById("lang");
  if (langBtn) {
    langBtn.addEventListener("click", function () {
      var next = lang === "ar" ? "en" : "ar";
      try {
        localStorage.setItem(KEY, next);
      } catch (e) {}
      applyLanguage(next);
    });
  }
  applyLanguage(lang);
  onScroll();
})();
