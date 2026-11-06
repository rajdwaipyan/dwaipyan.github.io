// X-ray mode: the page labels its own structure (tags and component names),
// photos give way to the line drawing, screenshots fade to wireframe grey.
// Toggle with the header button or the X key.
const TARGETS = [
  [".site-header", "<header> floating bar"],
  [".nav-capsule", "<nav> capsule · sliding pill"],
  ["#top", "<section#top>"],
  ["#hero-title", "<h1> kinetic text · variable font"],
  [".hero-visual", "<figure> photo + line-art lens · 3D tilt"],
  [".path-grid", "<div> three audience pathways"],
  ["#intro", "<section#intro> words light up on scroll"],
  [".glance-grid", "<dl> counters"],
  [".ms-track", "<ol> timeline from _data/timeline.yml"],
  [".xp", "<ol> from _data/experience.yml"],
  [".edu-line", "<ol> from _data/education.yml"],
  [".cv-paper", "<article> CV from the data files · print CSS"],
  ["#build", "<section#build>"],
  ["[data-builder] .demo", "<div.demo> 4 states · scroll-driven"],
  [".room", (el) => `<section#${el.id}> layout: ${[...el.classList].find((c) => c.startsWith("layout-"))?.slice(7)}`],
  [".mock-browser", "<div.mock-browser> live-site screenshot"],
  ["#machine", "<section#machine>"],
  ["[data-machine-form]", "<form> runs in the browser"],
  ["#contact", "<section#contact>"],
  ["#brief-form", "<form> → mailto:"],
  [".site-footer", "<footer>"],
];

export function initXray() {
  const toggle = document.getElementById("xray-toggle");
  const root = document.documentElement;
  let labelled = false;

  const label = () => {
    for (const [selector, text] of TARGETS) {
      document.querySelectorAll(selector).forEach((el) => {
        el.dataset.xray = typeof text === "function" ? text(el) : text;
        if (getComputedStyle(el).position === "static") el.style.position = "relative";
      });
    }
    labelled = true;
  };

  const set = (on) => {
    if (on && !labelled) label();
    root.classList.toggle("xray", on);
    toggle?.setAttribute("aria-pressed", String(on));
  };

  toggle?.addEventListener("click", () => set(!root.classList.contains("xray")));
  document.addEventListener("keydown", (e) => {
    if (e.key !== "x" && e.key !== "X") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest("input, textarea, select, [contenteditable]")) return;
    set(!root.classList.contains("xray"));
  });
}
