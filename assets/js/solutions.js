// /solutions/ — lifecycle, practices, industries, the Business Builder and the project inquiry.
// Works without any server. If _data/solutions.yml has an `api` (tools/hostinger-api), the inquiry is also
// stored and emailed by that server, and the blueprint can be refined by an AI model there.
import { reduceMotion } from "./core.js";
import { lenis } from "./motion.js";
import { analyse, blueprint } from "./biz-planner.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const EMAIL = "rajdwaipayan@gmail.com";
const PREFILL = "builder-prefill";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const G = () => (reduceMotion.matches ? null : window.gsap);
const scrollToEl = (el, focus) => {
  if (!el) return;
  const off = -((document.getElementById("site-header")?.offsetHeight || 68) + 12);
  if (lenis) lenis.scrollTo(el, { offset: off }); else el.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
  if (focus) setTimeout(() => focus.focus({ preventScroll: true }), lenis ? 900 : 60);
};
async function copy(text) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch { /* fall back */ }
  const ta = Object.assign(document.createElement("textarea"), { value: text });
  ta.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand("copy"); } catch { ok = false; } ta.remove(); return ok;
}
function download(name, text, type = "text/markdown") {
  const url = URL.createObjectURL(new Blob([text], { type: type + ";charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const flash = (btn, text) => { if (!btn.dataset.l) btn.dataset.l = btn.textContent; btn.textContent = text; clearTimeout(btn._t); btn._t = setTimeout(() => { btn.textContent = btn.dataset.l; }, 1800); };

export function initSolutions() {
  const dataEl = $("#sol-data");
  if (!dataEl) return;
  const data = JSON.parse(dataEl.textContent);
  const api = (data.api || "").trim();
  initTabs($(".life-track"), (i) => { $(".life-track")?.style.setProperty("--k", String(i / Math.max(1, data.stages.length - 1))); });
  initTabs($(".ind-tabs"));
  initCats();
  const builder = initBuilderUI(data, api);
  initInquiry(data, api, builder);

  // hero strip and lifecycle links open the matching stage
  $$("[data-stage-link]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    const tab = document.getElementById("stage-" + a.dataset.stageLink);
    tab?.click(); scrollToEl($("#lifecycle"), tab);
  }));
  // links to a practice open it
  $$("[data-open-cat]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); openCat(a.dataset.openCat, true); }));
  // "Plan a … business" starts the builder with that industry
  $$("[data-plan-industry]").forEach((b) => b.addEventListener("click", () => {
    const ind = data.industries.find((i) => i.id === b.dataset.planIndustry);
    builder.start(`I want to establish or grow a ${ind.title.toLowerCase()} business.`, { industry: ind.id });
  }));
  // a deep link like #sol-crm opens that practice
  const fromHash = () => { const m = location.hash.match(/^#sol-([\w-]+)$/); if (m) openCat(m[1], true); };
  fromHash(); addEventListener("hashchange", fromHash);
}

/* ---------- accessible tabs */
function initTabs(list, onSelect) {
  if (!list) return;
  const tabs = $$("[role=tab]", list);
  const select = (i, focus) => {
    tabs.forEach((t, k) => {
      const on = k === i, p = document.getElementById(t.getAttribute("aria-controls"));
      t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1;
      const was = p.hidden; p.hidden = !on;
      const g = G(); if (on && was && g) g.fromTo(p.children, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: "expo.out", stagger: 0.05, clearProps: "transform,opacity" });
    });
    if (focus) tabs[i].focus();
    onSelect?.(i); window.ScrollTrigger?.refresh();
  };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(i));
    t.addEventListener("keydown", (e) => {
      const n = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (n === undefined) return; e.preventDefault(); select((n + tabs.length) % tabs.length, true);
    });
  });
}

/* ---------- the twelve practices: one open at a time */
let openCat = () => {};
function initCats() {
  const grid = $("[data-cats]");
  if (!grid) return;
  grid.classList.add("is-js");
  const cats = $$(".cat", grid);
  const set = (li, on) => {
    li.classList.toggle("is-open", on);
    $(".cat-btn", li).setAttribute("aria-expanded", String(on));
    const body = $(".cat-body", li);
    if (on) { const g = G(); if (g) g.fromTo(body, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: "expo.out", clearProps: "transform,opacity" }); }
  };
  cats.forEach((li) => $(".cat-btn", li).addEventListener("click", () => {
    const on = !li.classList.contains("is-open");
    cats.forEach((x) => set(x, x === li && on));
    window.ScrollTrigger?.refresh();
  }));
  openCat = (id, scroll) => {
    const li = document.getElementById("sol-" + id); if (!li) return;
    cats.forEach((x) => set(x, x === li));
    if (scroll) scrollToEl(li, $(".cat-btn", li));
  };
}

/* ---------- Business Builder */
function initBuilderUI(data, api) {
  const box = $("[data-bb]");
  if (!box) return { start() {} };
  const askForm = $("#bb-ask"), text = $("#bb-text"), qs = $("#bb-qs"), out = $("#bb-out"), bp = $("#bp");
  const err = $("#bb-error"), understood = $("#bb-understood"), status = $("#bb-status");
  let current = null, guess = null;

  const val = (name) => qs.querySelector(`input[name="${name}"]:checked`)?.value || "";
  const setVal = (name, v) => { if (v == null || v === "") return; const r = qs.querySelector(`input[name="${name}"][value="${v}"]`); if (r) r.checked = true; };

  const analyseNow = (presets = {}) => {
    const t = text.value.trim();
    if (t.split(/\s+/).length < 3) { text.setAttribute("aria-invalid", "true"); text.focus(); text.placeholder = "A sentence or two is enough — what is the business and what do you need?"; return; }
    text.removeAttribute("aria-invalid");
    guess = analyse(t, data);
    qs.reset();
    setVal("industry", presets.industry || guess.industry); setVal("stage", guess.stage); setVal("market", guess.market); setVal("size", guess.size);
    const ind = data.industries.find((i) => i.id === (presets.industry || guess.industry));
    const goals = guess.goals.map((g) => data.goals.find((x) => x.id === g)?.label.toLowerCase()).filter(Boolean);
    understood.textContent = ind || goals.length
      ? `I've understood: ${[ind ? ind.title : null, goals.length ? goals.join(", ") : null].filter(Boolean).join(" — ")}. Check the answers below and fill in what's missing.`
      : "I couldn't tell the industry or goal from that — choose the closest answers below.";
    // only the questions the description didn't answer stay open; the rest are shown answered
    $$(".bb-q", qs).forEach((f) => f.classList.toggle("is-answered", !!val(f.dataset.q)));
    askForm.hidden = true; qs.hidden = false; out.hidden = true; $(".bb-in", box).hidden = false;
    const first = $$(".bb-q", qs).find((f) => !val(f.dataset.q));
    (first ? $("input", first) : $("button[type=submit]", qs)).focus({ preventScroll: true });
    scrollToEl(box);
  };
  askForm.addEventListener("submit", (e) => { e.preventDefault(); analyseNow(); });
  $$(".bb-ex", askForm).forEach((b) => b.addEventListener("click", () => { text.value = b.textContent; analyseNow(); }));
  $("#bb-back").addEventListener("click", () => { qs.hidden = true; askForm.hidden = false; text.focus(); });
  qs.addEventListener("change", (e) => { e.target.closest(".bb-q")?.classList.add("is-answered"); err.hidden = true; });

  qs.addEventListener("submit", (e) => {
    e.preventDefault();
    const missing = ["industry", "stage"].filter((n) => !val(n));
    if (missing.length) { err.hidden = false; err.textContent = "Please choose your " + missing.join(" and ") + " — the plan depends on it."; $(`.bb-q[data-q="${missing[0]}"] input`, qs).focus(); return; }
    const a = { text: text.value, industry: val("industry"), stage: val("stage"), size: val("size") === "" ? null : +val("size"), market: val("market") || null, budget: val("budget") || "unsure", timeline: val("timeline") || null, goals: guess.goals };
    current = { answers: a, plan: blueprint(a, data) };
    render(current.plan);
    qs.hidden = true; out.hidden = false; $(".bb-in", box).hidden = true;
    scrollToEl(out); setTimeout(() => out.focus({ preventScroll: true }), lenis ? 900 : 60);
    const g = G(); if (g) g.fromTo($$(".bp-sec", bp), { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "expo.out", stagger: 0.06, clearProps: "transform,opacity" });
    document.dispatchEvent(new CustomEvent("guide:say", { detail: { gesture: "wave" } }));
    if (api) refine(a, current.plan);
  });

  const render = (plan) => {
    const sec = (s) => {
      let body = "";
      if (s.text) body += `<p>${esc(s.text)}</p>`;
      if (s.items) body += `<ul>${s.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
      if (s.services) body += `<ul class="bp-svcs">${s.services.map((x) => `<li><a href="#sol-${x.id}" data-open-cat="${x.id}">${esc(x.title)}</a><span class="bp-phase bp-phase-${x.phase === "Phase 1" ? "1" : "2"}">${x.phase}</span><span class="bp-why">${esc(x.why)}</span>${x.mode !== "direct" ? '<span class="bp-mode">Scoped per project — in-house or with partners</span>' : ""}</li>`).join("")}</ul>`;
      if (s.phases) body += `<ol class="bp-road">${s.phases.map((p) => `<li><b>${esc(p.title)}</b><span>${esc(p.line)}</span>${p.cats.length ? `<em>${esc(p.cats.join(" · "))}</em>` : ""}</li>`).join("")}</ol>`;
      if (s.note) body += `<p class="bp-note">${esc(s.note)}</p>`;
      return `<section class="bp-sec bp-${s.id}"><h4>${esc(s.h)}</h4>${body}</section>`;
    };
    bp.innerHTML = `<header class="bp-head"><h3 id="bp-title">Your preliminary blueprint</h3><p>${esc(plan.understood)}</p><blockquote>${esc(current.answers.text)}</blockquote></header>${plan.sections.map(sec).join("")}<section class="bp-sec bp-ai" id="bp-ai" hidden></section>`;
    $$("[data-open-cat]", bp).forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); openCat(a.dataset.openCat, true); }));
  };

  const refine = async (a, plan) => {
    const box = $("#bp-ai"); box.hidden = false;
    box.innerHTML = '<h4>Advisor notes</h4><p class="bp-note">Asking the AI advisor for notes on your answers…</p>';
    try {
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 20000);
      const res = await fetch(api.replace(/\/?$/, "/") + "blueprint", { method: "POST", signal: ctl.signal, credentials: "omit", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: a.text.slice(0, 1200), answers: { ...a, text: undefined }, blueprint: plan.md.slice(0, 6000) }) });
      clearTimeout(tm);
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.notes) throw new Error(d.error || "unavailable");
      box.innerHTML = `<h4>Advisor notes <span class="bp-tag">AI-written</span></h4>${d.notes.split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`).join("")}<p class="bp-note">Written by an AI model from your answers and the blueprint above. It can be wrong — treat it as questions to discuss, not advice to act on.</p>`;
      current.plan.md += "\n\n## Advisor notes (AI-written)\n\n" + d.notes;
    } catch { box.hidden = true; }
  };

  $("#bb-copy").addEventListener("click", async (e) => { const btn = e.currentTarget, ok = await copy(current.plan.md); flash(btn, ok ? "Copied" : "Couldn't copy"); status.textContent = ok ? "Blueprint copied." : ""; });
  $("#bb-dl").addEventListener("click", (e) => { download("business-blueprint.md", current.plan.md); flash(e.currentTarget, "Downloaded"); });
  $("#bb-print").addEventListener("click", () => { document.documentElement.classList.add("print-bp"); window.print(); setTimeout(() => document.documentElement.classList.remove("print-bp"), 500); });
  $("#bb-again").addEventListener("click", () => { out.hidden = true; $(".bb-in", box).hidden = false; askForm.hidden = false; text.value = ""; current = null; text.focus(); scrollToEl(box); });

  // handed over from the digital twin (or a "Plan a … business" button)
  const start = (t, presets = {}) => { text.value = t; $(".bb-in", box).hidden = false; askForm.hidden = false; analyseNow(presets); };
  try { const t = sessionStorage.getItem(PREFILL); if (t) { sessionStorage.removeItem(PREFILL); setTimeout(() => start(t), 400); } } catch { /* storage blocked */ }
  document.addEventListener("builder:prefill", (e) => start(e.detail?.text || ""));
  return { start, get: () => current };
}

/* ---------- Project inquiry: five steps → a structured brief */
function initInquiry(data, api, builder) {
  const form = $("#inq");
  if (!form) return;
  const steps = $$(".inq-step", form), marks = $$(".inq-steps li", form);
  const prev = $("#inq-prev"), next = $("#inq-next"), send = $("#inq-send"), err = $("#inq-error"), done = $("#inq-done"), brief = $("#inq-brief"), note = $("#inq-note");
  const f = (n) => form.elements[n];
  let step = 1, attachedPlan = null;
  $("#inq-submit").hidden = !api;
  note.textContent = api
    ? "“Send the brief” stores it securely and emails it to Dwaipyan. Or use your own email app or WhatsApp."
    : "This sends nothing by itself: choose your email app or WhatsApp to send the brief, or copy or download it.";

  const show = (n, focus = true) => {
    step = n;
    steps.forEach((s) => { s.hidden = +s.dataset.step !== n; });
    marks.forEach((m, i) => { if (i + 1 === n) m.setAttribute("aria-current", "step"); else m.removeAttribute("aria-current"); m.classList.toggle("is-done", i + 1 < n); });
    prev.hidden = n === 1; next.hidden = n === steps.length; send.hidden = n !== steps.length;
    if (n === steps.length) brief.textContent = makeBrief();
    err.hidden = true;
    const first = $("input:not([type=hidden]):not([tabindex='-1']), select, textarea, pre", steps[n - 1]);
    if (focus) first?.focus({ preventScroll: true });
  };
  const check = (n) => {
    const req = { 1: [["name", "your name"], ["email", "your email"], ["about", "what the business does"]], 3: [["challenge", "the problem to solve"]] }[n] || [];
    const missing = req.filter(([k]) => !f(k).value.trim());
    req.forEach(([k]) => f(k).setAttribute("aria-invalid", String(missing.some(([m]) => m === k))));
    if (n === 1 && f("email").value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f("email").value.trim())) { missing.push(["email", "a valid email address"]); f("email").setAttribute("aria-invalid", "true"); }
    if (!missing.length) return true;
    err.hidden = false; err.textContent = "Please add " + missing.map(([, l]) => l).join(", ") + ".";
    form.querySelector('[aria-invalid="true"]')?.focus();
    return false;
  };
  next.addEventListener("click", () => { if (check(step)) show(step + 1); });
  prev.addEventListener("click", () => show(step - 1));

  const label = (id, list) => (list.find((x) => x.id === id) || {}).title || id;
  const services = () => $$(".inq-svcs input:checked", form).map((c) => label(c.value, data.categories));
  const fields = () => ({
    name: f("name").value.trim(), email: f("email").value.trim(), company: f("company").value.trim(), country: f("country").value.trim(),
    industry: f("industry").value ? (f("industry").value === "other" ? "Other" : label(f("industry").value, data.industries)) : "", size: f("size").value,
    about: f("about").value.trim(), services: services(), challenge: f("challenge").value.trim(), have: f("have").value.trim(),
    budget: f("budget").value || "Prefer to discuss", timeline: f("timeline").value || "Flexible", engagement: form.querySelector('input[name="engagement"]:checked')?.value || "Not sure",
  });
  function makeBrief() {
    const d = fields();
    const lines = [
      "PROJECT BRIEF", "",
      `From: ${d.name}${d.company ? " — " + d.company : ""}`, `Email: ${d.email}`, d.country ? `Country: ${d.country}` : "",
      d.industry ? `Industry: ${d.industry}` : "", d.size ? `Size: ${d.size}` : "", "",
      "THE BUSINESS", d.about, "",
      "THE CHALLENGE", d.challenge, d.have ? `\nAlready in place: ${d.have}` : "", "",
      "SERVICES OF INTEREST", d.services.length ? d.services.map((s) => "- " + s).join("\n") : "- Not sure — would like a recommendation", "",
      `Budget: ${d.budget}`, `Timeline: ${d.timeline}`, `Engagement: ${d.engagement}`,
    ];
    if (attachedPlan) lines.push("", "PRELIMINARY BLUEPRINT (from the Business Builder)", attachedPlan.core.map((c) => "- " + label(c, data.categories) + " (phase 1)").join("\n"), attachedPlan.later.map((c) => "- " + label(c, data.categories) + " (later)").join("\n"));
    lines.push("", "Sent from the Business Solutions page. Nothing is agreed until scope, timeline and price are confirmed in writing.");
    return lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n").trim();
  }

  // a blueprint can be attached: it fills in what it can
  $("#bb-send")?.addEventListener("click", (e) => {
    const cur = builder.get?.(); if (!cur) return;
    e.preventDefault();
    attachedPlan = cur.plan;
    const a = cur.answers;
    if (!f("about").value.trim()) f("about").value = a.text.trim();
    if (a.industry) f("industry").value = a.industry;
    if (a.size != null && data.sizes[a.size]) f("size").value = data.sizes[a.size];
    $$(".inq-svcs input", form).forEach((c) => { c.checked = c.checked || cur.plan.core.includes(c.value); });
    if (!f("challenge").value.trim()) f("challenge").value = a.text.trim();
    show(1); scrollToEl($("#inquiry"), f("name"));
    done.textContent = "Your blueprint is attached. Add your name and email, then check each step.";
  });
  // "Ask about …" on a practice ticks it
  $$("[data-pick-cat]").forEach((a) => a.addEventListener("click", () => {
    const c = form.querySelector(`.inq-svcs input[value="${a.dataset.pickCat}"]`); if (c) c.checked = true;
    setTimeout(() => f("name").focus({ preventScroll: true }), lenis ? 900 : 60);
  }));

  const subject = () => { const d = fields(); return `Project enquiry — ${d.company || d.name}${d.industry ? " (" + d.industry + ")" : ""}`; };
  const ready = () => { if (!$("#iq-consent").checked) { err.hidden = false; err.textContent = "Please tick the box to confirm the brief may be sent to Dwaipyan."; $("#iq-consent").focus(); return false; } err.hidden = true; return true; };
  $("#inq-mail").addEventListener("click", () => { if (!ready()) return; location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject())}&body=${encodeURIComponent(makeBrief())}`; done.textContent = "Your email app should open with the brief ready to send."; });
  $("#inq-wa").addEventListener("click", () => {
    if (!ready()) return;
    const num = ($('.sol-inq a[href^="https://wa.me/"]')?.getAttribute("href").match(/wa\.me\/(\d+)/) || [])[1];
    if (num) window.open(`https://wa.me/${num}?text=${encodeURIComponent(makeBrief().slice(0, 3500))}`, "_blank", "noopener");
    done.textContent = "WhatsApp opened in a new tab with your brief — press send there.";
  });
  $("#inq-copy").addEventListener("click", async (e) => { const btn = e.currentTarget, ok = await copy(`To: ${EMAIL}\nSubject: ${subject()}\n\n${makeBrief()}`); flash(btn, ok ? "Copied" : "Couldn't copy"); });
  $("#inq-dl").addEventListener("click", (e) => { download("project-brief.txt", makeBrief(), "text/plain"); flash(e.currentTarget, "Downloaded"); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!api || step !== steps.length || !ready()) return;
    const btn = $("#inq-submit"); btn.disabled = true; btn.textContent = "Sending…"; done.textContent = "";
    try {
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 20000);
      const res = await fetch(api.replace(/\/?$/, "/") + "inquiry", { method: "POST", signal: ctl.signal, credentials: "omit", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fields(), website: f("website").value, brief: makeBrief(), blueprint: attachedPlan ? attachedPlan.md.slice(0, 8000) : "", page: location.pathname }) });
      clearTimeout(tm);
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) throw new Error(d.error || "failed");
      done.textContent = `Thank you — your brief has been received (reference ${d.ref}). Dwaipyan will reply by email.`;
      $$("button", send).forEach((b) => { if (b !== btn) b.disabled = true; });
      btn.textContent = "Sent";
    } catch (ex) {
      btn.disabled = false; btn.textContent = "Send the brief";
      done.textContent = ex.message === "rate limited" ? "Too many enquiries from this connection today — please use email or WhatsApp instead." : "The brief couldn't be sent from here. Please use “Open in my email app” or WhatsApp — nothing is lost.";
    }
  });
  show(1, false);
}
