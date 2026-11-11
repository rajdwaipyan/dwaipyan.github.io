// Motion system — GSAP + ScrollTrigger + Lenis, self-hosted in assets/vendor/.
//
// One clock: Lenis is driven by gsap.ticker (no second requestAnimationFrame loop), and every Lenis
// scroll tells ScrollTrigger to update. Everything here is an enhancement: if the vendor scripts are
// missing, or the visitor prefers reduced motion, the page is shown in its final, still state.
//
// What it drives (attributes are set in the HTML):
//   .section-title, .page-title, .contact-title, [data-split]   words rise out of their line
//   [data-clip]        an image is unmasked from the bottom and settles from a slight zoom
//   [data-speed="n"]   layered parallax (n = fraction of the scroll distance, + or -)
//   [data-count]       numbers count up once (verified figures only — see the HTML)
//   [data-words]       a paragraph whose words light up as it scrolls through the screen
//   [data-hscroll]     a pinned section whose track moves sideways (desktop); swipe on phones
//   [data-dims]        sticky picture panel that changes with the step being read
//   [data-wordmark]    the footer name rises letter by letter
//   [data-magnetic]    buttons that lean toward the pointer;  a soft cursor ring on desktop
import { reduceMotion, finePointer } from "./core.js";

const G = window.gsap;
const ST = window.ScrollTrigger;
export const hasGsap = !!(G && ST);
export let lenis = null;
const still = reduceMotion.matches;

export function initMotion() {
  const html = document.documentElement;
  if (!hasGsap) { html.classList.add("no-gsap"); return; }
  G.registerPlugin(ST);
  html.classList.add("has-gsap");
  if (still) return;
  html.classList.add("is-moving");

  initLenis();
  initHeads();
  initClips();
  initSpeed();
  initCounters();
  initWords();
  initHScroll();
  initDims();
  initWordmark();
  initStagger();
  initMagnetic();
  initCursor();

  // images and fonts change heights; re-measure once everything has arrived
  window.addEventListener("load", () => ST.refresh());
  document.fonts?.ready.then(() => ST.refresh());
}

/* ---------- Lenis smooth scroll on the GSAP clock */
function initLenis() {
  if (!window.Lenis) return;
  const header = () => (document.getElementById("site-header")?.offsetHeight || 68) + 12;
  lenis = new window.Lenis({ autoRaf: false, lerp: 0.11, wheelMultiplier: 1, anchors: { offset: -header() } });
  lenis.on("scroll", ST.update);
  G.ticker.add((t) => lenis.raf(t * 1000));
  G.ticker.lagSmoothing(0);
  // a menu or dialog that locks the page also stops Lenis
  const sync = () => (document.body.classList.contains("nav-open") ? lenis.stop() : lenis.start());
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ["class"] });
}

/* ---------- Split a heading into words. Text stays in the DOM (readable, selectable, indexable). */
export function splitWords(el) {
  if (el.dataset.splitDone) return [...el.querySelectorAll(".sw-i")];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) if (walker.currentNode.textContent.trim()) nodes.push(walker.currentNode);
  const inner = [];
  for (const node of nodes) {
    if (node.parentElement.closest(".sr-only")) continue;
    const frag = document.createDocumentFragment();
    for (const part of node.textContent.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); continue; }
      const o = document.createElement("span"); o.className = "sw";
      const i = document.createElement("span"); i.className = "sw-i"; i.textContent = part;
      o.appendChild(i); frag.appendChild(o); inner.push(i);
    }
    node.replaceWith(frag);
  }
  el.dataset.splitDone = "1";
  return inner;
}

/* ---------- Section heads: kicker and intro fade up, the title's words rise in turn */
function initHeads() {
  const titles = document.querySelectorAll(".section-title, .page-title, .contact-title, [data-split]");
  titles.forEach((title) => {
    if (title.closest(".hero")) return;
    const head = title.closest(".section-head, .page-hero > .container, .page-hero-grid > div, .contact-intro, .case-head") || title.parentElement;
    if (head.classList.contains("reveal")) head.classList.remove("reveal");
    const words = splitWords(title);
    const others = [...head.children].filter((c) => c !== title && !c.contains(title) && !c.classList.contains("reveal"));
    const inHero = title.closest(".page-hero");
    const tl = G.timeline({ scrollTrigger: inHero ? undefined : { trigger: title, start: "top 88%", once: true }, delay: inHero ? 0.15 : 0 });
    tl.from(words, { yPercent: 108, rotate: 4, duration: 1.05, ease: "expo.out", stagger: 0.045 }, 0);
    if (others.length) tl.from(others, { y: 18, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.08, clearProps: "transform,opacity" }, 0.12);
  });
}

/* ---------- Image masks */
function initClips() {
  document.querySelectorAll("[data-clip]").forEach((box) => {
    const img = box.querySelector("img");
    const tl = G.timeline({ scrollTrigger: { trigger: box, start: "top 86%", once: true } });
    tl.fromTo(box, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.25, ease: "expo.inOut", clearProps: "clipPath" });
    if (img) tl.from(img, { scale: 1.18, duration: 1.6, ease: "expo.out", clearProps: "scale" }, 0.15);
  });
}

/* ---------- Layered parallax */
function initSpeed() {
  document.querySelectorAll("[data-speed]").forEach((el) => {
    const s = parseFloat(el.dataset.speed) || 0;
    G.fromTo(el, { y: () => -s * window.innerHeight * 0.5 }, {
      y: () => s * window.innerHeight * 0.5, ease: "none",
      scrollTrigger: { trigger: el.closest("section") || el, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true },
    });
  });
}

/* ---------- Counters (the figures in the HTML are the real ones; this only animates them) */
function initCounters() {
  document.querySelectorAll("[data-count]").forEach((el) => {
    const to = Number(el.dataset.count);
    const from = to > 1000 ? to - 14 : 0;
    const obj = { v: from };
    el.textContent = String(from);
    G.to(obj, {
      v: to, duration: to > 1000 ? 1.6 : 1.4, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
      onUpdate: () => { el.textContent = String(Math.round(obj.v)); },
    });
  });
}

/* ---------- Statement: words light up with the scroll */
function initWords() {
  document.querySelectorAll("[data-words]").forEach((el) => {
    const words = splitWords(el).map((w) => w.parentElement);
    el.classList.add("words-ready");
    let lit = -1;
    ST.create({
      trigger: el, start: "top 85%", end: "bottom 45%", scrub: true,
      onUpdate: (self) => {
        const n = Math.round(self.progress * words.length);
        if (n === lit) return;
        words.forEach((w, i) => w.classList.toggle("on", i < n));
        lit = n;
      },
    });
  });
}

/* ---------- Horizontal showcase: pinned on wide screens, a swipeable row on phones */
function initHScroll() {
  const mm = G.matchMedia();
  document.querySelectorAll("[data-hscroll]").forEach((section) => {
    const track = section.querySelector("[data-hscroll-track]");
    const bar = section.querySelector("[data-hscroll-bar]");
    if (!track) return;
    mm.add("(min-width: 961px)", () => {
      const dist = () => Math.max(0, track.scrollWidth - track.clientWidth);
      section.classList.add("is-pinned");
      const tween = G.to(track, {
        x: () => -dist(), ease: "none",
        scrollTrigger: {
          trigger: section, start: "top top", end: () => "+=" + dist(), pin: true, scrub: 0.7,
          invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: (self) => bar?.style.setProperty("--p", self.progress.toFixed(3)),
        },
      });
      // each picture drifts inside its frame as the row moves
      track.querySelectorAll(".case-media img").forEach((img) => {
        G.fromTo(img, { xPercent: -6 }, {
          xPercent: 6, ease: "none",
          scrollTrigger: { trigger: img.closest(".case-card"), containerAnimation: tween, start: "left right", end: "right left", scrub: true },
        });
      });
      // cards arrive as the section comes into view
      G.from(track.children, { x: 120, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.08, clearProps: "opacity", scrollTrigger: { trigger: section, start: "top 75%", once: true } });
      return () => { section.classList.remove("is-pinned"); G.set(track, { clearProps: "x" }); };
    });
    mm.add("(max-width: 960px)", () => {
      const update = () => {
        const max = track.scrollWidth - track.clientWidth;
        bar?.style.setProperty("--p", max > 0 ? (track.scrollLeft / max).toFixed(3) : "0");
      };
      track.addEventListener("scroll", update, { passive: true });
      update();
      return () => track.removeEventListener("scroll", update);
    });
  });
}

/* ---------- Three dimensions: the sticky picture follows the step being read */
function initDims() {
  document.querySelectorAll("[data-dims]").forEach((wrap) => {
    const steps = [...wrap.querySelectorAll("[data-dim-step]")];
    const panes = [...wrap.querySelectorAll("[data-dim-pane]")];
    const ticks = [...wrap.querySelectorAll("[data-dim-tick]")];
    const set = (i) => {
      panes.forEach((p, k) => p.classList.toggle("is-on", k === i));
      steps.forEach((s, k) => s.classList.toggle("is-on", k === i));
      ticks.forEach((t, k) => t.classList.toggle("is-on", k === i));
    };
    steps.forEach((step, i) => {
      ST.create({ trigger: step, start: "top 60%", end: "bottom 60%", onToggle: (self) => self.isActive && set(i) });
    });
    set(0);
  });
}

/* ---------- Footer name: letters rise as the footer arrives */
function initWordmark() {
  const mark = document.querySelector("[data-wordmark]");
  if (!mark) return;
  const word = mark.querySelector(".wm-word");
  const text = word.textContent;
  word.textContent = "";
  word.setAttribute("aria-hidden", "true");
  const letters = [...text].map((ch) => {
    const s = document.createElement("span"); s.className = "wm-l"; s.textContent = ch; word.appendChild(s); return s;
  });
  G.from(letters, {
    yPercent: 100, ease: "none", stagger: 0.06,
    scrollTrigger: { trigger: mark, start: "top bottom", end: "bottom bottom", scrub: 0.6 },
  });
  const sun = mark.querySelector(".wm-sun");
  if (sun) G.from(sun, { yPercent: 70, ease: "none", scrollTrigger: { trigger: mark, start: "top bottom", end: "bottom bottom", scrub: 0.6 } });
}

/* ---------- Groups that arrive one after another */
function initStagger() {
  document.querySelectorAll("[data-stagger]").forEach((group) => {
    const items = group.children;
    G.from(items, {
      y: 40, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.09, clearProps: "transform,opacity",
      scrollTrigger: { trigger: group, start: "top 85%", once: true },
    });
  });
}

/* ---------- Magnetic buttons */
function initMagnetic() {
  if (!finePointer.matches) return;
  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    const xTo = G.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const yTo = G.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const pull = parseFloat(el.dataset.magnetic) || 0.3;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * pull);
      yTo((e.clientY - (r.top + r.height / 2)) * pull);
    });
    el.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
  });
}

/* ---------- Cursor: a small ring that follows the pointer and grows over things you can click.
   The system cursor stays — this is a companion, not a replacement. */
function initCursor() {
  if (!finePointer.matches) return;
  const ring = document.createElement("div");
  ring.className = "cursor";
  ring.setAttribute("aria-hidden", "true");
  ring.innerHTML = '<span class="cursor-label"></span>';
  document.body.appendChild(ring);
  const label = ring.firstChild;
  const xTo = G.quickTo(ring, "x", { duration: 0.45, ease: "power3.out" });
  const yTo = G.quickTo(ring, "y", { duration: 0.45, ease: "power3.out" });
  let shown = false;
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    if (!shown) { G.set(ring, { x: e.clientX, y: e.clientY }); ring.classList.add("is-on"); shown = true; }
    xTo(e.clientX); yTo(e.clientY);
    const t = e.target.closest?.("[data-cursor], a, button, label, select, input, textarea, summary");
    const text = t?.dataset?.cursor || "";
    ring.classList.toggle("is-link", !!t && !text);
    ring.classList.toggle("is-label", !!text);
    if (label.textContent !== text) label.textContent = text;
  }, { passive: true });
  document.addEventListener("pointerleave", () => { ring.classList.remove("is-on"); shown = false; });
  window.addEventListener("pointerdown", () => ring.classList.add("is-down"));
  window.addEventListener("pointerup", () => ring.classList.remove("is-down"));
}
