// Services category pages: marks the service in view in the sticky index (.svx-index) and keeps it visible there.
import { reduceMotion } from "./core.js";

export function initServices() {
  const nav = document.querySelector(".svx-index");
  if (!nav || !("IntersectionObserver" in window)) return;
  const list = nav.querySelector("ul");
  const links = [...nav.querySelectorAll("a")];
  const byId = new Map(links.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
  const seen = new Map();
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => seen.set(e.target.id, e.isIntersecting));
    const cur = [...byId.keys()].find((id) => seen.get(id));
    links.forEach((a) => a.removeAttribute("aria-current"));
    const a = cur && byId.get(cur);
    if (!a) return;
    a.setAttribute("aria-current", "true");
    if (list.scrollWidth > list.clientWidth) list.scrollTo({ left: a.offsetLeft - list.clientWidth / 2 + a.offsetWidth / 2, behavior: reduceMotion.matches ? "auto" : "smooth" });
  }, { rootMargin: "-35% 0px -55% 0px" });
  byId.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
}
