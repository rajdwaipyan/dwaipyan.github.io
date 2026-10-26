// Hero: the name reacts to the pointer (variable-font weight), and the portrait
// has a lens that shows the line-drawing "structure" under the photograph.
import { reduceMotion, finePointer } from "./core.js";

export function initHero() {
  initKineticName();
  initPortraitLens();
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
