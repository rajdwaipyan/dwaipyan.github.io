// "What I build": the demo site changes state as each step scrolls through
// the middle of the screen. Plain scrolling — nothing is pinned or hijacked.
export function initBuilder() {
  const builder = document.querySelector("[data-builder]");
  if (!builder || !("IntersectionObserver" in window)) return;
  const steps = [...builder.querySelectorAll("[data-step]")];

  const activate = (step) => {
    builder.dataset.state = step.dataset.step;
    steps.forEach((s) => s.classList.toggle("is-active", s === step));
  };
  activate(steps[0]);

  // On wide screens the demo sits beside the steps, so the step at the middle of the
  // screen drives it. On narrow screens the demo is pinned at the top, so the step
  // just below it (around 70% down) is the one being read.
  const narrow = window.matchMedia("(max-width: 960px)");
  let io;
  const observe = () => {
    io?.disconnect();
    io = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) activate(entry.target);
    }, { rootMargin: narrow.matches ? "-68% 0px -28% 0px" : "-48% 0px -48% 0px" });
    steps.forEach((s) => io.observe(s));
  };
  observe();
  narrow.addEventListener?.("change", observe);
}
