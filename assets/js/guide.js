// The guide: a drawn Dwaipyan who follows visitors down the page.
//  • says one line per section (data-guide="…"), wears a costume (data-guide-prop="glasses bowtie"),
//    moves to the left or right edge (data-guide-side), points at projects (data-guide-point)
//  • blinks, turns his head toward the pointer, falls asleep when nobody's around
//  • click him for a tricks menu — wave, dance, jump, sneeze, spin, magic — each with its own sound
// Everything is decoration: the page works without it, and "Not now" / × keep him quiet.
import { reduceMotion, finePointer } from "./core.js";
import { sfx, unlock, isMuted, setMuted } from "./sound.js";
import { burst } from "./particles.js";

const KEY = "guide-mode"; // "", "quiet" or "min" — remembered for this tab only
const read = () => { try { return sessionStorage.getItem(KEY) || ""; } catch { return ""; } };
const save = (v) => { try { sessionStorage.setItem(KEY, v); } catch { /* storage blocked: fine */ } };

const COSTUMES = ["glasses bowtie", "shades lei", "hardhat", "headset", "glasses tie", "shades"];

export function initGuide() {
  const guide = document.getElementById("guide");
  if (!guide) return;
  const figure = document.getElementById("guide-figure");
  const text = document.getElementById("guide-text");
  const actions = document.getElementById("guide-actions");
  const menu = document.getElementById("guide-menu");
  const soundBtn = guide.querySelector("[data-guide-sound]");
  const still = reduceMotion.matches;
  const compact = window.matchMedia("(max-width: 640px)");
  const wide = window.matchMedia("(min-width: 961px)");

  let mode = read();
  let hideTimer = 0, talkTimer = 0, busy = false, asleep = false, helloOpen = false, magicProp = "";
  let lastSection = null;
  const said = new Set();

  /* ---------- helpers */
  const head = () => {
    const r = figure.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.42, w: r.width, top: r.top, bottom: r.bottom };
  };
  const later = (ms, fn) => setTimeout(fn, still ? 0 : ms);

  /* ---------- speech */
  const quietBubble = () => {
    guide.classList.remove("is-talking");
    menu.hidden = true; actions.hidden = true; helloOpen = false;
    clearTimeout(hideTimer);
  };
  const say = (line, { sticky = false, withActions = false, withMenu = false, voice = false, ms = 0 } = {}) => {
    if (!line || mode === "min") return;
    text.textContent = line;
    actions.hidden = !withActions;
    menu.hidden = !withMenu;
    helloOpen = withActions;
    guide.classList.add("is-talking");
    clearTimeout(hideTimer);
    if (!sticky) hideTimer = setTimeout(quietBubble, ms || Math.max(4200, line.length * 60));
    if (voice) sfx.babble(line);
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

  /* ---------- costume, side, size */
  const setProp = (p, { puff = true } = {}) => {
    p = p || "";
    if ((guide.dataset.prop || "") === p) return;
    if (puff && !still && mode !== "min") { const h = head(); burst(h.x, h.y - h.w * 0.25, "puff", 9); }
    guide.dataset.prop = p;
  };
  const setSide = (s) => {
    const left = s === "left" && wide.matches && mode !== "min";
    if (guide.classList.contains("side-left") === left) return;
    guide.classList.add("is-traveling");
    guide.classList.toggle("side-left", left);
    sfx.whoosh();
    setTimeout(() => {
      guide.classList.remove("is-traveling");
      if (!still) { const h = head(); burst(h.x, h.bottom - 6, "puff", 6); }
    }, 900);
  };
  const setSize = (size) => {
    guide.classList.toggle("is-big", size === "big");
    guide.classList.toggle("is-large", size === "large" && wide.matches);
    guide.classList.toggle("is-hero", size === "hero" && wide.matches);
  };

  /* ---------- modes */
  const setMode = (m) => {
    mode = m; save(m);
    guide.classList.toggle("is-min", m === "min");
    figure.setAttribute("aria-label", m === "min" ? "Bring the guide back" : "Guide: click for tricks");
    if (m === "min") { guide.classList.remove("side-left"); quietBubble(); }
  };

  /* ---------- sleep when idle */
  let idleTimer = 0, zTimer = 0;
  const sleep = () => {
    if (mode === "min" || busy || asleep || document.hidden) return;
    asleep = true;
    quietBubble();
    guide.classList.add("is-asleep");
    const z = () => { if (!asleep) return; const h = head(); burst(h.x + h.w * 0.2, h.y - h.w * 0.25, "z", 3); zTimer = setTimeout(z, 2600); };
    z();
  };
  const wake = (silent = false) => {
    if (!asleep) return;
    asleep = false; clearTimeout(zTimer);
    guide.classList.remove("is-asleep");
    gesture("jump", 900);
    if (!silent && !mode) say("Huh? I wasn't asleep. I was… thinking.");
  };
  const poke = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(sleep, 45000);
  };
  ["pointerdown", "keydown", "scroll", "wheel", "touchstart"].forEach((t) => window.addEventListener(t, () => { if (asleep && t !== "scroll") wake(); poke(); }, { passive: true }));
  window.addEventListener("pointermove", poke, { passive: true });
  poke();

  /* ---------- tricks */
  const tricks = {
    wave() { gesture("wave", 2200); sfx.pop(); say("Hello again!", { voice: true }); },
    dance() {
      gesture("dance", 2500); sfx.dance(); say("Ooh, I've got moves.", { voice: false });
      [0, 800, 1600].forEach((t) => later(t, () => { const h = head(); burst(h.x, h.top + 10, "sparkle", 8); }));
      return 2500;
    },
    jump() {
      gesture("jump", 900); sfx.boing();
      later(620, () => { const h = head(); burst(h.x, h.bottom - 4, "puff", 7); });
      return 900;
    },
    sneeze() {
      gesture("sneeze", 1400); sfx.achoo();
      later(650, () => {
        const h = head();
        const left = !guide.classList.contains("side-left");
        burst(h.x + (left ? -h.w * 0.12 : h.w * 0.12), h.y + h.w * 0.05, "drop", 14, left ? 1 : -1);
        say("Achoo! Sorry. It's all that dust under the hood.", { voice: false });
      });
      return 1400;
    },
    spin() {
      gesture("spin", 1000); sfx.spin();
      later(500, () => { const h = head(); burst(h.x, h.y, "sparkle", 12); });
      return 1000;
    },
    magic() {
      sfx.chime();
      const h = head();
      burst(h.x, h.y, "sparkle", 34, 1.4);
      gesture("poof", 900);
      const options = COSTUMES.filter((c) => c !== guide.dataset.prop);
      magicProp = options[Math.floor(Math.random() * options.length)];
      later(300, () => setProp(magicProp, { puff: true }));
      later(450, () => say("Ta-da! New look.", { voice: true }));
      return 900;
    },
  };
  const runTrick = (name) => {
    if (busy || !tricks[name]) return;
    unlock();
    wake(true);
    busy = true;
    quietBubble();
    const ms = tricks[name]() || 1200;
    setTimeout(() => { busy = false; }, still ? 300 : ms);
  };
  menu.addEventListener("click", (e) => {
    const b = e.target.closest("[data-trick]");
    if (b) runTrick(b.dataset.trick);
  });

  /* ---------- buttons */
  figure.addEventListener("click", () => {
    unlock();
    if (mode === "min") {
      setMode("quiet"); gesture("wave", 2200); sfx.pop();
      say("I'm back! Click me again for tricks.", { voice: true });
      return;
    }
    if (asleep) { wake(); return; }
    gesture("jump", 700);
    if (!menu.hidden) { quietBubble(); sfx.pop(); return; }
    sfx.pop();
    say("What should I do?", { sticky: true, withMenu: true, voice: true });
    menu.querySelector("button")?.focus({ preventScroll: true });
  });
  guide.querySelector("[data-guide-tour]").addEventListener("click", () => {
    unlock(); sfx.pop();
    setMode("");
    const first = document.querySelector("[data-guide]");
    first?.scrollIntoView({ behavior: still ? "auto" : "smooth" });
  });
  guide.querySelector("[data-guide-quiet]").addEventListener("click", () => {
    setMode("quiet");
    say("Okay. I'll be here if you need me — click me for tricks.", { ms: 3500 });
    figure.focus({ preventScroll: true });
  });
  guide.querySelector("[data-guide-hide]").addEventListener("click", () => {
    setMode("min");
    figure.focus({ preventScroll: true });
  });
  const paintSound = () => {
    soundBtn.setAttribute("aria-pressed", String(!isMuted()));
    guide.classList.toggle("is-muted", isMuted());
  };
  soundBtn.addEventListener("click", () => {
    unlock();
    setMuted(!isMuted());
    paintSound();
    sfx.pop();
  });
  paintSound();
  guide.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && guide.classList.contains("is-talking")) { quietBubble(); figure.focus({ preventScroll: true }); }
  });

  /* ---------- enter, then say hello */
  guide.hidden = false;
  setMode(mode);
  requestAnimationFrame(() => guide.classList.add("is-in"));
  setTimeout(() => {
    if (!still) { const h = head(); burst(h.x, h.y, "sparkle", 20); }
    if (mode) return;
    gesture("wave", 2200);
    say(guide.dataset.hello || "Hi, I'm Dwaipyan — the drawn version. Want a quick tour? (Or click me for tricks.)",
      { sticky: !compact.matches, withActions: true, ms: 9000 });
  }, still ? 300 : 1500);

  /* ---------- per-section behaviour */
  const zones = [...document.querySelectorAll("[data-guide], [data-guide-side]")];
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      if (el === lastSection) continue;
      lastSection = el;
      if (!magicProp) setProp(el.dataset.guideProp);
      magicProp = "";
      setSide(el.dataset.guideSide || "right");
      setSize(el.dataset.guideMood === "wave" ? "big" : el.dataset.guideSize || "");
      if (!el.dataset.guide || mode || asleep || said.has(el.id)) continue;
      if (compact.matches && el.dataset.guideMood !== "wave") { if (helloOpen) quietBubble(); continue; }
      said.add(el.id);
      if (helloOpen) { say("No tour? Fine — I'll tag along anyway.", { ms: 3200 }); setTimeout(() => say(el.dataset.guide), 3300); continue; }
      if (el.dataset.guideMood === "wave") gesture("wave", 2200);
      else if (el.dataset.guidePoint !== undefined) gesture("point", 2600);
      else gesture("jump", 700);
      say(el.dataset.guide);
    }
  }, { rootMargin: "-42% 0px -52% 0px" });
  zones.forEach((s) => io.observe(s));

  /* ---------- reacts to X-ray mode and to other parts of the page */
  new MutationObserver(() => {
    const on = document.documentElement.classList.contains("xray");
    if (on && !mode) { gesture("jump", 700); say("X-ray on. Now you can see my wireframe too."); }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("guide:say", (e) => {
    const { line, gesture: g, sound } = e.detail || {};
    if (g) gesture(g, g === "dance" ? 2500 : 1600);
    if (sound && sfx[sound]) sfx[sound]();
    if (!mode || e.detail.force) say(line);
  });

  if (still) return;

  /* ---------- blinking */
  const blink = () => {
    if (!asleep) {
      guide.classList.add("is-blink");
      setTimeout(() => guide.classList.remove("is-blink"), 140);
    }
    setTimeout(blink, 2400 + Math.random() * 3600);
  };
  setTimeout(blink, 2600);

  /* ---------- eyes + head turn follow the pointer */
  if (!finePointer.matches) return;
  let frame = 0, px = 0, py = 0;
  window.addEventListener("pointermove", (e) => {
    px = e.clientX; py = e.clientY;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const h = head();
      const dx = px - h.x, dy = py - h.y, d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 260);
      const flip = guide.classList.contains("side-left") ? -1 : 1; // the drawing is mirrored on the left
      const ux = (dx / d) * k * flip, uy = (dy / d) * k;
      figure.style.setProperty("--ex", (ux * 3.4).toFixed(2) + "px");
      figure.style.setProperty("--ey", (uy * 3.4).toFixed(2) + "px");
      figure.style.setProperty("--fx", (ux * 7).toFixed(2) + "px");
      figure.style.setProperty("--fy", (uy * 4).toFixed(2) + "px");
      figure.style.setProperty("--tilt", (Math.max(-6, Math.min(6, dx / 90)) * flip).toFixed(2) + "deg");
    });
  }, { passive: true });
}
