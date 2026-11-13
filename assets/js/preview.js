// Scrolling browser previews ([data-pv], from _includes/browser.html) and the project viewer (#pv-dlg).
//
// Each preview scrolls its own box (.pv-view) through a full-page capture of a live site:
//   top → steadily down to the bottom → pause → glide back to the top → pause → repeat.
// It is a real scroll box, so visitors can scroll it themselves; any wheel, touch, drag or key
// inside it hands control to the visitor (auto-scroll pauses until they press Play or Replay).
// Only previews on screen run, all from one requestAnimationFrame loop that stops when idle.
// Reduced motion: nothing moves until the visitor presses Play.
// Live view: offered only where the site allows framing (data-embed); it is the real site in an
// iframe, which the visitor scrolls — another site's page can't be scrolled from here, and isn't.
import { reduceMotion } from "./core.js";
import { lenis } from "./motion.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const HOLD_BOTTOM = 1600, HOLD_TOP = 1300, RETURN = 1500;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let globalSpeed = 1;
try { globalSpeed = parseFloat(localStorage.getItem("pv-speed")) || 1; } catch { /* storage unavailable */ }

const players = new Set();
let raf = 0, last = 0;
function loop(now) {
  const dt = Math.min(64, now - (last || now)); last = now;
  let busy = false;
  players.forEach((p) => { if (p.running()) { p.step(dt, now); busy = true; } });
  raf = busy ? requestAnimationFrame(loop) : 0;
  if (!busy) last = 0;
}
const wake = () => { if (!raf) raf = requestAnimationFrame(loop); };

class Player {
  constructor(root, { autoplay = !reduceMotion.matches, speed = null } = {}) {
    this.root = root;
    this.view = $(".pv-view", root);
    this.img = $(".pv-page", root);
    this.toggle = $("[data-pv-toggle]", root);
    this.speedSel = $("[data-pv-speed]", root);
    this.ownSpeed = speed;            // a large preview can have its own speed; cards follow the global one
    this.phase = "down"; this.t = 0; this.y = 0;
    this.visible = false; this.userPaused = !autoplay; this.globalPaused = false; this.loaded = false;
    this.ready = () => { this.loaded = this.view.scrollHeight > this.view.clientHeight + 4; wake(); };
    if (this.img) {
      if (this.img.complete && this.img.naturalHeight) this.ready();
      else this.img.addEventListener("load", this.ready, { once: true });
    }
    // anything the visitor does inside the frame hands control to them
    const takeOver = () => { if (!this.userPaused) this.pause(true); };
    ["wheel", "touchstart", "pointerdown"].forEach((ev) => this.view.addEventListener(ev, takeOver, { passive: true }));
    this.view.addEventListener("keydown", (e) => { if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(e.key)) takeOver(); });
    this.toggle?.addEventListener("click", () => (this.userPaused ? this.play() : this.pause(true)));
    $("[data-pv-replay]", root)?.addEventListener("click", () => this.replay());
    if (this.speedSel) {
      this.speedSel.value = String(this.ownSpeed ?? globalSpeed);
      this.speedSel.addEventListener("change", () => { this.ownSpeed = parseFloat(this.speedSel.value) || 1; });
    }
    this.sync();
    players.add(this);
  }
  speed() { return this.ownSpeed ?? globalSpeed; }
  running() { return this.loaded && this.visible && !this.userPaused && !this.globalPaused && !this.root.classList.contains("is-live"); }
  step(dt) {
    const v = this.view, max = v.scrollHeight - v.clientHeight;
    if (max <= 0) return;
    // the visitor may have scrolled: continue from where the frame actually is
    if (Math.abs(v.scrollTop - this.y) > 2 && this.phase === "down") this.y = v.scrollTop;
    if (this.phase === "down") {
      // about a fifth of the frame height per second at 1×, so every frame size feels the same
      this.y = Math.min(max, this.y + (v.clientHeight * 0.2 * this.speed() * dt) / 1000);
      v.scrollTop = this.y;
      if (this.y >= max - 0.5) { this.phase = "holdBottom"; this.t = 0; }
    } else if (this.phase === "holdBottom") {
      this.t += dt; if (this.t >= HOLD_BOTTOM / Math.sqrt(this.speed())) { this.phase = "up"; this.t = 0; this.from = v.scrollTop; }
    } else if (this.phase === "up") {
      this.t += dt;
      const k = Math.min(1, this.t / RETURN);
      this.y = this.from * (1 - ease(k)); v.scrollTop = this.y;
      if (k >= 1) { this.phase = "holdTop"; this.t = 0; }
    } else if (this.phase === "holdTop") {
      this.t += dt; if (this.t >= HOLD_TOP) { this.phase = "down"; this.t = 0; }
    }
  }
  play() { this.userPaused = false; this.y = this.view.scrollTop; this.phase = this.y >= this.view.scrollHeight - this.view.clientHeight - 1 ? "holdBottom" : "down"; this.t = 0; this.sync(); wake(); }
  pause(byUser = false) { if (byUser) this.userPaused = true; this.sync(); }
  replay() { this.view.scrollTop = 0; this.y = 0; this.phase = "holdTop"; this.t = HOLD_TOP - 400; this.userPaused = false; this.sync(); wake(); }
  sync() {
    this.root.classList.toggle("is-paused", this.userPaused);
    if (!this.toggle) return;
    if (this.toggle.classList.contains("pv-mini")) this.toggle.setAttribute("aria-label", this.userPaused ? "Resume automatic scrolling" : "Pause automatic scrolling");
    else this.toggle.textContent = this.userPaused ? "Play" : "Pause";
    this.toggle.setAttribute("aria-pressed", String(this.userPaused));
  }
  destroy() { players.delete(this); }
}

const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => entries.forEach((e) => {
  const p = e.target._pv; if (!p) return;
  p.visible = e.isIntersecting;
  // a card the visitor paused starts again the next time it scrolls into view
  if (!p.visible && p.root.classList.contains("pv-card") && !reduceMotion.matches && p.userPaused) { p.userPaused = false; p.sync(); }
  if (p.visible) wake();
}), { rootMargin: "0px 0px -8% 0px", threshold: 0.15 }) : null;

function mount(root, opts) {
  if (root._pv || !root.hasAttribute("data-pv-ready")) return root._pv;
  const p = new Player(root, opts);
  root._pv = p;
  if (io) io.observe(root); else p.visible = true;
  initLive(root, p);
  return p;
}

// live view: the real site in an iframe (only where the site allows it)
function initLive(root, p) {
  const btn = $("[data-pv-live]", root), url = root.dataset.embed;
  if (!btn || !url) return;
  const note = $("[data-pv-note]", root), noteText = note?.textContent;
  let frame = null;
  const fit = () => {
    if (!frame) return;
    const v = root.querySelector(".pv-view"), k = v.clientWidth / 1440;
    frame.style.transform = `scale(${k})`;
    frame.style.height = Math.round(v.clientHeight / k) + "px";
  };
  btn.addEventListener("click", () => {
    const on = !root.classList.contains("is-live");
    root.classList.toggle("is-live", on);
    btn.setAttribute("aria-pressed", String(on));
    btn.textContent = on ? "Back to capture" : "Live site";
    if (on && !frame) {
      frame = Object.assign(document.createElement("iframe"), { src: url, title: "Live site: " + url, loading: "lazy", referrerPolicy: "no-referrer" });
      frame.className = "pv-frame";
      frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox");
      $(".pv-view", root).appendChild(frame);
      fit();
      addEventListener("resize", fit);
    }
    $$("[data-pv-toggle], [data-pv-replay], .pv-speed", root).forEach((el) => { el.hidden = on; });
    if (note) note.textContent = on ? "The live site, loaded from its own server. Scroll it yourself — another website's page can't be scrolled automatically from here. If it stays blank, the site refused to load in a frame." : noteText;
    if (!on) wake();
  });
}

// case-study cards: the capture drifts down the page and back while the card is on screen (CSS animation)
function initScrollshots() {
  const els = $$("[data-scrollshot]");
  if (!els.length || !("IntersectionObserver" in window)) return;
  const io2 = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("is-in", e.isIntersecting)), { threshold: 0.3 });
  els.forEach((el) => io2.observe(el));
}

export function initPreviews() {
  initScrollshots();
  const all = $$("[data-pv]");
  if (!all.length) return;
  all.forEach((r) => mount(r));
  initGlobalControls();
  initViewer();
  document.addEventListener("visibilitychange", () => { players.forEach((p) => { p.globalPaused = document.hidden || p.globalHold; }); if (!document.hidden) wake(); });
}

function initGlobalControls() {
  const bar = $("[data-pv-global]");
  if (!bar) return;
  const btn = $("[data-pv-all]", bar), sel = $("[data-pv-speed-all]", bar);
  sel.value = String(globalSpeed);
  sel.addEventListener("change", () => {
    globalSpeed = parseFloat(sel.value) || 1;
    try { localStorage.setItem("pv-speed", String(globalSpeed)); } catch { /* storage unavailable */ }
  });
  let held = reduceMotion.matches;
  const apply = () => {
    btn.textContent = held ? "Play all" : "Pause all";
    btn.setAttribute("aria-pressed", String(held));
    players.forEach((p) => { if (p.root.closest("#site-grid")) { p.globalHold = held; p.globalPaused = held; if (!held) p.userPaused = false; } });
    wake();
  };
  btn.addEventListener("click", () => { held = !held; apply(); });
  apply();
}

/* ---------- the project viewer */
function initViewer() {
  const dlg = $("#pv-dlg");
  const grid = $("#site-grid");
  if (!dlg || !grid) return;
  const data = JSON.parse($("#pv-data")?.textContent || "{}");
  const stage = $("#pvd-stage", dlg);
  const root = ($(".pv-page", grid)?.getAttribute("src") || "../assets/img/full/").split("assets/img/full/")[0];
  let list = [], i = 0, player = null, opener = null;

  const build = (card) => {
    const { slug, name, domain, url, cat } = card.dataset;
    const d = (data.sites || {})[slug];
    player?.destroy(); player = null;
    $("#pvd-title", dlg).textContent = name;
    $("#pvd-cat", dlg).textContent = cat;
    $("#pvd-ind", dlg).textContent = cat;
    $("#pvd-dom", dlg).textContent = domain;
    const visit = $("#pvd-visit", dlg); visit.href = url;
    const date = d ? new Date(d.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
    const fallback = card.querySelector(".pv-static")?.getAttribute("src");
    stage.innerHTML = `
      <div class="pv pv-large${d ? "" : " pv-none"}" data-pv${d ? " data-pv-ready" : ""}${d && d.embed ? ` data-embed="${url}"` : ""}>
        <div class="pv-bar"><span class="pv-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="pv-url">${domain}</span></div>
        <div class="pv-view" ${d ? `tabindex="0" role="group" aria-roledescription="scrolling preview" aria-label="Full-page capture of the ${name} website. It scrolls by itself; scroll or use the arrow keys to explore."` : ""} data-lenis-prevent>
          ${d ? `<img class="pv-page" src="${root}assets/img/full/${slug}-900.webp" width="900" height="${d.h}" alt="Full-page capture of the ${name} website" decoding="async">`
              : fallback ? `<img class="pv-static" src="${fallback}" alt="${name} — home page screenshot">`
              : `<span class="pv-empty"><span class="pv-empty-name">${name}</span><span class="pv-empty-note">This site blocks automated captures — open it live.</span></span>`}
        </div>
        <div class="pv-ctrl">
          ${d ? `<button type="button" class="pv-btn" data-pv-toggle aria-pressed="false">Pause</button>
          <button type="button" class="pv-btn" data-pv-replay>Replay</button>
          <label class="pv-speed"><span>Speed</span><select data-pv-speed><option value="0.5">0.5×</option><option value="1">1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label>
          ${d.embed ? `<button type="button" class="pv-btn pv-live" data-pv-live aria-pressed="false">Live site</button>` : ""}
          <p class="pv-note" data-pv-note>Full-page capture, ${date}${d.clipped ? " (first part of a very long page)" : ""}. Scroll or tap to take over.</p>`
          : `<p class="pv-note">No full-page capture could be made of this site (it blocks or ignores automated visits) — visit it live instead.</p>`}
        </div>
      </div>`;
    const pv = $("[data-pv]", stage);
    if (d) { player = mount(pv, { autoplay: !reduceMotion.matches, speed: globalSpeed }); player.visible = true; wake(); }
    $("#pvd-pos", dlg).textContent = `${i + 1} / ${list.length}`;
    $("#pvd-prev", dlg).disabled = i === 0;
    $("#pvd-next", dlg).disabled = i === list.length - 1;
  };
  const open = (card) => {
    list = $$(".site-card", grid).filter((c) => !c.hidden);
    i = Math.max(0, list.indexOf(card));
    opener = document.activeElement;
    build(card);
    // grid previews rest while the viewer is open
    players.forEach((p) => { if (p.root.closest("#site-grid")) p.globalPaused = true; });
    lenis?.stop();
    document.documentElement.classList.add("pvd-open");
    dlg.showModal();
    window.gsap && !reduceMotion.matches && window.gsap.fromTo($(".pvd-in", dlg), { y: 36, opacity: 0, scale: 0.985 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "expo.out", clearProps: "transform,opacity" });
  };
  dlg.addEventListener("close", () => {
    player?.destroy(); player = null; stage.innerHTML = "";
    document.documentElement.classList.remove("pvd-open");
    lenis?.start();
    players.forEach((p) => { if (p.root.closest("#site-grid")) p.globalPaused = !!p.globalHold; });
    wake();
    opener?.focus?.({ preventScroll: true });
  });
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-pv-open]");
    if (btn) { open(btn.closest(".site-card")); return; }
    // a click (not a drag or scroll) on a card's frame opens it too
    const view = e.target.closest(".pv-view");
    if (view && !view._dragged) {
      const p = view.closest("[data-pv]")?._pv;
      if (p && !reduceMotion.matches) { p.userPaused = false; p.sync(); }   // a click opens; it isn't a take-over
      open(view.closest(".site-card"));
    }
  });
  grid.addEventListener("pointerdown", (e) => { const v = e.target.closest(".pv-view"); if (v) { v._dragged = false; v._y = v.scrollTop; v._px = e.clientY; } });
  grid.addEventListener("pointermove", (e) => { const v = e.target.closest(".pv-view"); if (v && v._px != null && Math.abs(e.clientY - v._px) > 6) v._dragged = true; });
  grid.addEventListener("scroll", (e) => { if (e.target.classList?.contains("pv-view")) e.target._dragged = true; }, true);
  grid.addEventListener("keydown", (e) => {
    const view = e.target.closest?.(".pv-view");
    if (view && e.key === "Enter") open(view.closest(".site-card"));
  });
  $("[data-pvd-close]", dlg).addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  const go = (d) => { const n = i + d; if (list[n]) { i = n; build(list[n]); } };
  $("#pvd-prev", dlg).addEventListener("click", () => go(-1));
  $("#pvd-next", dlg).addEventListener("click", () => go(1));
  dlg.addEventListener("keydown", (e) => {
    if (e.target.closest(".pv-view, select")) return;
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  });
}
