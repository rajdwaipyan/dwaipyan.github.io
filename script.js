/* Dwaipyan Mandal — portfolio interactions.
   Plain JavaScript, no dependencies. Everything here is progressive:
   the page is fully readable and every link works without it. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMotion.matches) root.classList.add("no-motion");

  /* ---------- Current year in footer */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Hero headline: wrap each word so it can rise from behind a mask.
     Only spaces split words, so "between&nbsp;them." stays together. Screen readers read the same text. */
  var heroTitle = document.getElementById("hero-title");
  if (heroTitle && !reduceMotion.matches) {
    var wordIndex = 0;
    var splitNode = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.nodeValue.split(/([ \t\n\r]+)/).forEach(function (part) {
            if (!part) return;
            if (/^[ \t\n\r]+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var outer = document.createElement("span");
            var inner = document.createElement("span");
            outer.className = "word";
            inner.style.setProperty("--i", String(wordIndex++));
            inner.textContent = part;
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          splitNode(child);
        }
      });
    };
    splitNode(heroTitle);
  }

  /* ---------- Hero stage: pointer depth, proximity lights, service links */
  var stage = document.getElementById("hero-stage");
  if (stage) {
    var signals = Array.prototype.slice.call(stage.querySelectorAll(".signal"));
    var setActive = function (key) {
      if (key) stage.setAttribute("data-active", key); else stage.removeAttribute("data-active");
      signals.forEach(function (s) { s.classList.toggle("is-active", s.getAttribute("data-signal") === key); });
    };

    // Hover/focus on a stage signal or on the matching service strip item lights its orbit and draws its link.
    var bindHighlight = function (el, key) {
      el.addEventListener("pointerenter", function () { setActive(key); });
      el.addEventListener("pointerleave", function () { setActive(null); });
      el.addEventListener("focus", function () { setActive(key); });
      el.addEventListener("blur", function () { setActive(null); });
    };
    signals.forEach(function (s) { bindHighlight(s, s.getAttribute("data-signal")); });
    document.querySelectorAll("[data-signal-target]").forEach(function (a) { bindHighlight(a, a.getAttribute("data-signal-target")); });

    // Pointer-driven depth: fine pointers only, motion allowed, one rAF per frame at most.
    var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    var hero = stage.closest(".hero") || stage;
    var frame = 0, px = 0, py = 0;
    var apply = function () {
      frame = 0;
      var r = stage.getBoundingClientRect();
      var mx = Math.max(-1, Math.min(1, (px - (r.left + r.width / 2)) / (r.width / 2)));
      var my = Math.max(-1, Math.min(1, (py - (r.top + r.height / 2)) / (r.height / 2)));
      stage.style.setProperty("--mx", mx.toFixed(3));
      stage.style.setProperty("--my", my.toFixed(3));
      stage.style.setProperty("--gx", ((px - r.left) / r.width * 100 * 1.6 - 30).toFixed(1) + "%");
      stage.style.setProperty("--gy", ((py - r.top) / r.height * 100 * 1.2 - 8).toFixed(1) + "%");
      signals.forEach(function (s) {
        var sr = s.getBoundingClientRect();
        var d = Math.hypot(px - (sr.left + sr.width / 2), py - (sr.top + sr.height / 2));
        s.classList.toggle("is-near", d < 90);
      });
    };
    var onMove = function (e) {
      px = e.clientX; py = e.clientY;
      if (!frame) frame = window.requestAnimationFrame(apply);
    };
    var onLeave = function () {
      stage.classList.remove("is-tracking");
      stage.style.setProperty("--mx", "0");
      stage.style.setProperty("--my", "0");
      signals.forEach(function (s) { s.classList.remove("is-near"); });
    };
    var enableDepth = function () {
      if (finePointer.matches && !reduceMotion.matches) {
        hero.addEventListener("pointermove", onMove);
        hero.addEventListener("pointerenter", function () { stage.classList.add("is-tracking"); });
        hero.addEventListener("pointerleave", onLeave);
      }
    };
    enableDepth();

    // Orbit sparks (SVG SMIL): frozen under reduced motion, paused while the hero is off screen.
    var orbitsSvg = stage.querySelector(".stage-orbits");
    if (orbitsSvg && typeof orbitsSvg.pauseAnimations === "function") {
      if (reduceMotion.matches) {
        orbitsSvg.pauseAnimations();
      } else if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) orbitsSvg.unpauseAnimations(); else orbitsSvg.pauseAnimations();
          });
        }).observe(stage);
      }
    }
  }

  /* ---------- Header shadow on scroll */
  var header = document.getElementById("site-header");
  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile navigation */
  var toggle = document.getElementById("menu-toggle");
  var nav = document.getElementById("primary-nav");
  var mobileQuery = window.matchMedia("(max-width: 860px)");

  function setMenu(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector(".menu-toggle-label").textContent = open ? "Close" : "Menu";
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    if (open) {
      var first = nav.querySelector("a");
      if (first) first.focus();
    }
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a") && mobileQuery.matches) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        toggle.focus();
      }
      // Keep focus inside the open menu
      if (e.key === "Tab" && nav.classList.contains("is-open")) {
        var focusables = [toggle].concat(Array.prototype.slice.call(nav.querySelectorAll("a")));
        var firstEl = focusables[0];
        var lastEl = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
      }
    });
    var resetOnDesktop = function () { if (!mobileQuery.matches) setMenu(false); };
    if (mobileQuery.addEventListener) mobileQuery.addEventListener("change", resetOnDesktop);
  }

  /* ---------- Highlight the nav item for the section in view */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.primary-nav a[href^="#"]:not(.btn)'));
  if ("IntersectionObserver" in window && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = byId[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach(function (l) { l.removeAttribute("aria-current"); });
          link.setAttribute("aria-current", "true");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) sectionObserver.observe(el);
    });
  }

  /* ---------- Reveal on scroll */
  var reveals = document.querySelectorAll(".reveal");
  if (!reduceMotion.matches && "IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { revealObserver.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Responsive preview (Service 01) */
  document.querySelectorAll("[data-responsive-demo]").forEach(function (demo) {
    var site = demo.querySelector(".demo-site");
    var buttons = demo.querySelectorAll("[data-width]");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        if (site) site.setAttribute("data-size", btn.getAttribute("data-width"));
      });
    });
  });

  /* ---------- Automation flow (Service 03): runs only while visible, can be paused */
  document.querySelectorAll("[data-flow]").forEach(function (flow) {
    var btn = flow.querySelector("[data-flow-toggle]");
    var userPaused = false;
    if (reduceMotion.matches) return;

    function setPaused(paused) {
      flow.classList.toggle("is-paused", paused);
    }
    if (btn) {
      btn.addEventListener("click", function () {
        userPaused = !userPaused;
        setPaused(userPaused);
        btn.setAttribute("aria-pressed", String(userPaused));
        btn.textContent = userPaused ? "Play animation" : "Pause animation";
      });
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          flow.classList.add("is-running");
          setPaused(userPaused || !entry.isIntersecting);
        });
      }, { threshold: 0.2 }).observe(flow);
    } else {
      flow.classList.add("is-running");
    }
  });

  /* ---------- Service CTAs pre-select the matching option in the brief */
  var serviceSelect = document.getElementById("f-service");
  document.querySelectorAll("a[data-service]").forEach(function (link) {
    link.addEventListener("click", function () {
      if (!serviceSelect) return;
      var wanted = link.getAttribute("data-service");
      Array.prototype.forEach.call(serviceSelect.options, function (opt) {
        if (opt.value === wanted || opt.text === wanted) serviceSelect.value = opt.value || opt.text;
      });
    });
  });

  /* ---------- Copy email address */
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    var status = btn.parentElement.querySelector(".copy-status");
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function (ok) {
        if (status) status.textContent = ok ? "Copied to clipboard" : "Copy failed — select the address above";
        window.setTimeout(function () { if (status) status.textContent = ""; }, 3500);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else {
        done(false);
      }
    });
  });

  /* ---------- Project brief → pre-filled email (no backend, nothing stored) */
  var form = document.getElementById("brief-form");
  if (form) {
    var errorBox = document.getElementById("form-error");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var required = form.querySelectorAll("[required]");
      var missing = [];
      required.forEach(function (field) {
        var empty = !field.value.trim();
        field.setAttribute("aria-invalid", String(empty));
        if (empty) missing.push(field);
      });
      if (missing.length) {
        errorBox.hidden = false;
        errorBox.textContent = "Please fill in your name, what you need and a few lines about the project.";
        missing[0].focus();
        return;
      }
      errorBox.hidden = true;

      var v = function (name) { var el = form.elements[name]; return el ? el.value.trim() : ""; };
      var subject = "Project inquiry: " + v("service") + (v("company") ? " — " + v("company") : "");
      var details = [
        "— Name: " + v("name"),
        v("company") && "— Company / website: " + v("company"),
        "— Service: " + v("service"),
        v("timeline") && "— Timeline: " + v("timeline"),
        v("budget") && "— Budget: " + v("budget")
      ].filter(Boolean);
      var lines = ["Hi Dwaipyan,", "", v("message"), ""].concat(details);

      var href = "mailto:rajdwaipayan@gmail.com?subject=" + encodeURIComponent(subject) +
                 "&body=" + encodeURIComponent(lines.join("\n"));
      window.location.href = href;
    });
    form.querySelectorAll("[required]").forEach(function (field) {
      field.addEventListener("input", function () {
        if (field.value.trim()) field.removeAttribute("aria-invalid");
      });
    });
  }
})();
