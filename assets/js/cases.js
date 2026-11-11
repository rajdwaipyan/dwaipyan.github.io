// Filter chips for a grid (portfolio case studies, journal posts).
//   <div data-filters="#grid-id"> <button data-filter="all" aria-pressed="true">All</button> <button data-filter="us">…</button> </div>
//   <ul id="grid-id"> <li data-tags="us crm">…</li> </ul>
// Filtering hides items with the `hidden` attribute, so the grid stays a plain list for assistive tech;
// a polite status line announces how many remain.
import { reduceMotion } from "./core.js";

export function initCases() {
  document.querySelectorAll("[data-filters]").forEach((bar) => {
    const grid = document.querySelector(bar.dataset.filters);
    if (!grid) return;
    const items = [...grid.children];
    const buttons = [...bar.querySelectorAll("[data-filter]")];
    const status = document.querySelector(bar.dataset.filtersStatus || "");
    const G = window.gsap;
    buttons.forEach((btn) => btn.addEventListener("click", () => {
      const f = btn.dataset.filter;
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      const shown = [];
      items.forEach((it) => {
        const on = f === "all" || (it.dataset.tags || "").split(" ").includes(f);
        it.hidden = !on;
        if (on) shown.push(it);
      });
      if (status) status.textContent = `${shown.length} ${shown.length === 1 ? "item" : "items"} shown`;
      if (G && !reduceMotion.matches) {
        G.fromTo(shown, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "expo.out", stagger: 0.06, clearProps: "transform,opacity" });
        window.ScrollTrigger?.refresh();
      }
    }));
  });
}
