// Filter chips for a grid (portfolio case studies, website portfolio, journal posts).
//   <div data-filters="#grid-id"> <button data-filter="all" aria-pressed="true">All</button> <button data-filter="us">…</button> </div>
//   <ul id="grid-id" data-limit="18"> <li data-tags="us crm">…</li> </ul>
//   <button data-more="#grid-id">Show all</button>   (optional: with data-limit, "All" shows the first N until expanded)
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
    const more = document.querySelector(`[data-more="${bar.dataset.filters}"]`);
    const limit = parseInt(grid.dataset.limit || "0", 10);
    const G = window.gsap;
    let filter = "all", expanded = !limit;

    const apply = (animate) => {
      const shown = [];
      items.forEach((it) => {
        const match = filter === "all" || (it.dataset.tags || "").split(" ").includes(filter);
        const on = match && (expanded || filter !== "all" || shown.length < limit);
        it.hidden = !on;
        if (on) shown.push(it);
      });
      if (more) more.parentElement.hidden = expanded || filter !== "all";
      if (status && animate) status.textContent = `${shown.length} ${shown.length === 1 ? "item" : "items"} shown`;
      if (animate && G && !reduceMotion.matches) {
        G.fromTo(shown, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "expo.out", stagger: { each: 0.03, from: "start" }, clearProps: "transform,opacity" });
      }
      window.ScrollTrigger?.refresh();
    };
    buttons.forEach((btn) => btn.addEventListener("click", () => {
      filter = btn.dataset.filter;
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      apply(true);
    }));
    more?.addEventListener("click", () => {
      const first = items.find((it) => it.hidden);
      expanded = true; apply(true);
      first?.querySelector("a")?.focus({ preventScroll: true });
    });
    apply(false);
  });
}
