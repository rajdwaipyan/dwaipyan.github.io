// The guide: a drawn Dwaipyan in the corner. He waves hello, blinks, watches the pointer
// and says one line per section (from data-guide="…" on the section). Visitors can mute
// him ("Not now") or tuck him away (×). Everything here is decoration: the page works without it.
import { reduceMotion, finePointer } from "./core.js";

const KEY = "guide-mode"; // "", "quiet" or "min" — remembered for this tab only

const read = () => { try { return sessionStorage.getItem(KEY) || ""; } catch { return ""; } };
const save = (v) => { try { sessionStorage.setItem(KEY, v); } catch { /* storage blocked: fine */ } };

const POKES = [
  "Hey, that tickles.",
  "I'm about forty SVG shapes and a little JavaScript.",
  "Press X and the whole page shows its wiring.",
  "The real me answers email. I just point at things.",
];

export function initGuide() {
  const guide = document.getElementById("guide");
  if (!guide) return;
  const figure = document.getElementById("guide-figure");
  const bubble = document.getElementById("guide-bubble");
  const text = document.getElementById("guide-text");
  const actions = document.getElementById("guide-actions");
  const still = reduceMotion.matches;
  // On phones the bubble covers real content, so he only speaks when spoken to (plus hello and goodbye).
  const compact = window.matchMedia("(max-width: 640px)");

  let mode = read();
  let hideTimer = 0, talkTimer = 0, poke = 0, lastSection = null;
  const said = new Set();

  /* ---------- speech */
  const quietBubble = () => {
    guide.classList.remove("is-talking");
    clearTimeout(hideTimer);
  };
  const say = (line, { sticky = false, withActions = false, ms = 0 } = {}) => {
    if (!line || mode === "min") return;
    text.textContent = line;
    actions.hidden = !withActions;
    guide.classList.add("is-talking");
    clearTimeout(hideTimer);
    if (!sticky) hideTimer = setTimeout(quietBubble, ms || Math.max(4200, line.length * 60));
    if (!still) {
      clearInterval(talkTimer);
      let n = 0;
      talkTimer = setInterval(() => {
        guide.classList.toggle("is-o", n % 2 === 0 && n < 8);
        if (++n > 8) { clearInterval(talkTimer); guide.classList.remove("is-o"); }
      }, 110);
    }
  };
  const gesture = (name, ms = 1600) => {
    if (still) return;
    guide.classList.remove("do-" + name);
    void guide.offsetWidth; // restart the animation
    guide.classList.add("do-" + name);
    setTimeout(() => guide.classList.remove("do-" + name), ms);
  };

  /* ---------- modes */
  const setMode = (m) => {
    mode = m; save(m);
    guide.classList.toggle("is-min", m === "min");
    figure.setAttribute("aria-label", m === "min" ? "Bring the guide back" : "Talk to the guide");
    if (m) quietBubble();
  };

  guide.querySelector("[data-guide-tour]").addEventListener("click", () => {
    setMode("");
    const first = document.querySelector("[data-guide]");
    first?.scrollIntoView({ behavior: still ? "auto" : "smooth" });
    if (first) { said.add(first.id); say(first.dataset.guide); }
  });
  guide.querySelector("[data-guide-quiet]").addEventListener("click", () => {
    setMode("quiet");
    figure.focus();
  });
  guide.querySelector("[data-guide-hide]").addEventListener("click", () => {
    setMode("min");
    figure.focus();
  });

  figure.addEventListener("click", () => {
    if (mode === "min") { setMode("quiet"); gesture("wave"); say("I'm back. Click me if you want me to talk."); return; }
    gesture("hop", 700);
    const line = lastSection && !said.has("click:" + lastSection.id) ? lastSection.dataset.guide : POKES[poke++ % POKES.length];
    if (lastSection) said.add("click:" + lastSection.id);
    say(line);
  });
  guide.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && guide.classList.contains("is-talking")) { quietBubble(); figure.focus(); }
  });

  /* ---------- enter, then say hello */
  guide.hidden = false;
  setMode(mode);
  requestAnimationFrame(() => guide.classList.add("is-in"));
  setTimeout(() => {
    if (mode) return;
    gesture("wave", 2200);
    say(guide.dataset.hello || "Hi, I'm Dwaipyan — the drawn version. Want a quick tour?", { sticky: !compact.matches, withActions: true, ms: 9000 });
  }, still ? 300 : 1900);

  /* ---------- one line per section */
  const sections = [...document.querySelectorAll("[data-guide]")];
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      lastSection = el;
      guide.classList.toggle("is-big", el.dataset.guideMood === "wave");
      if (mode || said.has(el.id)) continue;
      if (compact.matches && el.dataset.guideMood !== "wave") continue;
      said.add(el.id);
      if (el.dataset.guideMood === "wave") gesture("wave", 2200); else gesture("hop", 700);
      say(el.dataset.guide);
    }
  }, { rootMargin: "-42% 0px -52% 0px" });
  sections.forEach((s) => io.observe(s));

  /* ---------- reacts to X-ray mode */
  new MutationObserver(() => {
    const on = document.documentElement.classList.contains("xray");
    if (on && !mode) { gesture("hop", 700); say("X-ray on. Now you can see my wireframe too."); }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  /* ---------- a nudge if the visitor goes idle near the top */
  let idle = setTimeout(() => {
    if (!mode && !guide.classList.contains("is-talking") && window.scrollY < window.innerHeight) say("Psst — press X to see how this page is built.");
  }, 26000);
  window.addEventListener("scroll", () => clearTimeout(idle), { once: true, passive: true });

  if (still) return;

  /* ---------- blinking */
  const blink = () => {
    guide.classList.add("is-blink");
    setTimeout(() => guide.classList.remove("is-blink"), 140);
    setTimeout(blink, 2400 + Math.random() * 3600);
  };
  setTimeout(blink, 2600);

  /* ---------- eyes follow the pointer */
  if (!finePointer.matches) return;
  let frame = 0, px = 0, py = 0;
  window.addEventListener("pointermove", (e) => {
    px = e.clientX; py = e.clientY;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const r = figure.getBoundingClientRect();
      const cx = r.left + r.width * 0.5, cy = r.top + r.height * 0.42;
      const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 260) * 3.4;
      figure.style.setProperty("--ex", (dx / d * k).toFixed(2) + "px");
      figure.style.setProperty("--ey", (dy / d * k).toFixed(2) + "px");
      figure.style.setProperty("--tilt", Math.max(-6, Math.min(6, dx / 90)).toFixed(2) + "deg");
    });
  }, { passive: true });
}
