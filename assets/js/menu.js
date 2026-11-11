// Navigation: the desktop mega menu and the phone menu sheet.
//
// Mega menu — each group is a disclosure (button + panel of links), not an ARIA "menu":
//   • click / Enter / Space toggles a group; hovering opens it on a fine pointer (with a short intent delay)
//   • moving between groups while open swaps the panel; the backdrop resizes to fit
//   • Escape closes and returns focus to the button; ArrowDown from a button enters its links;
//     ArrowLeft/ArrowRight move between the group buttons; Tab out of the header closes it
import { reduceMotion, finePointer } from "./core.js";

export function initMenu() {
  initMega();
  initSheet();
}

function initMega() {
  const header = document.getElementById("site-header");
  const nav = header?.querySelector(".mega-nav");
  if (!nav) return;
  const items = [...nav.querySelectorAll(".mega-item")];
  const triggers = items.map((i) => i.querySelector(".mega-trigger"));
  const shade = header.querySelector(".mega-shade");
  const G = window.gsap;
  const motion = !!G && !reduceMotion.matches;
  let open = -1, hoverTimer = 0, leaveTimer = 0;

  const linksOf = (i) => [...items[i].querySelectorAll(".mega-links a")];

  const show = (i, { focus = false } = {}) => {
    if (i === open) return;
    const prev = open;
    open = i;
    items.forEach((it, k) => {
      const on = k === i;
      it.classList.toggle("is-open", on);
      triggers[k].setAttribute("aria-expanded", String(on));
    });
    header.classList.toggle("mega-open", i > -1);
    document.documentElement.classList.toggle("mega-is-open", i > -1);
    if (i > -1) {
      const panel = items[i].querySelector(".mega-panel");
      header.style.setProperty("--mega-h", panel.offsetHeight + "px");
      if (motion) {
        const parts = panel.querySelectorAll(".mega-intro > *, .mega-links li, .mega-feature");
        G.killTweensOf(parts);
        G.fromTo(parts, { y: prev === -1 ? 22 : 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "expo.out", stagger: 0.035, delay: prev === -1 ? 0.08 : 0 });
      }
      if (focus) linksOf(i)[0]?.focus();
    }
  };
  const close = () => show(-1);

  triggers.forEach((btn, i) => {
    btn.addEventListener("click", () => (open === i ? close() : show(i)));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); show(i, { focus: true }); if (open === i) linksOf(i)[0]?.focus(); }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const n = (i + (e.key === "ArrowRight" ? 1 : -1) + triggers.length) % triggers.length;
        triggers[n].focus();
        if (open > -1) show(n);
      }
    });
    if (finePointer.matches) {
      items[i].addEventListener("pointerenter", (e) => {
        if (e.pointerType !== "mouse") return;
        clearTimeout(leaveTimer); clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => show(i), open > -1 ? 40 : 110);
      });
    }
  });

  // links: arrow keys move within the panel
  items.forEach((it, i) => {
    it.querySelector(".mega-links")?.addEventListener("keydown", (e) => {
      const links = linksOf(i), k = links.indexOf(document.activeElement);
      if (k < 0) return;
      if (e.key === "ArrowDown") { e.preventDefault(); links[(k + 1) % links.length].focus(); }
      if (e.key === "ArrowUp") { e.preventDefault(); k === 0 ? triggers[i].focus() : links[k - 1].focus(); }
    });
  });

  if (finePointer.matches) {
    header.addEventListener("pointerleave", (e) => {
      if (e.pointerType !== "mouse") return;
      clearTimeout(hoverTimer);
      leaveTimer = setTimeout(close, 220);
    });
    header.addEventListener("pointerenter", () => clearTimeout(leaveTimer));
  }
  shade?.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open > -1) { const t = triggers[open]; close(); t.focus(); }
  });
  header.addEventListener("focusout", (e) => { if (open > -1 && !header.contains(e.relatedTarget)) close(); });
  nav.addEventListener("click", (e) => { if (e.target.closest(".mega-panel a")) close(); });
  window.addEventListener("resize", () => {
    if (open > -1) header.style.setProperty("--mega-h", items[open].querySelector(".mega-panel").offsetHeight + "px");
  });
  document.documentElement.classList.add("mega-ready");
}

/* ---------- Phone menu: a separate sheet (#mobile-nav) opened by #menu-toggle */
function initSheet() {
  const toggle = document.getElementById("menu-toggle");
  const nav = document.getElementById("mobile-nav");
  if (!toggle || !nav) return;
  const mobile = window.matchMedia("(max-width: 1024px)");
  const label = toggle.querySelector(".menu-toggle-label");
  nav.querySelectorAll(".mnav-home, .mnav-group, .mnav-actions").forEach((el, i) => el.style.setProperty("--i", String(i)));
  nav.inert = true;

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    if (label) label.textContent = open ? "Close" : "Menu";
    nav.classList.toggle("is-open", open);
    nav.inert = !open;
    document.body.classList.toggle("nav-open", open);
    if (open) nav.querySelector("a")?.focus({ preventScroll: true });
  };
  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (e) => {
    if (toggle.getAttribute("aria-expanded") !== "true") return;
    if (e.key === "Escape") { setOpen(false); toggle.focus(); }
    if (e.key === "Tab") {
      const els = [toggle, ...nav.querySelectorAll("a")];
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  mobile.addEventListener?.("change", () => { if (!mobile.matches) setOpen(false); });
}
