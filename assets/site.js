// Language switch (English / Arabic). Remembers the choice; defaults to the browser language.
(function () {
  var KEY = "vdm-lang";
  var saved = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch (e) {}
  var lang = saved || ((navigator.language || "").toLowerCase().indexOf("ar") === 0 ? "ar" : "en");

  function apply(l) {
    lang = l;
    var root = document.documentElement;
    root.lang = l;
    root.dir = l === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-en]").forEach(function (el) {
      var text = el.getAttribute("data-" + l);
      if (text != null) el.textContent = text;
    });
    document.querySelectorAll("[data-lang-block]").forEach(function (el) {
      el.hidden = el.getAttribute("data-lang-block") !== l;
    });
    var btn = document.getElementById("lang");
    if (btn) btn.textContent = l === "ar" ? "English" : "عربي";
  }

  var btn = document.getElementById("lang");
  if (btn) {
    btn.addEventListener("click", function () {
      var next = lang === "ar" ? "en" : "ar";
      try {
        localStorage.setItem(KEY, next);
      } catch (e) {}
      apply(next);
    });
  }
  apply(lang);
})();
