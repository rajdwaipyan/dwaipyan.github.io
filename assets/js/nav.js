// Header navigation capsule: a soft pill slides to the link under the pointer (or keyboard focus)
// and rests on the current page's link. Purely visual — links work without it.
import { reduceMotion } from "./core.js";

export function initNav() {
  const cap = document.querySelector(".nav-capsule");
  const pill = cap?.querySelector(".nav-pill");
  if (!cap || !pill) return;
  const links = [...cap.querySelectorAll("a")];
  const current = cap.querySelector('a[aria-current="page"]');

  const moveTo = (a) => {
    if (!a) { cap.classList.remove("has-pill"); return; }
    const c = cap.getBoundingClientRect(), r = a.getBoundingClientRect();
    pill.style.width = r.width + "px";
    pill.style.transform = `translateX(${r.left - c.left}px)`;
    cap.classList.add("has-pill");
  };
  const rest = () => moveTo(current);

  if (reduceMotion.matches) pill.style.transition = "none";
  links.forEach((a) => {
    a.addEventListener("pointerenter", () => moveTo(a));
    a.addEventListener("focus", () => moveTo(a));
  });
  cap.addEventListener("pointerleave", rest);
  cap.addEventListener("focusout", (e) => { if (!cap.contains(e.relatedTarget)) rest(); });
  window.addEventListener("resize", rest);
  // wait for the font so measurements are final
  (document.fonts?.ready || Promise.resolve()).then(rest);
}
