// X-ray mode: the page labels its own structure (tags and component names),
// photos give way to the line drawing, screenshots fade to wireframe grey.
// Toggle with the header button or the X key.
const TARGETS = [
  [".site-header", "<header>"],
  [".primary-nav", "<nav>"],
  ["#top", "<section#top> hero"],
  ["#hero-title", "<h1> kinetic text · variable font"],
  ["#portrait", "<figure> photo + line-art layer"],
  ["#intro", "<section#intro> words light up on scroll"],
  ["#guide", "<aside#guide> inline SVG · Web Audio · CSS keyframes"],
  ["#build", "<section#build>"],
  ["[data-builder] .demo", "<div.demo> 4 states · scroll-driven"],
  ["#work .work-intro", "<section#work>"],
  [".room", (el) => `<section#${el.id}> layout: ${[...el.classList].find((c) => c.startsWith("layout-"))?.slice(7)}`],
  [".mock-browser", "<div.mock-browser> live-site screenshot"],
  [".mock-phone", "<div.mock-phone>"],
  ["#machine", "<section#machine>"],
  ["[data-machine-form]", "<form> runs in the browser"],
  [".machine-steps", "<ol> webhook → n8n → CRM → email"],
  ["#about", "<section#about>"],
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
