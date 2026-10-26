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
  initNavCurrent();
  initRunWhenVisible();
  initCopyButtons(document);
}

/* ---------- Mobile menu */
function initMenu() {
  const toggle = document.getElementById("menu-toggle");
  const nav = document.getElementById("primary-nav");
  if (!toggle || !nav) return;
  const mobile = window.matchMedia("(max-width: 960px)");
  const label = toggle.querySelector(".menu-toggle-label");

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    if (label) label.textContent = open ? "Close" : "Menu";
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    if (open) nav.querySelector("a")?.focus();
  };
  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (e) => { if (e.target.closest("a") && mobile.matches) setOpen(false); });
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
  let ticking = false;
  let lastRoom = "";

  const update = () => {
    ticking = false;
    const vh = window.innerHeight;
    header?.classList.toggle("is-scrolled", window.scrollY > 8);

    // Which section sits under the header? Its colours restyle the header.
    const probe = document.elementFromPoint(window.innerWidth / 2, (header?.offsetHeight || 68) + 4);
    const room = probe?.closest("[data-room]")?.dataset.room || "cream";
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

/* ---------- Highlight the nav link for the section in view */
function initNavCurrent() {
  const links = [...document.querySelectorAll('.primary-nav a[href^="#"]:not(.btn)')];
  if (!links.length || !("IntersectionObserver" in window)) return;
  const byId = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach((l) => l.removeAttribute("aria-current"));
      byId.get(entry.target.id)?.setAttribute("aria-current", "true");
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  byId.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
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
