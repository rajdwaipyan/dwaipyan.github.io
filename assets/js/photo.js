// Photography: 3D tilt on cards, album buttons that filter the exhibition, and the lightbox.
// The lightbox walks through the photographs that are currently visible (respecting the filter);
// arrow keys, swipe and Escape work; focus returns to the photograph that opened it.
import { reduceMotion, finePointer } from "./core.js";
import { lenis } from "./motion.js";

export function initPhoto() {
  initTilt();
  initAlbums();
  initLightbox();
}

/* ---------- gentle 3D tilt (desktop pointer only) */
function initTilt() {
  if (reduceMotion.matches || !finePointer.matches) return;
  document.querySelectorAll("[data-tilt]").forEach((el) => {
    let frame = 0, x = 0, y = 0;
    const apply = () => {
      frame = 0;
      el.style.setProperty("--rx", (-y * 7).toFixed(2) + "deg");
      el.style.setProperty("--ry", (x * 9).toFixed(2) + "deg");
      el.style.setProperty("--gx", ((x + 1) * 50).toFixed(1) + "%");
      el.style.setProperty("--gy", ((y + 1) * 50).toFixed(1) + "%");
    };
    el.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      x = ((e.clientX - r.left) / r.width) * 2 - 1;
      y = ((e.clientY - r.top) / r.height) * 2 - 1;
      el.classList.add("is-tilting");
      if (!frame) frame = requestAnimationFrame(apply);
    });
    el.addEventListener("pointerleave", () => {
      el.classList.remove("is-tilting");
      el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg");
    });
  });
}

/* ---------- "View album" sets the exhibition filter and scrolls to it */
function initAlbums() {
  document.querySelectorAll("[data-album]").forEach((btn) => btn.addEventListener("click", () => {
    const chip = document.querySelector(`.ph-filters [data-filter="album-${btn.dataset.album}"]`);
    chip?.click();
    const target = document.getElementById("exhibition");
    if (lenis) lenis.scrollTo(target, { offset: -70 });
    else target.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth" });
    chip?.focus({ preventScroll: true });
  }));
}

/* ---------- lightbox */
function initLightbox() {
  const dlg = document.getElementById("lightbox");
  const dataEl = document.getElementById("photo-data");
  if (!dlg || !dataEl || typeof dlg.showModal !== "function") return;
  let data = [];
  try { data = JSON.parse(dataEl.textContent); } catch { return; }
  const root = document.querySelector('link[rel="stylesheet"]').getAttribute("href").replace("style.css", "");
  const img = dlg.querySelector(".lb-img");
  const G = window.gsap;
  const motion = !!G && !reduceMotion.matches;
  let order = [], pos = 0, opener = null;

  const visible = () => [...document.querySelectorAll("#ph-grid > li:not([hidden]) .ph-open")].map((b) => Number(b.dataset.i));
  const show = (dir = 0) => {
    const p = data[order[pos]];
    const set = () => {
      img.src = `${root}assets/img/photos/${p.id}-1024.webp`;
      img.width = p.w; img.height = p.h; img.alt = p.title;
      dlg.querySelector(".lb-title").textContent = p.title;
      dlg.querySelector(".lb-album").textContent = p.album;
      dlg.querySelector(".lb-count").textContent = `${pos + 1} / ${order.length}`;
      dlg.querySelector(".lb-flickr").href = p.page;
      // warm the neighbours
      [order[pos + 1], order[pos - 1]].forEach((k) => { if (k != null) { const i = new Image(); i.src = `${root}assets/img/photos/${data[k].id}-1024.webp`; } });
    };
    if (motion && dir) {
      G.to(img, { x: -dir * 40, opacity: 0, duration: 0.18, ease: "power2.in", onComplete: () => {
        set();
        G.fromTo(img, { x: dir * 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: "expo.out" });
      } });
    } else set();
  };
  const step = (d) => { if (order.length < 2) return; pos = (pos + d + order.length) % order.length; show(d); };
  const open = (i, from) => {
    order = visible(); pos = Math.max(0, order.indexOf(i)); opener = from;
    show(0);
    dlg.showModal(); lenis?.stop();
    document.documentElement.classList.add("vm-open");
    if (motion) {
      G.fromTo(dlg, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      G.fromTo(img, { scale: 0.94, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: "expo.out" });
    }
    dlg.querySelector(".lb-next").focus();
  };
  const close = () => {
    if (!dlg.open) return;
    if (motion) G.to(dlg, { opacity: 0, duration: 0.2, onComplete: () => { dlg.close(); G.set(dlg, { clearProps: "opacity" }); } });
    else dlg.close();
  };
  dlg.addEventListener("close", () => {
    lenis?.start(); document.documentElement.classList.remove("vm-open");
    opener?.focus({ preventScroll: true });
  });
  dlg.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
  dlg.addEventListener("click", (e) => {
    const b = e.target.closest("[data-lb]");
    if (b) { const a = b.dataset.lb; a === "close" ? close() : step(a === "next" ? 1 : -1); return; }
    if (e.target === dlg || e.target.classList.contains("lb-inner") || e.target.classList.contains("lb-fig")) close();
  });
  dlg.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  });
  // swipe
  let sx = 0, sy = 0;
  dlg.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  dlg.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
  }, { passive: true });

  document.querySelectorAll(".ph-open").forEach((b) => b.addEventListener("click", () => open(Number(b.dataset.i), b)));
}
