// Hero: the name reacts to the pointer (variable-font weight), the portrait has a lens that shows
// the line-drawing "structure" under the photograph, and the whole stage has gentle depth.
import { reduceMotion, finePointer } from "./core.js";

export function initHero() {
  initCover();
  initKineticName();
  initPortraitLens();
  initDepth();
  initCardTilt();
}

/* ---------- Hero depth: the portrait tilts a few degrees toward the pointer, the identity
   cards drift by their own depth and the light on the photo follows. Fine pointers only. */
function initDepth() {
  const stage = document.querySelector("[data-tilt]");
  const hero = stage?.closest(".hero");
  if (!stage || !hero || reduceMotion.matches || !finePointer.matches) return;
  let frame = 0, nx = 0, ny = 0;
  const apply = () => {
    frame = 0;
    stage.style.setProperty("--ry", (nx * 7).toFixed(2) + "deg");
    stage.style.setProperty("--rx", (-ny * 5).toFixed(2) + "deg");
    stage.style.setProperty("--px", nx.toFixed(3));
    stage.style.setProperty("--py", ny.toFixed(3));
  };
  hero.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect();
    nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
    ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
    if (!frame) frame = requestAnimationFrame(apply);
  });
  hero.addEventListener("pointerleave", () => { nx = 0; ny = 0; if (!frame) frame = requestAnimationFrame(apply); });
}

/* ---------- Project cards lean slightly toward the pointer */
function initCardTilt() {
  if (reduceMotion.matches || !finePointer.matches) return;
  document.querySelectorAll("[data-tilt-card]").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty("--ty", (x * 8).toFixed(2) + "deg");
      card.style.setProperty("--tx", (-y * 6).toFixed(2) + "deg");
    });
    card.addEventListener("pointerleave", () => { card.style.setProperty("--ty", "0deg"); card.style.setProperty("--tx", "0deg"); });
  });
}

/* ---------- The cover: letters, pointer depth, scroll, the rotating line */
function initCover() {
  const cover = document.querySelector(".hero-cover");
  if (!cover) return;
  const still = reduceMotion.matches;
  const mast = cover.querySelector(".hero-mast");

  // 1. split the name into letters (the h1 keeps its text; letters are presentation only)
  const letters = [];
  if (!still) {
    let i = 0;
    mast.querySelectorAll(".mast-word").forEach((w) => {
      const word = w.textContent;
      w.textContent = "";
      for (const ch of word) {
        const s = document.createElement("span");
        s.className = "ml"; s.textContent = ch; s.style.setProperty("--i", String(i++));
        w.appendChild(s); letters.push(s);
      }
    });
    mast.classList.add("is-split");
  }

  // 2. "Building …" — swap the object every few seconds; pause when the tab or hero is out of view
  const items = [...cover.querySelectorAll(".rot-item")];
  if (items.length > 1 && !still) {
    let k = 0, visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(cover);
    setInterval(() => {
      if (!visible || document.hidden) return;
      const cur = items[k], next = items[(k + 1) % items.length];
      cur.classList.remove("is-on"); cur.classList.add("is-out");
      next.classList.remove("is-out"); next.classList.add("is-on");
      setTimeout(() => cur.classList.remove("is-out"), 800);
      k = (k + 1) % items.length;
    }, 2800);
  }
  if (still) return;

  // 3. scroll: 0 at the top of the page, 1 once the hero has scrolled away
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const p = Math.min(1, Math.max(0, window.scrollY / cover.offsetHeight));
      cover.style.setProperty("--sp", p.toFixed(3));
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // 4. pointer: layers at three depths, and the letters near the pointer lean up
  if (!finePointer.matches) return;
  let centres = [], size = 100;
  const measure = () => {
    size = parseFloat(getComputedStyle(mast).fontSize) || 100;
    centres = letters.map((l) => { const r = l.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  };
  setTimeout(measure, 1500);
  window.addEventListener("resize", measure, { passive: true });
  window.addEventListener("scroll", () => { centres = []; }, { passive: true });
  let frame = 0, px = 0, py = 0;
  const apply = () => {
    frame = 0;
    const r = cover.getBoundingClientRect();
    cover.style.setProperty("--mx", (((px - r.left) / r.width) * 2 - 1).toFixed(3));
    cover.style.setProperty("--my", (((py - r.top) / r.height) * 2 - 1).toFixed(3));
    if (!centres.length) measure();
    const R = size * 1.6;
    letters.forEach((l, j) => {
      const c = centres[j]; if (!c) return;
      const d = Math.hypot(px - c.x, py - c.y), f = Math.max(0, 1 - d / R), e = f * f * (3 - 2 * f);
      l.style.setProperty("--ly", (-e * size * 0.13).toFixed(1) + "px");
      l.classList.toggle("is-near", e > 0.55);
    });
  };
  cover.addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; if (!frame) frame = requestAnimationFrame(apply); });
  cover.addEventListener("pointerleave", () => {
    cover.style.setProperty("--mx", "0"); cover.style.setProperty("--my", "0");
    letters.forEach((l) => { l.style.setProperty("--ly", "0px"); l.classList.remove("is-near"); });
  });
}

/* ---------- Kinetic name */
function initKineticName() {
  const lines = [...document.querySelectorAll("[data-kinetic]")];
  if (!lines.length) return;

  // Wrap every letter. The text stays one word for screen readers (no spaces added).
  let i = 0;
  const chars = [];
  for (const line of lines) {
    const word = line.textContent;
    line.textContent = "";
    for (const letter of word) {
      const span = document.createElement("span");
      span.className = "ch";
      span.textContent = letter;
      span.style.setProperty("--i", String(i++));
      line.appendChild(span);
      chars.push(span);
    }
  }
  if (reduceMotion.matches) return;

  const BASE = 720, MIN = 300, RADIUS = 260;
  // Letter centres are measured once (and again on resize/scroll), not every frame:
  // reading layout inside the animation loop would force a reflow per letter.
  let centres = [];
  const measure = () => {
    centres = chars.map((ch) => {
      const r = ch.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
  };
  measure();
  window.addEventListener("resize", measure, { passive: true });
  window.addEventListener("scroll", measure, { passive: true });

  const setWeights = (px, py) => {
    for (let k = 0; k < chars.length; k++) {
      const ch = chars[k];
      const d = Math.hypot(px - centres[k].x, py - centres[k].y);
      const f = Math.max(0, 1 - d / RADIUS);
      const eased = f * f * (3 - 2 * f);
      ch.style.setProperty("--w", String(Math.round(BASE - (BASE - MIN) * eased)));
      ch.classList.toggle("is-near", eased > 0.55);
    }
  };
  const reset = () => chars.forEach((ch) => { ch.style.removeProperty("--w"); ch.classList.remove("is-near"); });

  // One gentle wave after the entrance, on every device, so the name shows it is alive.
  setTimeout(() => {
    measure();
    const start = performance.now(), dur = 1400;
    const xs = centres.map((c) => c.x);
    const left = Math.min(...xs), right = Math.max(...xs);
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const x = left + (right - left + 400) * t - 200;
      for (let k = 0; k < chars.length; k++) {
        const f = Math.max(0, 1 - Math.abs(x - xs[k]) / 180);
        chars[k].style.setProperty("--w", String(Math.round(BASE - (BASE - MIN) * f * f)));
      }
      if (t < 1) requestAnimationFrame(tick); else reset();
    };
    requestAnimationFrame(tick);
  }, 1500);

  if (!finePointer.matches) return;
  const hero = document.querySelector(".hero");
  let frame = 0, px = 0, py = 0;
  hero?.addEventListener("pointermove", (e) => {
    px = e.clientX; py = e.clientY;
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; setWeights(px, py); });
  });
  hero?.addEventListener("pointerleave", reset);
}

/* ---------- Portrait lens */
function initPortraitLens() {
  const frame = document.querySelector("[data-lens]");
  if (!frame) return;
  const toggleBtn = document.querySelector("[data-lens-toggle]");

  // Touch / coarse pointers: a button reveals the whole structure layer.
  toggleBtn?.addEventListener("click", () => {
    const open = !frame.classList.contains("is-open");
    frame.classList.toggle("is-open", open);
    frame.style.setProperty("--lx", "50%");
    frame.style.setProperty("--ly", "40%");
    toggleBtn.setAttribute("aria-pressed", String(open));
    toggleBtn.textContent = open ? "Tap to see the surface" : "Tap to see the structure";
  });

  if (!finePointer.matches) return;
  let frameId = 0, x = 0, y = 0;
  const radius = () => Math.round(frame.clientWidth * 0.3) + "px";
  frame.addEventListener("pointerenter", (e) => {
    if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
    frame.classList.add("is-tracking");
    frame.style.setProperty("--lr", radius());
  });
  frame.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
    const r = frame.getBoundingClientRect();
    x = e.clientX - r.left; y = e.clientY - r.top;
    if (!frameId) frameId = requestAnimationFrame(() => {
      frameId = 0;
      frame.style.setProperty("--lx", x + "px");
      frame.style.setProperty("--ly", y + "px");
    });
  });
  frame.addEventListener("pointerleave", () => {
    frame.classList.remove("is-tracking");
    frame.style.setProperty("--lr", "0px");
  });
}
