// One full-screen canvas for small bursts: sparkles, sand dust, puffs, sneeze drops, Zzz.
// It only runs its animation loop while particles are alive, then goes idle.
import { reduceMotion } from "./core.js";

let canvas, cx, parts = [], running = false, dpr = 1;

function ensure() {
  if (canvas) return true;
  canvas = document.createElement("canvas");
  canvas.className = "fx-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  cx = canvas.getContext("2d");
  const size = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
  };
  size();
  window.addEventListener("resize", size, { passive: true });
  return true;
}

const COLORS = { sparkle: ["#d4ff3a", "#5b3df5", "#ffffff", "#b4a6ff"], dust: ["#e8d3a0", "#d9bf82", "#c9a96a"], puff: ["#ffffff", "#ece7da"], drop: ["#9fd3ff", "#d4f0ff"], z: ["#5b3df5"] };

/** Burst of `n` particles of `type` at viewport point (x, y). */
export function burst(x, y, type = "sparkle", n = 18, spread = 1) {
  if (reduceMotion.matches || !ensure()) return;
  const cols = COLORS[type] || COLORS.sparkle;
  for (let i = 0; i < n; i++) {
    const a = type === "z" ? -Math.PI / 2 + (Math.random() - 0.5) * 0.6 : type === "drop" ? Math.PI + (Math.random() - 0.5) * 0.9 : Math.random() * Math.PI * 2;
    const sp = (type === "puff" ? 1.2 : type === "z" ? 0.6 : 2 + Math.random() * 4) * spread;
    parts.push({
      type, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (type === "sparkle" ? 1.5 : 0),
      life: 0, max: type === "z" ? 110 : type === "puff" ? 40 : 45 + Math.random() * 30,
      size: type === "puff" ? 10 + Math.random() * 12 : type === "z" ? 14 + i * 3 : 2 + Math.random() * 4,
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, color: cols[i % cols.length],
    });
  }
  if (!running) { running = true; requestAnimationFrame(step); }
}

function star(r) {
  cx.beginPath();
  for (let i = 0; i < 8; i++) {
    const rr = i % 2 ? r * 0.38 : r, a = (i * Math.PI) / 4;
    cx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  cx.closePath(); cx.fill();
}

function step() {
  cx.setTransform(1, 0, 0, 1, 0, 0);
  cx.clearRect(0, 0, canvas.width, canvas.height);
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  parts = parts.filter((p) => p.life < p.max);
  for (const p of parts) {
    p.life++;
    p.x += p.vx; p.y += p.vy; p.rot += p.vr;
    if (p.type === "sparkle" || p.type === "dust" || p.type === "drop") { p.vy += 0.12; p.vx *= 0.97; }
    if (p.type === "puff") { p.vx *= 0.92; p.vy *= 0.92; p.size += 0.6; }
    const k = 1 - p.life / p.max;
    cx.save();
    cx.globalAlpha = Math.max(0, Math.min(1, k * 1.6));
    cx.translate(p.x, p.y); cx.rotate(p.rot);
    cx.fillStyle = p.color;
    if (p.type === "sparkle") star(p.size * (0.6 + k));
    else if (p.type === "z") { cx.rotate(-p.rot); cx.font = `700 ${p.size}px Bricolage, sans-serif`; cx.fillText("z", 0, 0); }
    else { cx.beginPath(); cx.arc(0, 0, p.size, 0, Math.PI * 2); cx.fill(); }
    cx.restore();
  }
  if (parts.length) requestAnimationFrame(step);
  else { running = false; cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, canvas.width, canvas.height); }
}
