// Page-wide behaviour: header state, mobile menu, section tracking, reveals,
// scroll progress / parallax, copy buttons. Everything is progressive — the page
// works without it.

export const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
export const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

export function initCore() {
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  initMenu();
  initScrollWork();
  initReveals();
  initCounters();
  initPrint();
  initRunWhenVisible();
  initCopyButtons(document);
}

/* ---------- Phone menu: a separate sheet (#mobile-nav) opened by #menu-toggle */
function initMenu() {
  const toggle = document.getElementById("menu-toggle");
  const nav = document.getElementById("mobile-nav");
  if (!toggle || !nav) return;
  const mobile = window.matchMedia("(max-width: 960px)");
  const label = toggle.querySelector(".menu-toggle-label");
  nav.querySelectorAll(".mnav-list li").forEach((li, i) => li.style.setProperty("--i", String(i)));
  nav.inert = true;

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    if (label) label.textContent = open ? "Close" : "Menu";
    nav.classList.toggle("is-open", open);
    nav.inert = !open;
    document.body.classList.toggle("nav-open", open);
    if (open) nav.querySelector("a")?.focus({ preventScroll: true });
  };
  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (e) => {
    if (toggle.getAttribute("aria-expanded") !== "true") return;
    if (e.key === "Escape") { setOpen(false); toggle.focus(); }
    if (e.key === "Tab") {
      const items = [toggle, ...nav.querySelectorAll("a")];
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  mobile.addEventListener?.("change", () => { if (!mobile.matches) setOpen(false); });
}

/* ---------- One rAF loop for everything tied to scroll position */
function initScrollWork() {
  const header = document.getElementById("site-header");
  const root = document.documentElement;
  const progressEls = [...document.querySelectorAll("[data-progress]")];
  const parallaxEls = [...document.querySelectorAll("[data-parallax]")];
  const drawEls = [...document.querySelectorAll("[data-draw]")];
  const bar = document.querySelector(".scroll-progress span");
  let ticking = false;
  let lastRoom = "";

  const update = () => {
    ticking = false;
    const vh = window.innerHeight;
    header?.classList.toggle("is-scrolled", window.scrollY > 8);
    const max = document.documentElement.scrollHeight - vh;
    bar?.style.setProperty("--sp", max > 0 ? (window.scrollY / max).toFixed(4) : "0");
    // lines that draw themselves: 0 when the element's top reaches 85% of the screen, 1 when its bottom reaches 60%
    if (!reduceMotion.matches) {
      for (const el of drawEls) {
        const r = el.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / Math.max(1, r.height + vh * 0.25)));
        el.style.setProperty("--draw", p.toFixed(3));
      }
    }

    // Which section sits under the header? Its colours restyle the header.
    const probe = document.elementFromPoint(window.innerWidth / 2, (header?.offsetHeight || 68) + 4);
    // "body [data-room]": never match <html>, which carries data-room itself.
    const room = probe?.closest("body [data-room]")?.dataset.room || "cream";
    if (room !== lastRoom) { root.dataset.room = room; lastRoom = room; }

    for (const el of progressEls) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const raw = (vh - r.top) / (vh + r.height);
      const p = Math.min(1, Math.max(0, (raw - 0.18) / 0.64));
      el.style.setProperty("--p", p.toFixed(4));
    }
    if (!reduceMotion.matches) {
      for (const el of parallaxEls) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        const offset = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.parallax || "0");
        el.style.translate = `0 ${offset.toFixed(1)}px`;
      }
    }
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  update();
}

/* ---------- Reveal on scroll */
function initReveals() {
  const items = document.querySelectorAll(".reveal");
  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
  items.forEach((el) => io.observe(el));
}

/* ---------- Numbers that count up once when they appear */
function initCounters() {
  const els = [...document.querySelectorAll("[data-count]")];
  if (!els.length || reduceMotion.matches || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const el = e.target, to = Number(el.dataset.count);
      const from = to > 1000 ? to - 12 : 0, start = performance.now(), dur = 1300;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / dur), eased = 1 - Math.pow(1 - t, 3);
        el.textContent = String(Math.round(from + (to - from) * eased));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, { threshold: 0.6 });
  els.forEach((el) => {
    const to = Number(el.dataset.count);
    el.textContent = String(to > 1000 ? to - 12 : 0);
    io.observe(el);
  });
}

/* ---------- Print buttons (the CV page) */
function initPrint() {
  document.querySelectorAll("[data-print]").forEach((b) => b.addEventListener("click", () => window.print()));
}

/* ---------- Small looping animations run only while on screen */
function initRunWhenVisible() {
  const items = document.querySelectorAll("[data-flow-run]");
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle("is-running", e.isIntersecting));
  }, { threshold: 0.3 });
  items.forEach((el) => io.observe(el));
}

/* ---------- Clipboard helpers */
export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
  }
  return false;
}

export function flash(statusEl, message) {
  if (!statusEl) return;
  statusEl.textContent = message;
  clearTimeout(statusEl._t);
  statusEl._t = setTimeout(() => { statusEl.textContent = ""; }, 3500);
}

function initCopyButtons(scope) {
  scope.querySelectorAll("[data-copy]").forEach((btn) => {
    const status = btn.parentElement.querySelector(".copy-status");
    btn.addEventListener("click", async () => {
      const ok = await copyText(btn.dataset.copy);
      flash(status, ok ? "Copied" : "Couldn't copy — select the address instead");
    });
  });
}
