// Hero: the night cover (entrance timeline, letters, rotating line, depth), the portrait lens
// on the About page and the project-card tilt.
import { reduceMotion, finePointer } from "./core.js";

export function initHero() {
  initCover();
  initPortraitLens();
  initCardTilt();
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

/* ---------- The cover: entrance, letters, pointer depth, scroll, the rotating line */
function initCover() {
  const hero = document.querySelector(".hero-night");
  const cover = hero?.querySelector(".hero-cover");
  if (!cover) return;
  const still = reduceMotion.matches;
  const mast = cover.querySelector(".hero-mast");
  const G = window.gsap;

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

  // 3. entrance — one GSAP timeline. Without GSAP (or with reduced motion) the cover is simply shown.
  hero.classList.add("hero-go");
  if (still || !G || !window.ScrollTrigger) return;
  const q = (s) => hero.querySelectorAll(s);
  const tl = G.timeline({ defaults: { ease: "expo.out" } });
  // On phones the name and the portrait are the first thing painted (and the largest), so they are
  // shown at once and only settle into place; on wide screens they make the full cinematic entrance.
  const wide = window.matchMedia("(min-width: 961px)").matches;
  tl.from(q(".hero-sun"), { yPercent: 38, scale: 0.72, duration: 2, ease: "power4.out" }, 0);
  if (wide) {
    tl.from(letters, { yPercent: 112, rotate: 7, duration: 1.2, stagger: 0.035 }, 0.1)
      .fromTo(q(".hero-figure"), { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "expo.inOut", clearProps: "clipPath" }, 0.05);
  }
  tl.from(q(".hero-figure img"), { yPercent: wide ? 8 : 3, scale: wide ? 1.08 : 1.03, duration: 1.8 }, 0.15)
    .from(q(".wall-col"), { yPercent: 14, opacity: 0, duration: 1.6, stagger: 0.12 }, 0.35)
    .from(q(".sun-ring"), { opacity: 0, scale: 0.9, duration: 1.6 }, 0.7)
    .from(q(".hero-deck > *"), { y: 26, opacity: 0, duration: 1.1, stagger: 0.08, clearProps: "transform,opacity" }, 0.6)
    .from(q(".hero-credits .ledger-item, .hero-credits .marquee"), { y: 20, opacity: 0, duration: 1, stagger: 0.07, clearProps: "transform,opacity" }, 0.9);

  // 4. scroll: the name drifts up, the sun sets, the wall slides, the figure barely moves
  const st = { trigger: cover, start: "top top", end: "bottom top", scrub: true };
  G.to(mast, { yPercent: -28, ease: "none", scrollTrigger: st });
  G.to(q(".hero-sun"), { yPercent: 34, scale: 0.86, ease: "none", scrollTrigger: st });
  G.to(q(".hero-figure"), { yPercent: 6, ease: "none", scrollTrigger: st });
  G.to(q(".hero-wall"), { yPercent: -12, ease: "none", scrollTrigger: st });

  // 5. pointer: layers at three depths, and the letters near the pointer lean up
  if (!finePointer.matches) return;
  let centres = [], size = 100;
  const measure = () => {
    size = parseFloat(getComputedStyle(mast).fontSize) || 100;
    centres = letters.map((l) => { const r = l.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  };
  window.addEventListener("resize", () => { centres = []; }, { passive: true });
  window.addEventListener("scroll", () => { centres = []; }, { passive: true });
  let frame = 0, px = 0, py = 0;
  const apply = () => {
    frame = 0;
    const r = cover.getBoundingClientRect();
    cover.style.setProperty("--mx", (((px - r.left) / r.width) * 2 - 1).toFixed(3));
    cover.style.setProperty("--my", (((py - r.top) / r.height) * 2 - 1).toFixed(3));
    if (tl.isActive()) return;
    if (!centres.length) measure();
    const R = size * 1.5;
    letters.forEach((l, j) => {
      const c = centres[j]; if (!c) return;
      const d = Math.hypot(px - c.x, py - c.y), f = Math.max(0, 1 - d / R), e = f * f * (3 - 2 * f);
      l.style.setProperty("--ly", (-e * size * 0.12).toFixed(1) + "px");
      l.classList.toggle("is-near", e > 0.55);
    });
  };
  cover.addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; if (!frame) frame = requestAnimationFrame(apply); });
  cover.addEventListener("pointerleave", () => {
    cover.style.setProperty("--mx", "0"); cover.style.setProperty("--my", "0");
    letters.forEach((l) => { l.style.setProperty("--ly", "0px"); l.classList.remove("is-near"); });
  });
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
