// Watch & Explore: the video player.
// Cards are ordinary links to the video. With JavaScript, a card marked data-play="modal" opens a native
// <dialog> and only then creates the YouTube (nocookie) or Facebook iframe; closing removes it, so nothing
// keeps playing or loading. Escape closes, focus returns to the card. A link to /watch/#v-<id> opens that video.
import { reduceMotion } from "./core.js";
import { lenis } from "./motion.js";

export function initVideo() {
  const dialog = document.getElementById("video-modal");
  const dataEl = document.getElementById("video-data");
  if (!dialog || !dataEl || typeof dialog.showModal !== "function") return;
  let data = [];
  try { data = JSON.parse(dataEl.textContent); } catch { return; }
  const byId = Object.fromEntries(data.map((v) => [v.id, v]));
  const frame = dialog.querySelector(".vm-frame");
  const G = window.gsap;
  const motion = !!G && !reduceMotion.matches;
  let opener = null;

  const label = (v) => (v.platform === "facebook" ? "Facebook" : v.type === "short" ? "YouTube Short" : "YouTube");

  const fill = (v) => {
    dialog.classList.toggle("is-short", v.type === "short");
    dialog.querySelector(".vm-k").textContent = [label(v), v.duration].filter(Boolean).join(" · ");
    dialog.querySelector(".vm-title").textContent = v.title;
    dialog.querySelector(".vm-desc").textContent = v.description || "";
    const ext = dialog.querySelector(".vm-ext");
    ext.href = v.url; ext.textContent = `Watch on ${v.platform === "facebook" ? "Facebook" : "YouTube"}`;
    frame.innerHTML = "";
    const iframe = document.createElement("iframe");
    iframe.src = v.embed;
    iframe.title = v.title;
    iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    frame.appendChild(iframe);
    // related: share a category, playable here, not this one — up to 3
    const rel = data.filter((o) => o.id !== v.id && o.embed && o.categories.some((c) => v.categories.includes(c))).slice(0, 3);
    const box = dialog.querySelector(".vm-related");
    const ul = box.querySelector("ul");
    ul.innerHTML = "";
    rel.forEach((o) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button"; b.className = "vm-rel";
      b.innerHTML = `${o.thumb ? `<img src="${o.thumb}" alt="" loading="lazy" width="160" height="90">` : ""}<span></span>`;
      b.querySelector("span").textContent = o.title;
      b.addEventListener("click", () => { fill(o); history.replaceState(null, "", "#v-" + o.id); });
      li.appendChild(b); ul.appendChild(li);
    });
    box.hidden = !rel.length;
  };

  const open = (v, from) => {
    opener = from || null;
    fill(v);
    dialog.showModal();
    lenis?.stop();
    document.documentElement.classList.add("vm-open");
    history.replaceState(null, "", "#v-" + v.id);
    if (motion) {
      G.fromTo(dialog, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" });
      G.fromTo(dialog.querySelector(".vm-inner"), { y: 40, scale: 0.97 }, { y: 0, scale: 1, duration: 0.7, ease: "expo.out" });
    }
    dialog.querySelector(".vm-close").focus();
  };

  const finish = () => {
    frame.innerHTML = "";           // stops playback and unloads the player
    lenis?.start();
    document.documentElement.classList.remove("vm-open");
    if (location.hash.startsWith("#v-")) history.replaceState(null, "", location.pathname + location.search);
    opener?.focus({ preventScroll: true });
  };
  const close = () => {
    if (!dialog.open) return;
    if (motion) {
      G.to(dialog, { opacity: 0, duration: 0.25, ease: "power2.in", onComplete: () => { dialog.close(); G.set(dialog, { clearProps: "opacity" }); } });
    } else dialog.close();
  };
  dialog.addEventListener("close", finish);
  dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(); });   // Escape
  dialog.addEventListener("click", (e) => { if (e.target === dialog || e.target.closest("[data-close]")) close(); });

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-play='modal']");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const v = byId[a.dataset.video];
    if (!v || !v.embed) return;
    e.preventDefault();
    open(v, a);
  });

  const fromHash = () => {
    const m = location.hash.match(/^#v-(.+)$/);
    if (m && byId[m[1]]?.embed && !dialog.open) open(byId[m[1]], document.querySelector(`#v-${CSS.escape(m[1])} a`));
  };
  fromHash();
  addEventListener("hashchange", fromHash);
}
