// Page motion that isn't the guide:
//  • [data-words]  — words light up as the paragraph scrolls through the screen
//  • .room screenshots — appear through a growing halftone-dot mask
//  • [data-scratch] — a sand "scratch card" over a screenshot (O-Sea Bora Bora)
import { reduceMotion, finePointer } from "./core.js";
import { burst } from "./particles.js";
import { sfx } from "./sound.js";

export function initFx() {
  if (reduceMotion.matches) return;
  initWords();
  initHalftone();
  initScratch();
}

/* ---------- words light up on scroll */
function initWords() {
  const blocks = [...document.querySelectorAll("[data-words]")].map((el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const words = [];
    for (const node of nodes) {
      const frag = document.createDocumentFragment();
      for (const part of node.textContent.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); continue; }
        const w = document.createElement("span");
        w.className = "w"; w.textContent = part;
        frag.appendChild(w); words.push(w);
      }
      node.replaceWith(frag);
    }
    el.classList.add("words-ready");
    return { el, words, lit: -1 };
  });
  if (!blocks.length) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = innerHeight;
    for (const b of blocks) {
      const r = b.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      const p = Math.min(1, Math.max(0, (vh * 0.88 - r.top) / (vh * 0.5)));
      const lit = Math.round(p * b.words.length);
      if (lit === b.lit) continue;
      b.words.forEach((w, i) => w.classList.toggle("on", i < lit));
      b.lit = lit;
    }
  };
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener("scroll", req, { passive: true });
  addEventListener("resize", req);
  update();
}

/* ---------- halftone reveal of project screenshots */
function initHalftone() {
  const imgs = [...document.querySelectorAll(".room .mock-main img, .room .mock-phone img, .room .mock-detail img")];
  imgs.forEach((img) => img.classList.add("ht"));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const img = e.target;
      io.unobserve(img);
      const go = () => {
        img.classList.add("ht-in");
        img.addEventListener("animationend", () => img.classList.add("ht-done"), { once: true });
      };
      img.complete ? go() : img.addEventListener("load", go, { once: true });
    }
  }, { threshold: 0.2 });
  imgs.forEach((img) => io.observe(img));
}

/* ---------- sand scratch card */
function initScratch() {
  document.querySelectorAll("[data-scratch]").forEach((box) => {
    const img = box.querySelector("img");
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.className = "scratch";
    box.appendChild(canvas);
    const cx = canvas.getContext("2d");
    let w = 0, h = 0, done = false, cleared = 0, lastCheck = 0, lastSound = 0, said = false;

    const paint = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      w = img.offsetWidth; h = img.offsetHeight;
      canvas.style.top = img.offsetTop + "px";
      canvas.style.height = h + "px";
      canvas.width = w * dpr; canvas.height = h * dpr;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx.globalCompositeOperation = "source-over";
      // sand: warm base, grain, a few ripples, and the invitation
      const g = cx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#f1e2b8"); g.addColorStop(1, "#e2c98d");
      cx.fillStyle = g; cx.fillRect(0, 0, w, h);
      for (let i = 0; i < w * h / 40; i++) {
        cx.fillStyle = Math.random() < 0.5 ? "rgba(140,105,50,.18)" : "rgba(255,255,255,.35)";
        cx.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4);
      }
      cx.strokeStyle = "rgba(160,120,60,.25)"; cx.lineWidth = 2;
      for (let y = h * 0.15; y < h; y += h * 0.18) {
        cx.beginPath();
        for (let x = 0; x <= w; x += 8) cx.lineTo(x, y + Math.sin(x / 40 + y) * 5);
        cx.stroke();
      }
      cx.fillStyle = "#121212";
      cx.textAlign = "center"; cx.textBaseline = "middle";
      cx.font = `700 ${Math.max(18, w / 16)}px Bricolage, sans-serif`;
      cx.fillText(finePointer.matches ? "Scratch the sand" : "Tap the sand", w / 2, h / 2 - w / 40);
      cx.font = `400 ${Math.max(12, w / 46)}px "DM Mono", monospace`;
      cx.fillText("there's a website under here", w / 2, h / 2 + w / 28);
      cx.globalCompositeOperation = "destination-out";
    };

    const check = () => {
      const data = cx.getImageData(0, 0, canvas.width, canvas.height).data;
      let clear = 0, total = 0;
      for (let i = 3; i < data.length; i += 4 * 64) { total++; if (data[i] < 40) clear++; }
      cleared = clear / total;
      if (cleared > 0.5 && !done) finish();
    };
    const finish = () => {
      done = true;
      canvas.classList.add("is-done");
      const r = canvas.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, "sparkle", 30, 1.5);
      sfx.chime();
      document.dispatchEvent(new CustomEvent("guide:say", { detail: { line: "Bora Bora! Not a bad place to have a client.", gesture: "dance", force: true } }));
      setTimeout(() => canvas.remove(), 900);
    };
    const scratchAt = (x, y, radius) => {
      if (done) return;
      cx.beginPath(); cx.arc(x, y, radius, 0, Math.PI * 2); cx.fill();
      const r = canvas.getBoundingClientRect();
      if (Math.random() < 0.5) burst(r.left + x, r.top + y, "dust", 3, 0.7);
      const now = performance.now();
      if (now - lastSound > 60) { sfx.scratch(); lastSound = now; }
      if (!said && cleared > 0.08) {
        said = true;
        document.dispatchEvent(new CustomEvent("guide:say", { detail: { line: "Ooh, keep going!" } }));
      }
      if (now - lastCheck > 250) { lastCheck = now; check(); }
    };

    let last = null;
    canvas.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      // draw a stroke from the last point so fast moves still scratch a line
      const rad = Math.max(22, w / 22);
      if (last) {
        const steps = Math.ceil(Math.hypot(x - last.x, y - last.y) / (rad / 2));
        for (let i = 1; i <= steps; i++) scratchAt(last.x + (x - last.x) * i / steps, last.y + (y - last.y) * i / steps, rad);
      } else scratchAt(x, y, rad);
      last = { x, y };
    });
    canvas.addEventListener("pointerleave", () => { last = null; });
    canvas.addEventListener("pointerdown", (e) => {   // touch: each tap digs a big hole
      if (e.pointerType !== "touch") return;
      const r = canvas.getBoundingClientRect();
      scratchAt(e.clientX - r.left, e.clientY - r.top, Math.max(60, w / 5));
    });

    const start = () => paint();
    img.complete && img.naturalWidth ? start() : img.addEventListener("load", start, { once: true });
    let t;
    addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => { if (!done) paint(); }, 200); });
  });
}
