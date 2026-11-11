// Journal article: a reading-progress bar under the header, driven by the article's own length.
export function initJournal() {
  const article = document.querySelector("[data-article]");
  const bar = document.querySelector(".read-progress span");
  if (!article || !bar) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const r = article.getBoundingClientRect();
    const total = r.height - window.innerHeight * 0.6;
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
    bar.style.transform = `scaleX(${p.toFixed(4)})`;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener("resize", update);
  update();
}
