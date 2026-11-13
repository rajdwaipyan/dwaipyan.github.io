// AI Prompt Engineering page. Everything here runs in the browser — there is no AI API, no account
// system and no server: copying, downloading and composing messages are all done on the visitor's device.
//
//   console        the hero demo that steps Input → Engineer → Structure → Output on its own
//   marquee        bands that drift sideways; pause on hover/focus, speed up briefly with scrolling
//   subnav         the sticky "on this page" index, marking the current section
//   services       the tab browser, with links into pricing and the prompt library
//   library        search, category + tool filters, sort, a prompt viewer (dialog), copy and download
//   try            the prompt builder and the before/after examples
//   setup          per-tool templates with copy
//   pricing        packages / comparison view, the package finder, "start with this package"
//   enquiry        writes the enquiry into an email or a WhatsApp message
import { reduceMotion } from "./core.js";
import { lenis } from "./motion.js";

const EMAIL = "rajdwaipayan@gmail.com";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const G = () => (reduceMotion.matches ? null : window.gsap);

export function initAI() {
  if (!$("[data-console]") && !$("[data-lib]")) return;
  initConsole();
  initMarquees();
  initSubnav();
  initServices();
  initLibrary();
  initTry();
  initSetup();
  initSteps();
  initPricing();
  initEnquiry();
  initCopyFrom();
}

/* ---------- shared helpers */
async function copy(text) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch { /* fall back */ }
  const ta = document.createElement("textarea");
  ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
  document.body.appendChild(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { ok = false; }
  ta.remove();
  return ok;
}
// a button briefly says what happened; a live region tells screen readers
function feedback(btn, ok, status, okText = "Copied") {
  if (!btn.dataset.label) btn.dataset.label = btn.textContent;
  btn.textContent = ok ? okText : "Couldn't copy";
  btn.classList.toggle("is-done", ok);
  if (status) status.textContent = ok ? `${okText}.` : "Couldn't copy automatically — select the text and copy it instead.";
  clearTimeout(btn._t);
  btn._t = setTimeout(() => { btn.textContent = btn.dataset.label; btn.classList.remove("is-done"); if (status) status.textContent = ""; }, 2000);
}
function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// section labels (lines in capitals, "# Heading", <tag>) and [placeholders] get colour
function highlight(text) {
  return esc(text)
    .replace(/^([A-Z][A-Z &amp;/'-]{2,})$/gm, '<span class="t-k">$1</span>')
    .replace(/^(#{1,3} .+)$/gm, '<span class="t-k">$1</span>')
    .replace(/^(&lt;\/?[a-z_]+&gt;)$/gm, '<span class="t-tag">$1</span>')
    .replace(/\[([^\]\n]{1,80})\]/g, '<mark>[$1]</mark>');
}
function scrollToEl(el) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -((document.getElementById("site-header")?.offsetHeight || 68) + 12) });
  else el.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
}

/* ---------- accessible tabs (arrow keys, Home/End); returns a function that selects by index */
function initTabs(list, { vertical = false, onSelect } = {}) {
  if (!list) return null;
  const tabs = $$("[role=tab]", list);
  const select = (i, focus = false) => {
    tabs.forEach((t, k) => {
      const on = k === i;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (!panel) return;
      const was = panel.hidden;
      panel.hidden = !on;
      const g = G();
      if (on && was && g) g.fromTo(panel.children, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "expo.out", stagger: 0.04, clearProps: "transform,opacity" });
    });
    if (focus) tabs[i].focus();
    onSelect?.(i);
    window.ScrollTrigger?.refresh();
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

/* ---------- the console: steps through the four stages; pauses on hover, focus, or when off screen */
function initConsole() {
  const box = $("[data-console]");
  if (!box) return;
  const bar = $(".console-progress span", box);
  const typer = $(".cp-type", box);
  const full = typer?.dataset.text || "";
  const g = G();
  let stage = 0, timer = 0, paused = false, visible = true, userTook = false, tween = null;

  const play = (i) => {
    if (!g) return;
    const panel = $(`#cp-${i + 1}`, box);
    if (i === 0 && typer) {
      typer.textContent = "";
      let k = 0;
      const step = () => { if (k <= full.length) { typer.textContent = full.slice(0, k++); timer = setTimeout(step, 28); } };
      step();
    }
    if (i === 1) g.fromTo($$(".cp-chips li", panel), { y: 14, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.6)", stagger: 0.12 });
    if (i === 2) g.fromTo($(".cp-code", panel), { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 1.6, ease: "steps(6)" });
    if (i === 3) g.fromTo($$(".cp-out > *, .cp-out li", panel), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "expo.out", stagger: 0.12 });
  };
  const restartBar = () => {
    if (!g) return;
    tween?.kill();
    g.set(bar, { scaleX: 0 });
    tween = g.to(bar, { scaleX: 1, duration: stage === 0 ? 4.2 : 3.4, ease: "none", paused: paused || !visible || userTook, onComplete: () => select((stage + 1) % 4) });
  };
  const select = initTabs($("[role=tablist]", box), {
    onSelect: (i) => {
      stage = i;
      clearTimeout(timer);
      if (typer && i !== 0) typer.textContent = full;
      play(i);
      restartBar();
    },
  });
  $$("[role=tab]", box).forEach((t) => t.addEventListener("click", () => { userTook = true; tween?.pause(); }));
  const sync = () => { if (tween) (paused || !visible || userTook) ? tween.pause() : tween.resume(); };
  box.addEventListener("pointerenter", () => { paused = true; sync(); });
  box.addEventListener("pointerleave", () => { paused = false; userTook = false; sync(); });
  box.addEventListener("focusin", () => { paused = true; sync(); });
  box.addEventListener("focusout", (e) => { if (!box.contains(e.relatedTarget)) { paused = false; sync(); } });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }).observe(box);
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; sync(); });
  if (g) { play(0); restartBar(); }
}

/* ---------- marquees: CSS moves them (see .mq in style.css); scrolling briefly speeds them up */
function initMarquees() {
  const bands = $$("[data-marquee]");
  if (!bands.length || reduceMotion.matches) return;
  document.documentElement.classList.add("mq-on");
  const anims = () => bands.flatMap((b) => b.getAnimations ? b.getAnimations({ subtree: true }) : []);
  let boost = 1, raf = 0;
  const apply = () => {
    boost += (1 - boost) * 0.06;
    anims().forEach((a) => { a.playbackRate = boost; });
    raf = Math.abs(boost - 1) > 0.01 ? requestAnimationFrame(apply) : 0;
  };
  const kick = (v) => {
    boost = Math.min(4, 1 + Math.abs(v) / 18);
    if (!raf) raf = requestAnimationFrame(apply);
  };
  if (lenis) lenis.on("scroll", ({ velocity }) => kick(velocity));
  else { let last = scrollY; addEventListener("scroll", () => { kick(scrollY - last); last = scrollY; }, { passive: true }); }
  // off-screen bands stop animating
  const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("mq-idle", !e.isIntersecting)));
  bands.forEach((b) => io.observe(b));
}

/* ---------- sticky section index */
function initSubnav() {
  const nav = $("[data-subnav]");
  if (!nav) return;
  const links = $$(".ai-sub-links a", nav);
  const list = $(".ai-sub-links", nav);
  const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const sections = [...map.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  const seen = new Map();
  const mark = () => {
    let cur = null;
    sections.forEach((s) => { if (seen.get(s)) cur = cur || s; });
    links.forEach((a) => a.removeAttribute("aria-current"));
    if (!cur) return;
    const a = map.get(cur.id);
    a.setAttribute("aria-current", "true");
    // keep the current link visible in the scrollable row (phones) without moving the page
    if (list.scrollWidth > list.clientWidth) list.scrollTo({ left: a.offsetLeft - 16, behavior: reduceMotion.matches ? "auto" : "smooth" });
  };
  const io = new IntersectionObserver((es) => { es.forEach((e) => seen.set(e.target, e.isIntersecting)); mark(); }, { rootMargin: "-140px 0px -55% 0px" });
  sections.forEach((s) => io.observe(s));
  new IntersectionObserver(([e]) => nav.classList.toggle("is-stuck", e.intersectionRatio < 1 && e.boundingClientRect.top < 200), { threshold: [1], rootMargin: "-1px 0px 0px 0px" }).observe(nav);
}

/* ---------- services */
function initServices() {
  initTabs($("[data-svc] [role=tablist]"), { vertical: true });
}

/* ---------- prompt library */
let openPrompt = null;   // set by initLibrary; used by marquee cards and links

function initLibrary() {
  const root = $("[data-lib]");
  const dataEl = $("#lib-data");
  if (!root || !dataEl) return;
  const prompts = JSON.parse(dataEl.textContent);
  const byId = new Map(prompts.map((p) => [p.id, p]));
  const cats = new Map($$(".lib-cats [data-cat]", root).map((b) => [b.dataset.cat, b.querySelector("span").textContent]));
  const grid = $("#lib-grid"), cards = $$(".lib-card", grid);
  const q = $("#lib-q"), tool = $("#lib-tool"), sort = $("#lib-sort");
  const count = $("#lib-count"), empty = $("#lib-empty"), status = $("#lib-status");
  const catBtns = $$(".lib-cats [data-cat]", root);
  const norm = (s) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  const hay = new Map(prompts.map((p) => [p.id, norm([p.id.replace(/-/g, " "), p.title, p.summary, p.tools.join(" "), cats.get(p.category) || "", p.prompt].join(" "))]));
  let cat = "all", visible = cards.map((c) => c.dataset.id);

  const apply = (animate = true) => {
    const words = norm(q.value.trim()).split(/\s+/).filter(Boolean);
    const t = tool.value;
    const shown = cards.filter((c) => {
      const p = byId.get(c.dataset.id);
      const ok = (cat === "all" || p.category === cat) && (!t || p.tools.includes(t)) && words.every((w) => hay.get(p.id).includes(w));
      c.hidden = !ok;
      return ok;
    });
    const key = sort.value;
    shown.sort((a, b) => key === "az" ? a.querySelector(".lib-open").textContent.localeCompare(b.querySelector(".lib-open").textContent)
      : key === "short" ? a.dataset.len - b.dataset.len : a.dataset.order - b.dataset.order);
    shown.forEach((c) => grid.appendChild(c));
    visible = shown.map((c) => c.dataset.id);
    empty.hidden = shown.length > 0;
    const filtered = cat !== "all" || t || words.length;
    count.textContent = shown.length === 0 ? "No prompts match" : filtered ? `Showing ${shown.length} of ${cards.length} prompts` : `Showing all ${cards.length} prompts`;
    const g = G();
    if (animate && g && shown.length) g.fromTo(shown.slice(0, 12), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "expo.out", stagger: 0.03, clearProps: "transform,opacity" });
    window.ScrollTrigger?.refresh();
  };
  const setCat = (c, animate = true) => {
    cat = cats.has(c) ? c : "all";
    catBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cat === cat)));
    apply(animate);
  };
  catBtns.forEach((b) => b.addEventListener("click", () => setCat(b.dataset.cat)));
  let deb = 0;
  q.addEventListener("input", () => { clearTimeout(deb); deb = setTimeout(() => apply(false), 120); });
  tool.addEventListener("change", () => apply());
  sort.addEventListener("change", () => apply());
  $("#lib-reset").addEventListener("click", () => { q.value = ""; tool.value = ""; sort.value = "order"; setCat("all"); q.focus(); });
  // "/" or Ctrl/Cmd+K jumps to the search box
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
      if (dlg.open) return;
      e.preventDefault();
      scrollToEl(root);
      q.focus({ preventScroll: true });
    }
  });
  // "Related free prompts" links from the services browser set the category
  $$("[data-lib-cat]").forEach((a) => a.addEventListener("click", () => { q.value = ""; tool.value = ""; setCat(a.dataset.libCat, false); }));

  /* quick copy on a card */
  $$("[data-copy-id]", grid).forEach((b) => b.addEventListener("click", async () => {
    const p = byId.get(b.dataset.copyId);
    feedback(b, await copy(p.prompt), status, "Copied");
  }));

  /* the viewer */
  const dlg = $("#lib-dlg");
  const code = $("#dlg-code"), pos = $("#dlg-pos"), dstatus = $("#dlg-status");
  let current = null, opener = null, list = [];
  const fill = (p) => {
    current = p;
    $("#dlg-cat").textContent = cats.get(p.category) || "";
    $("#dlg-title").textContent = p.title;
    $("#dlg-sum").textContent = p.summary;
    $("#dlg-tools").textContent = "Works well with " + p.tools.join(", ");
    code.innerHTML = highlight(p.prompt);
    code.scrollTop = 0;
    const i = list.indexOf(p.id);
    pos.textContent = `${i + 1} / ${list.length}`;
    $("#dlg-prev").disabled = i <= 0;
    $("#dlg-next").disabled = i >= list.length - 1;
    $("#dlg-ask").dataset.prompt = p.title;
    if (history.replaceState) history.replaceState(null, "", "#prompt-" + p.id);
  };
  const close = () => { if (dlg.open) dlg.close(); };
  dlg.addEventListener("close", () => {
    document.documentElement.classList.remove("dlg-open");
    lenis?.start();
    if (history.replaceState && location.hash.startsWith("#prompt-")) history.replaceState(null, "", location.pathname + location.search);
    opener?.focus?.({ preventScroll: true });
  });
  openPrompt = (id, from) => {
    const p = byId.get(id);
    if (!p) return;
    opener = from || document.activeElement;
    list = visible.includes(id) ? visible : prompts.map((x) => x.id);
    fill(p);
    if (!dlg.open) {
      lenis?.stop();
      document.documentElement.classList.add("dlg-open");
      dlg.showModal();
      const g = G();
      if (g) g.fromTo($(".dlg-in", dlg), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: "expo.out", clearProps: "transform,opacity" });
    }
    $("#dlg-copy").focus();
  };
  $$("[data-open]").forEach((b) => b.addEventListener("click", () => openPrompt(b.dataset.open, b)));
  $$("[data-close]", dlg).forEach((b) => b.addEventListener("click", close));
  dlg.addEventListener("click", (e) => { if (e.target === dlg) close(); });   // the backdrop
  const step = (d) => { const i = list.indexOf(current.id) + d; if (list[i]) fill(byId.get(list[i])); };
  $("#dlg-prev").addEventListener("click", () => step(-1));
  $("#dlg-next").addEventListener("click", () => step(1));
  dlg.addEventListener("keydown", (e) => {
    if (e.target.closest("pre")) return;
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });
  $("#dlg-copy").addEventListener("click", async (e) => feedback(e.currentTarget, await copy(current.prompt), dstatus));
  $("#dlg-dl").addEventListener("click", (e) => { download(current.id + ".txt", current.prompt + "\n"); feedback(e.currentTarget, true, dstatus, "Downloaded"); });
  $("#dlg-ask").addEventListener("click", () => {
    prefillEnquiry({ message: `I'd like a version of the "${current.title}" prompt tailored to my business.\n\nWhat I need it for: ` });
    close();
  });

  // a shared link such as …/ai-prompt-engineering/#prompt-cold-email opens that prompt
  const fromHash = () => { const m = location.hash.match(/^#prompt-([\w-]+)$/); if (m && byId.has(m[1])) { scrollToEl(root); openPrompt(m[1], $(`.lib-open[data-open="${m[1]}"]`)); } };
  fromHash();
  addEventListener("hashchange", fromHash);
  apply(false);
}

/* ---------- try it: builder + before/after */
function initTry() {
  initTabs($(".try-tabs"));
  initBuilder();
  // before/after examples
  const picks = $$("[data-demo]");
  const panels = $$("[data-demo-panel]");
  picks.forEach((b) => b.addEventListener("click", () => {
    picks.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    panels.forEach((p) => {
      const on = p.dataset.demoPanel === b.dataset.demo;
      p.hidden = !on;
      const g = G();
      if (on && g) {
        g.fromTo($(".demo-basic", p), { x: -24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: "expo.out" });
        g.fromTo($(".demo-eng", p), { x: 24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, ease: "expo.out", delay: 0.08 });
      }
    });
    window.ScrollTrigger?.refresh();
  }));
  $$(".demo-code").forEach((pre) => { pre.innerHTML = highlight(pre.textContent); });
}

const TONES = { plain: "plain and direct", friendly: "warm and friendly", formal: "formal and precise", persuasive: "persuasive but honest — no hype or superlatives" };
const FORMATS = {
  short: "A short paragraph.", bullets: "A bulleted list, one idea per bullet.", steps: "Numbered steps, each starting with a verb.",
  table: "A table with clear column headings.", email: "An email: a subject line, then the body.", json: "Valid JSON only — no text before or after it.",
  code: "Code with brief comments, followed by a short explanation of the decisions you made.",
};

function buildPrompt(v) {
  const task = v.task || "[Describe the task — what you want done]";
  const role = v.role || "[an expert in this task]";
  const audience = v.audience || "[who will read or use the result]";
  const context = v.context || "[Background the AI cannot guess: business, product, facts, links or data]";
  const rules = [`Tone: ${TONES[v.tone]}.`];
  if (v.noguess) rules.push('If information is missing, write "not found" instead of guessing.');
  if (v.mark) rules.push("Mark anything you had to assume with [CHECK].");
  if (v.cite) rules.push("Cite a source for every factual claim.");
  rules.push("Do not invent names, numbers, prices or results.");
  let format = FORMATS[v.format];
  if (v.length) format += ` Keep it under ${v.length} words.`;
  const end = v.ask ? "If anything essential is unclear, ask me up to three questions before you start." : "";

  const parts = [["ROLE", `You are ${/^(a|an|the)\s/i.test(role) || role.startsWith("[") ? role : "a " + role}.`], ["CONTEXT", context], ["TASK", task], ["AUDIENCE", audience], ["RULES", rules.map((r) => "- " + r).join("\n")], ["OUTPUT", format]];

  if (v.tool === "code") {
    parts[0][1] = `You are ${role.startsWith("[") ? "a senior software engineer" : role} working in this repository.`;
    parts[4][1] += "\n- Follow the existing structure and conventions; do not add dependencies without asking.\n- Before changing code, outline your plan and list the files you will touch.\n- Run the tests and linter when you finish and report the results.";
  }
  if (v.tool === "builder") {
    parts[4][1] += "\n- Mobile first, accessible contrast, visible focus states.\n- Show me the section outline first; do not write code until I approve it.";
  }
  if (v.tool === "claude") {
    const tag = { ROLE: "role", CONTEXT: "context", TASK: "task", AUDIENCE: "audience", RULES: "rules", OUTPUT: "output_format" };
    return parts.map(([k, b]) => `<${tag[k]}>\n${b}\n</${tag[k]}>`).join("\n\n") + (end ? "\n\n" + end : "");
  }
  if (v.tool === "chatgpt" || v.tool === "gemini" || v.tool === "builder") {
    return parts.map(([k, b]) => `# ${k[0] + k.slice(1).toLowerCase()}\n${b}`).join("\n\n") + (end ? "\n\n" + end : "");
  }
  return parts.map(([k, b]) => `${k}\n${b}`).join("\n\n") + (end ? "\n\n" + end : "");
}

function initBuilder() {
  const form = $("#bld-form");
  if (!form) return;
  const out = $("#bld-code"), meta = $("#bld-meta"), status = $("#bld-status");
  const f = Object.fromEntries($$("[name]", form).map((el) => [el.name, el]));
  const read = () => {
    const n = parseInt(f.length.value, 10);
    return {
      task: f.task.value.trim(), tool: f.tool.value, role: f.role.value.trim(), audience: f.audience.value.trim(),
      tone: f.tone.value, context: f.context.value.trim(), format: f.format.value, length: n >= 10 ? n : 0,
      ask: f.ask.checked, noguess: f.noguess.checked, mark: f.mark.checked, cite: f.cite.checked,
    };
  };
  let text = "";
  const render = () => {
    text = buildPrompt(read());
    out.innerHTML = highlight(text);
    const words = text.split(/\s+/).filter(Boolean).length;
    const open = (text.match(/\[[^\]\n]+\]/g) || []).filter((m) => m !== "[CHECK]").length;
    meta.textContent = `· ${words} words${open ? ` · ${open} to fill in` : ""}`;
  };
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  $("#bld-copy").addEventListener("click", async (e) => feedback(e.currentTarget, await copy(text), status));
  $("#bld-reset").addEventListener("click", () => {
    $$("[name]", form).forEach((el) => { if (el.type === "checkbox") el.checked = el.defaultChecked; else if (el.tagName === "SELECT") el.selectedIndex = 0; else el.value = ""; });
    render(); f.task.focus();
  });
  $("#bld-send").addEventListener("click", () => {
    const v = read();
    prefillEnquiry({ tool: { chatgpt: "ChatGPT", claude: "Claude", gemini: "Gemini" }[v.tool] || "", message: `I'd like this prompt engineered and tested properly.\n\nTask: ${v.task || "(describe it here)"}\n\nMy draft from the builder:\n${text}` });
  });
  render();
}

/* ---------- setup templates */
function initSetup() {
  initTabs($(".setup-tabs"));
  $$(".setup-code pre").forEach((pre) => { pre.innerHTML = highlight(pre.textContent); });
}

/* ---------- [data-copy-from="#id"] buttons copy that element's text */
function initCopyFrom() {
  $$("[data-copy-from]").forEach((b) => b.addEventListener("click", async () => {
    const src = $(b.dataset.copyFrom);
    if (!src) return;
    const status = b.closest(".try-panel") ? $("#demo-status") : $("#setup-status");
    feedback(b, await copy(src.textContent), status);
  }));
}

/* ---------- process: the line fills and each step lights up as you scroll */
function initSteps() {
  const list = $("[data-steps]");
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

/* ---------- pricing */
function initPricing() {
  const views = $$(".price-view [data-view]");
  const panels = $$("[data-view-panel]");
  views.forEach((b) => b.addEventListener("click", () => {
    views.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    panels.forEach((p) => {
      const on = p.dataset.viewPanel === b.dataset.view;
      const was = p.hidden;
      p.hidden = !on;
      const g = G();
      if (on && was && g) g.fromTo(p, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "expo.out", clearProps: "transform,opacity" });
    });
    window.ScrollTrigger?.refresh();
  }));
  // every "start with / choose" link selects that package in the enquiry form
  $$("[data-pick]").forEach((a) => a.addEventListener("click", () => {
    if (a.getAttribute("href") === "#pricing") { markPackage(a.dataset.pick); return; }
    prefillEnquiry({ pkg: a.dataset.pick });
  }));

  // package finder
  const finder = $("#finder");
  if (!finder) return;
  const name = $("#finder-name"), why = $("#finder-why"), go = $("#finder-go");
  const names = Object.fromEntries($$(".price").map((li) => [li.dataset.pkg, li.querySelector(".price-name").textContent]));
  finder.addEventListener("change", () => {
    const a = [1, 2, 3].map((i) => finder.querySelector(`input[name="q${i}"]:checked`)?.value || "");
    if (a.every((x) => !x)) return;
    let id, reason;
    if (a[2] === "yes") { id = "system"; reason = "A shared, documented system for several people or departments."; }
    else if (a[1] === "yes") { id = "agents"; reason = "Agent instructions, tool rules and multi-step workflow prompts."; }
    else if (a[0] === "yes") { id = "optimise"; reason = "Your existing prompts, restructured for steadier results."; }
    else if (a.filter(Boolean).length < 3) { name.textContent = "Keep going"; why.textContent = "Answer the remaining questions for a suggestion."; go.hidden = true; return; }
    else { id = "custom"; reason = "New prompts written and tested for your own tasks and tools."; }
    name.textContent = names[id];
    why.textContent = reason + " Only a starting point — the quote follows what you actually need.";
    go.hidden = false;
    go.dataset.pick = id;
    markPackage(id);
  });
  go.addEventListener("click", () => prefillEnquiry({ pkg: go.dataset.pick }));
}
function markPackage(id) {
  $$(".price").forEach((li) => li.classList.toggle("is-picked", li.dataset.pkg === id));
}

/* ---------- enquiry form: writes an email or WhatsApp message; nothing is sent from this page */
function prefillEnquiry({ pkg, tool, message } = {}) {
  const form = $("#enq");
  if (!form) return;
  if (pkg !== undefined) { form.elements.package.value = pkg; markPackage(pkg); }
  if (tool) form.elements.tool.value = tool;
  if (message && !form.elements.message.value.trim()) form.elements.message.value = message;
  else if (message) form.elements.message.value += "\n\n" + message;
  form.classList.add("is-flash");
  setTimeout(() => form.classList.remove("is-flash"), 1200);
  // the link's own href (#start) scrolls; focus the first empty field once it arrives
  setTimeout(() => (form.elements.name.value ? form.elements.message : form.elements.name).focus({ preventScroll: true }), lenis ? 900 : 50);
}

function initEnquiry() {
  const form = $("#enq");
  if (!form) return;
  const err = $("#enq-error"), done = $("#enq-done");
  const f = form.elements;
  const pkgText = () => (f.package.value ? f.package.options[f.package.selectedIndex].text : "");
  const check = () => {
    const missing = [];
    [["name", "your name"], ["message", "what the AI should do"]].forEach(([n, label]) => {
      const bad = !f[n].value.trim();
      f[n].setAttribute("aria-invalid", String(bad));
      if (bad) missing.push(label);
    });
    if (missing.length) {
      err.hidden = false;
      err.textContent = "Please add " + missing.join(" and ") + ".";
      form.querySelector('[aria-invalid="true"]').focus();
      return false;
    }
    err.hidden = true;
    return true;
  };
  const body = () => [
    "Hi Dwaipyan,", "", f.message.value.trim(), "",
    pkgText() ? `Package: ${pkgText()}` : "Package: not sure yet",
    f.tool.value ? `Main AI tool: ${f.tool.value}` : "",
    `Name: ${f.name.value.trim()}`, "", "(Sent from the AI Prompt Engineering page)",
  ].filter((l, i, a) => l !== "" || (a[i - 1] !== "" && i > 0)).join("\n");
  const subject = () => `AI prompt engineering${pkgText() ? " — " + pkgText().split(" — ")[0] : ""} — ${f.name.value.trim()}`;
  const enc = (s) => encodeURIComponent(s);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!check()) return;
    location.href = `mailto:${EMAIL}?subject=${enc(subject())}&body=${enc(body())}`;
    done.textContent = "Your email app should open with the message ready to send. If nothing happened, use “Copy message” and email rajdwaipayan@gmail.com.";
  });
  $("#enq-wa").addEventListener("click", () => {
    if (!check()) return;
    const num = ($('.ai-direct a[href^="https://wa.me/"]')?.getAttribute("href").match(/wa\.me\/(\d+)/) || [])[1];
    if (!num) return;
    window.open(`https://wa.me/${num}?text=${enc(body())}`, "_blank", "noopener");
    done.textContent = "WhatsApp opened in a new tab with your message — press send there.";
  });
  $("#enq-copy").addEventListener("click", async (e) => {
    if (!check()) return;
    const ok = await copy(`To: ${EMAIL}\nSubject: ${subject()}\n\n${body()}`);
    feedback(e.currentTarget, ok, null);
    done.textContent = ok ? "Message copied — paste it into an email to rajdwaipayan@gmail.com." : "Couldn't copy automatically.";
  });
  f.package.addEventListener("change", () => markPackage(f.package.value));
  ["name", "message"].forEach((n) => f[n].addEventListener("input", () => { if (f[n].value.trim()) f[n].removeAttribute("aria-invalid"); }));
}
