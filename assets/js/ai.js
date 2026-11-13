// AI Prompt Engineering page: the live prompt console, the services browser, the before/after
// demonstration (with copy) and the process line. Everything runs in the browser — no AI API.
import { reduceMotion } from "./core.js";

export function initAI() {
  initConsole();
  initTabs(document.querySelector("[data-svc] [role=tablist]"), true);
  initDemo();
  initSteps();
}

/* ---------- accessible tabs (arrow keys, Home/End); returns a function to select by index */
function initTabs(list, vertical = false, onSelect) {
  if (!list) return null;
  const tabs = [...list.querySelectorAll("[role=tab]")];
  const G = window.gsap;
  const select = (i, focus = false) => {
    tabs.forEach((t, k) => {
      const on = k === i;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) {
        const was = panel.hidden;
        panel.hidden = !on;
        if (on && was && G && !reduceMotion.matches) {
          G.fromTo(panel.children, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "expo.out", stagger: 0.04, clearProps: "transform,opacity" });
        }
      }
    });
    if (focus) tabs[i].focus();
    onSelect?.(i);
  };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(i));
    t.addEventListener("keydown", (e) => {
      const next = vertical ? ["ArrowDown", "ArrowRight"] : ["ArrowRight"];
      const prev = vertical ? ["ArrowUp", "ArrowLeft"] : ["ArrowLeft"];
      let n = null;
      if (next.includes(e.key)) n = (i + 1) % tabs.length;
      if (prev.includes(e.key)) n = (i - 1 + tabs.length) % tabs.length;
      if (e.key === "Home") n = 0;
      if (e.key === "End") n = tabs.length - 1;
      if (n !== null) { e.preventDefault(); select(n, true); }
    });
  });
  return select;
}

/* ---------- the console: steps through the four stages on its own; pauses on hover, focus or when off screen */
function initConsole() {
  const box = document.querySelector("[data-console]");
  if (!box) return;
  const bar = box.querySelector(".console-progress span");
  const typer = box.querySelector(".cp-type");
  const full = typer?.dataset.text || "";
  const G = window.gsap;
  const animate = !!G && !reduceMotion.matches;
  let stage = 0, timer = 0, paused = false, visible = true, userTook = false;

  const play = (i) => {
    if (!animate) return;
    const panel = box.querySelector(`#cp-${i + 1}`);
    if (i === 0 && typer) {
      typer.textContent = "";
      let k = 0;
      const step = () => { if (k <= full.length) { typer.textContent = full.slice(0, k++); timer = setTimeout(step, 28); } };
      step();
    }
    if (i === 1) G.fromTo(panel.querySelectorAll(".cp-chips li"), { y: 14, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.6)", stagger: 0.12 });
    if (i === 2) G.fromTo(panel.querySelector(".cp-code"), { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 1.6, ease: "steps(6)" });
    if (i === 3) G.fromTo(panel.querySelectorAll(".cp-out > *, .cp-out li"), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "expo.out", stagger: 0.12 });
  };
  const select = initTabs(box.querySelector("[role=tablist]"), false, (i) => {
    stage = i;
    clearTimeout(timer);
    if (typer && i !== 0) typer.textContent = full;
    play(i);
    restartBar();
  });
  // a person clicking a tab takes over; autoplay stops until they leave the console
  box.querySelectorAll("[role=tab]").forEach((t) => t.addEventListener("click", () => { userTook = true; }));

  let tween = null;
  const restartBar = () => {
    if (!animate) return;
    tween?.kill();
    G.set(bar, { scaleX: 0 });
    tween = G.to(bar, { scaleX: 1, duration: stage === 0 ? 4.2 : 3.4, ease: "none", paused: paused || !visible || userTook, onComplete: () => select((stage + 1) % 4) });
  };
  const sync = () => { if (!tween) return; (paused || !visible || userTook) ? tween.pause() : tween.resume(); };
  box.addEventListener("pointerenter", () => { paused = true; sync(); });
  box.addEventListener("pointerleave", () => { paused = false; userTook = false; sync(); });
  box.addEventListener("focusin", () => { paused = true; sync(); });
  box.addEventListener("focusout", (e) => { if (!box.contains(e.relatedTarget)) { paused = false; sync(); } });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }).observe(box);
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; sync(); });
  if (animate) { play(0); restartBar(); }
}

/* ---------- before/after demonstration */
function initDemo() {
  const picks = [...document.querySelectorAll("[data-demo]")];
  const panels = [...document.querySelectorAll("[data-demo-panel]")];
  const G = window.gsap;
  picks.forEach((b) => b.addEventListener("click", () => {
    picks.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    panels.forEach((p) => {
      const on = p.dataset.demoPanel === b.dataset.demo;
      p.hidden = !on;
      if (on && G && !reduceMotion.matches) {
        G.fromTo(p.querySelector(".demo-basic"), { x: -24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: "expo.out" });
        G.fromTo(p.querySelector(".demo-eng"), { x: 24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, ease: "expo.out", delay: 0.08 });
      }
    });
    window.ScrollTrigger?.refresh();
  }));
  // highlight the section labels (lines written in capitals) in the engineered prompt
  document.querySelectorAll(".demo-code").forEach((pre) => {
    pre.innerHTML = pre.innerHTML.replace(/^([A-Z][A-Z &amp;]{2,})$/gm, '<span class="t-k">$1</span>');
  });
  document.querySelectorAll("[data-copy]").forEach((btn) => btn.addEventListener("click", async () => {
    const src = document.querySelector(btn.dataset.copy);
    if (!src) return;
    const text = src.textContent;
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch {
      const r = document.createRange(); r.selectNodeContents(src);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      sel.removeAllRanges();
    }
    btn.querySelector(".dc-idle").hidden = ok;
    btn.querySelector(".dc-done").hidden = !ok;
    btn.querySelector(".dc-done").textContent = ok ? "Copied" : "Select and copy";
    btn.classList.toggle("is-done", ok);
    setTimeout(() => { btn.querySelector(".dc-idle").hidden = false; btn.querySelector(".dc-done").hidden = true; btn.classList.remove("is-done"); }, 2200);
  }));
}

/* ---------- process: the line fills and each step lights up as you scroll */
function initSteps() {
  const list = document.querySelector("[data-steps]");
  if (!list) return;
  const ST = window.ScrollTrigger;
  if (!ST || reduceMotion.matches) { list.classList.add("is-done"); list.style.setProperty("--fill", "1"); return; }
  const steps = [...list.children];
  ST.create({
    trigger: list, start: "top 75%", end: "bottom 55%", scrub: 0.5,
    onUpdate: (self) => {
      list.style.setProperty("--fill", self.progress.toFixed(3));
      steps.forEach((s, i) => s.classList.toggle("is-on", self.progress >= i / steps.length - 0.01));
    },
  });
}
