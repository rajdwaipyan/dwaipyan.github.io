// DWAIPYAN INTELLIGENCE — /intelligence/. Loaded only on that page (see main.js).
//   Ask      intents and free-text search → capabilities, projects and records, strongest evidence first
//   Explore  a progressive map: one item in the centre, its connections around it; select one to move on
//   Brief    a structured report written from the same graph, with a source link for every point
// Every node, link and sentence comes from the site's data files via intelligence-data.js. Nothing is generated.
import { copyText, flash, reduceMotion } from "./core.js";
import { buildGraph, neighbours, search, LEVELS, TYPES } from "./intelligence-data.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/** Separate overlapping boxes (centre coordinates, px). Pushes along the axis of least overlap; fixed boxes don't move. */
function relax(b, W, H, gap = 10) {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  for (let it = 0; it < 160; it++) {
    let moved = false;
    for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) {
      const A = b[i], B = b[j], dx = B.x - A.x, dy = B.y - A.y;
      const ox = (A.w + B.w) / 2 + gap - Math.abs(dx), oy = (A.h + B.h) / 2 + gap - Math.abs(dy);
      if (ox <= 0 || oy <= 0) continue;
      moved = true;
      const alongX = ox * 1.6 < oy;                         // prefer vertical moves: labels are wide
      const amt = (alongX ? ox : oy) / 2 + 0.5, sx = (dx >= 0 ? 1 : -1), sy = (dy >= 0 ? 1 : -1);
      const share = A.fixed ? [0, 2] : B.fixed ? [2, 0] : [1, 1];
      if (alongX) { A.x -= sx * amt * share[0]; B.x += sx * amt * share[1]; } else { A.y -= sy * amt * share[0]; B.y += sy * amt * share[1]; }
    }
    b.forEach((x) => { if (!x.fixed) { x.x = clamp(x.x, x.w / 2 + 8, W - x.w / 2 - 8); x.y = clamp(x.y, x.h / 2 + 8, H - x.h / 2 - 8); } });
    if (!moved) break;
  }
}

export function initIntelligence() {
  const dataEl = document.getElementById("di-data");
  if (!dataEl) return;
  const D = JSON.parse(dataEl.textContent);
  const G = buildGraph(D);
  const principles = D.leadership?.principles || [];
  const ROOT = new URL("../", location.href);                     // the site root, from /intelligence/
  const href = (u) => (/^https?:/.test(u) ? u : new URL(u, ROOT).href);
  const rel = (u) => (/^https?:/.test(u) ? u : "../" + u);       // links inside the page stay relative
  const badge = (lv) => `<span class="di-lv di-lv-${lv}">${esc(LEVELS[lv].label)}</span>`;
  const intents = Object.fromEntries((G.intel.intents || []).map((t) => [t.id, t]));

  initAsk();
  const map = initMap();
  initBrief();

  // ───────────────────────────── ASK ─────────────────────────────
  let lastQuery = null;   // { kind: "intent"|"search", id|q, result }
  function initAsk() {
    const out = $("#di-results");
    const form = $("[data-di-search]");
    $$(".di-intent").forEach((b) => b.addEventListener("click", () => {
      const t = intents[b.dataset.intent];
      $$(".di-intent").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      const caps = t.caps.map((c) => G.nodes.get("cap:" + c)).filter(Boolean);
      lastQuery = { kind: "intent", id: t.id, caps };
      render(out, { title: t.label, caps: caps.map((node) => ({ node, why: [] })), projects: [], others: [], next: t.next, brief: t.brief });
    }));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = form.q.value.trim();
      if (!q) { form.q.focus(); return; }
      $$(".di-intent").forEach((x) => x.setAttribute("aria-pressed", "false"));
      const r = search(G, q);
      lastQuery = { kind: "search", q, result: r };
      const briefBtn = $('[data-brief="search"]'); if (briefBtn) briefBtn.hidden = !r.caps.length && !r.projects.length;
      render(out, { title: `“${q}”`, ...r, next: [{ label: "Start a project", url: "solutions/#inquiry" }, { label: "Get in touch", url: "#contact" }], brief: "search", q });
    });
  }

  function render(out, r) {
    const empty = !r.caps.length && !r.projects.length && !(r.others || []).length;
    if (empty) {
      out.innerHTML = `<div class="di-empty"><p><b>Nothing on this site matches ${esc(r.title)}.</b> That may simply be something I haven't written up — <a href="../#contact">ask me directly</a>, or try one of the options above.</p>
        <p class="di-empty-try">Try: ${["WordPress", "CRM automation", "WooCommerce", "NGO leadership", "cybersecurity research", "master's degree"].map((w) => `<button type="button" class="di-chip" data-try="${esc(w)}">${esc(w)}</button>`).join(" ")}</p></div>`;
      $$("[data-try]", out).forEach((b) => b.addEventListener("click", () => { const f = $("[data-di-search]"); f.q.value = b.dataset.try; f.requestSubmit(); }));
      out.focus({ preventScroll: true });
      return;
    }
    const capCard = ({ node, why }) => {
      const nb = neighbours(G, node.id);
      const projs = nb.filter((x) => x.node.type === "proj");
      const recs = nb.filter((x) => ["role", "edu", "report", "prog"].includes(x.node.type)).slice(0, 4);
      return `<li class="di-card">
        <div class="di-card-top">${badge(node.level)}${why.length ? `<span class="di-why">matched: ${why.slice(0, 4).map(esc).join(", ")}</span>` : ""}</div>
        <h3>${esc(node.label)}</h3>
        <p>${esc(node.summary)}</p>
        ${projs.length ? `<p class="di-card-k">Evidence — ${projs.length} ${projs.length === 1 ? "project" : "projects"}</p><ul class="di-card-ev">${projs.map(({ node: p }) =>
          `<li><a href="${esc(rel(p.page))}">${esc(p.label)}</a>${p.url ? ` <a class="di-ext" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(p.label)} live site (opens in a new tab)">live ↗</a>` : ""}</li>`).join("")}</ul>` : ""}
        ${recs.length ? `<p class="di-card-k">On the record</p><ul class="di-card-ev">${recs.map(({ node: x }) => `<li>${x.page ? `<a href="${esc(rel(x.page))}">${esc(x.label)}</a>` : esc(x.label)} ${badge(x.level)}</li>`).join("")}</ul>` : ""}
        <button type="button" class="di-go" data-focus="${esc(node.id)}">Explore its connections <span aria-hidden="true">→</span></button>
      </li>`;
    };
    const item = ({ node }) => `<li>${node.page ? `<a href="${esc(rel(node.page))}">${esc(node.label)}</a>` : esc(node.label)} ${badge(node.level)} <button type="button" class="di-mini" data-focus="${esc(node.id)}" aria-label="Show ${esc(node.label)} on the map">map</button></li>`;
    out.innerHTML = `
      <h3 class="di-res-title">For ${esc(r.title)} — strongest evidence first</h3>
      ${r.caps.length ? `<ol class="di-cards">${r.caps.map(capCard).join("")}</ol>` : ""}
      ${r.projects.length ? `<div class="di-res-block"><h4>Matching projects</h4><ul class="di-res-list">${r.projects.map(item).join("")}</ul></div>` : ""}
      ${(r.others || []).length ? `<div class="di-res-block"><h4>Also on the record</h4><ul class="di-res-list">${r.others.map(item).join("")}</ul></div>` : ""}
      <div class="di-next">
        <p>Next:</p>
        ${(r.next || []).map((n) => `<a class="btn btn-line btn-sm" href="${esc(n.url.startsWith("#") ? "../" + n.url : rel(n.url))}">${esc(n.label)}</a>`).join("")}
        <button type="button" class="btn btn-lime btn-sm" data-make-brief="${esc(r.brief)}">Make this a brief</button>
      </div>`;
    $$("[data-focus]", out).forEach((b) => b.addEventListener("click", () => { map.select(b.dataset.focus, { scroll: true, fromList: false }); }));
    $("[data-make-brief]", out)?.addEventListener("click", (e) => makeBrief(e.currentTarget.dataset.makeBrief, true));
    out.focus({ preventScroll: true });
  }

  // ───────────────────────────── MAP ─────────────────────────────
  function initMap() {
    const explore = $("[data-di-explore]"), stage = $("[data-di-stage]"), nodesEl = $("[data-di-nodes]"), edges = $("[data-di-edges]");
    const panel = $("[data-di-panel]"), trailEl = $("[data-di-trail]"), list = $("[data-di-list]"), toolbar = $("[data-di-toolbar]");
    explore.hidden = false; toolbar.hidden = false; list.hidden = true;
    const els = new Map();            // node id → button on the stage
    let current = null, trail = [], view = "graph";
    const small = () => stage.clientWidth < 620;

    // the server-rendered list gets a way into the map
    $$(".di-li", list).forEach((li) => {
      const id = "cap:" + li.id.replace(/^cap-/, "");
      const b = document.createElement("button");
      b.type = "button"; b.className = "di-go"; b.innerHTML = 'Explore its connections <span aria-hidden="true">→</span>';
      b.addEventListener("click", () => { setView("graph"); select(id, { scroll: false }); stage.scrollIntoView({ block: "center", behavior: reduceMotion.matches ? "auto" : "smooth" }); });
      li.appendChild(b);
    });
    $$("[data-di-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.diView)));
    function setView(v) {
      view = v;
      $$("[data-di-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.diView === v)));
      stage.hidden = v === "list"; list.hidden = v !== "list";
      explore.classList.toggle("is-list", v === "list");
      if (v === "graph") layout();
    }

    function select(id, { scroll = false, push = true, focus = true } = {}) {
      const n = G.nodes.get(id);
      if (!n) return;
      if (push) { trail = trail.filter((t) => t !== id); trail.push(id); if (trail.length > 7) trail = trail.slice(-7); }
      const prevPos = els.get(id) ? { x: els.get(id).style.getPropertyValue("--x"), y: els.get(id).style.getPropertyValue("--y") } : null;
      current = id;
      drawPanel(n);
      drawTrail();
      layout(prevPos);
      try { const u = new URL(location.href); u.searchParams.set("focus", id); history.replaceState(null, "", u.pathname + u.search + "#map"); } catch { /* sandboxed */ }
      if (scroll) $("#map").scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
      if (focus && view === "graph") requestAnimationFrame(() => els.get(id)?.focus({ preventScroll: true }));
    }

    function layout(fromPos) {
      if (!current || stage.hidden) return;
      const W = stage.clientWidth, H = stage.clientHeight;
      const max = small() ? 8 : 14;
      const nb = neighbours(G, current);
      const shown = nb.slice(0, max);
      stage.dataset.more = nb.length > max ? String(nb.length - max) : "";
      const pos = new Map([[current, { x: 50, y: 50 }]]);
      const rings = shown.length > (small() ? 6 : 8) ? 2 : 1;
      const perRing = rings === 2 ? [Math.ceil(shown.length * 0.42), shown.length - Math.ceil(shown.length * 0.42)] : [shown.length];
      let k = 0;
      perRing.forEach((count, r) => {
        const rx = rings === 2 ? (r === 0 ? 24 : 41) : 36, ry = rings === 2 ? (r === 0 ? 25 : 42) : 36;
        for (let i = 0; i < count; i++, k++) {
          const a = -Math.PI / 2 + (i / count) * Math.PI * 2 + (r === 1 ? Math.PI / count : 0);
          pos.set(shown[k].node.id, { x: 50 + Math.cos(a) * rx, y: 50 + Math.sin(a) * ry * (small() ? 0.94 : 1) });
        }
      });
      // remove nodes that leave
      els.forEach((el, id) => { if (!pos.has(id)) { el.classList.add("is-leaving"); el.tabIndex = -1; setTimeout(() => { if (!pos.has(id) || el.classList.contains("is-leaving")) { el.remove(); if (els.get(id) === el) els.delete(id); } }, reduceMotion.matches ? 0 : 380); } });
      // place / move nodes
      const ordered = [current, ...shown.map((s) => s.node.id)];
      ordered.forEach((id) => {
        const n = G.nodes.get(id), p = pos.get(id);
        let el = els.get(id);
        if (!el || el.classList.contains("is-leaving")) {
          el?.remove();
          el = document.createElement("button");
          el.type = "button";
          el.className = `di-node di-t-${n.type} di-l-${n.level}`;
          el.innerHTML = `<span class="di-node-dot" aria-hidden="true"></span><span class="di-node-t">${esc(n.short || n.label)}</span>`;
          el.addEventListener("click", () => { if (current !== id) select(id); else el.blur(); });
          const start = fromPos || { x: "50%", y: "50%" };
          el.style.setProperty("--x", typeof start.x === "string" ? start.x : start.x + "%");
          el.style.setProperty("--y", typeof start.y === "string" ? start.y : start.y + "%");
          el.classList.add("is-entering");
          nodesEl.appendChild(el);
          els.set(id, el);
          void el.offsetWidth;   // commit the start position so the move animates
          el.classList.remove("is-entering");
        }
        el.style.setProperty("--x", p.x + "%");
        el.style.setProperty("--y", p.y + "%");
        el.classList.toggle("is-center", id === current);
        const relTxt = id === current ? "" : (nb.find((s) => s.node.id === id)?.rel || "");
        el.setAttribute("aria-label", id === current ? `${n.label} — selected. ${TYPES[n.type]}, ${LEVELS[n.level].label}.` : `${n.label} — ${TYPES[n.type]}, ${LEVELS[n.level].label}${relTxt ? `, ${relTxt}` : ""}`);
        el.setAttribute("aria-current", id === current ? "true" : "false");
        el.dataset.rel = relTxt;
      });
      // keyboard order follows the ring
      ordered.forEach((id) => nodesEl.appendChild(els.get(id)));
      // measure every label and push overlapping ones apart (the centre stays put), inside the stage
      const box = ordered.map((id) => { const el = els.get(id), p = pos.get(id); return { id, x: (p.x / 100) * W, y: (p.y / 100) * H, w: el.offsetWidth, h: el.offsetHeight, fixed: id === current }; });
      relax(box, W, H);
      box.forEach((b) => pos.set(b.id, { x: (b.x / W) * 100, y: (b.y / H) * 100 }));
      ordered.forEach((id) => { const el = els.get(id), p = pos.get(id); el.style.setProperty("--x", p.x + "%"); el.style.setProperty("--y", p.y + "%"); });
      // edges
      edges.setAttribute("viewBox", `0 0 ${W} ${H}`);
      edges.innerHTML = shown.map(({ node, rel: r }) => {
        const p = pos.get(node.id);
        return `<line class="di-edge di-e-${node.level}" data-to="${esc(node.id)}" x1="${W / 2}" y1="${H / 2}" x2="${(p.x / 100) * W}" y2="${(p.y / 100) * H}"><title>${esc(r)}</title></line>`;
      }).join("");
    }
    nodesEl.addEventListener("pointerover", (e) => hl(e.target.closest(".di-node")));
    nodesEl.addEventListener("focusin", (e) => hl(e.target.closest(".di-node")));
    nodesEl.addEventListener("pointerleave", () => hl(null));
    function hl(el) {
      const id = el && [...els.entries()].find(([, v]) => v === el)?.[0];
      $$(".di-edge", edges).forEach((l) => l.classList.toggle("is-hot", l.dataset.to === id));
      stage.dataset.rel = el && el.dataset.rel ? el.dataset.rel : "";
    }
    // keyboard: Escape / Backspace goes back along the trail
    explore.addEventListener("keydown", (e) => {
      if ((e.key === "Escape" || e.key === "Backspace") && !e.target.matches("input, textarea") && trail.length > 1) {
        e.preventDefault(); trail.pop(); select(trail[trail.length - 1], { push: false });
      }
    });

    function drawTrail() {
      trailEl.innerHTML = trail.map((id, i) => {
        const n = G.nodes.get(id), last = i === trail.length - 1;
        return `<li>${last ? `<span aria-current="step">${esc(n.label)}</span>` : `<button type="button" data-trail="${esc(id)}">${esc(n.label)}</button>`}</li>`;
      }).join("");
      $$("[data-trail]", trailEl).forEach((b) => b.addEventListener("click", () => { trail = trail.slice(0, trail.indexOf(b.dataset.trail) + 1); select(b.dataset.trail, { push: false }); }));
    }

    function drawPanel(n) {
      const nb = neighbours(G, n.id);
      const groups = {};
      nb.forEach(({ node, rel: r }) => { (groups[TYPES[node.type]] = groups[TYPES[node.type]] || []).push({ node, rel: r }); });
      const ev = (n.evidence || []).map((e) => `<li><a href="${esc(rel(e.url))}"${e.ext || /^https?:/.test(e.url) ? ' target="_blank" rel="noopener noreferrer"' : ""}>${esc(e.label)}${/^https?:/.test(e.url) ? ' <span aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span>' : ""}</a></li>`).join("");
      panel.innerHTML = `
        <p class="di-p-type">${esc(TYPES[n.type])} ${badge(n.level)}</p>
        <h3 class="di-p-title">${esc(n.label)}</h3>
        ${n.meta && n.meta.length ? `<p class="di-p-meta">${n.meta.map(esc).join(" · ")}</p>` : ""}
        <p class="di-p-sum">${esc(n.summary)}</p>
        ${n.role ? `<p class="di-p-role"><b>My part:</b> ${esc(n.role)}</p>` : ""}
        ${n.points && n.points.length ? `<ul class="di-p-points">${n.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
        ${ev ? `<h4>Check it</h4><ul class="di-p-ev">${ev}</ul>` : `<p class="di-p-none">No public link for this yet.</p>`}
        ${Object.keys(groups).length ? `<h4>Connected to <span>${nb.length}</span></h4>${Object.entries(groups).map(([t, xs]) => `<p class="di-p-gk">${esc(t)}</p><ul class="di-p-conn">${xs.map(({ node, rel: r }) =>
          `<li><button type="button" data-goto="${esc(node.id)}"><span class="di-dot di-l-${node.level}" aria-hidden="true"></span>${esc(node.label)}</button><span class="di-rel">${esc(r)}</span></li>`).join("")}</ul>`).join("")}` : ""}
        ${n.type !== "person" ? `<button type="button" class="btn btn-line btn-sm di-p-brief" data-node-brief="${esc(n.id)}">Make a brief about this</button>` : ""}`;
      $$("[data-goto]", panel).forEach((b) => b.addEventListener("click", () => select(b.dataset.goto, { focus: view === "graph" })));
      $("[data-node-brief]", panel)?.addEventListener("click", () => makeBrief("node:" + n.id, true));
    }

    let rz;
    new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(() => layout(), 120); }).observe(stage);

    const want = new URLSearchParams(location.search).get("focus");
    select(want && G.nodes.has(want) ? want : "me", { focus: false });
    return { select: (id, o = {}) => { if (view === "list") setView("graph"); select(id, o); } };
  }

  // ───────────────────────────── BRIEF ─────────────────────────────
  let doc = null, docTitle = "";
  function initBrief() {
    $$("[data-brief]").forEach((b) => b.addEventListener("click", () => makeBrief(b.dataset.brief)));
    $("[data-di-copy]").addEventListener("click", async (e) => {
      const btn = e.currentTarget, ok = await copyText(toText(doc));
      flash(btn.parentElement.querySelector(".copy-status"), ok ? "Copied" : "Couldn't copy — select the text instead");
    });
    $("[data-di-dl]").addEventListener("click", () => {
      const blob = new Blob([toMd(doc)], { type: "text/markdown;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = docTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".md";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
    $("[data-di-print]").addEventListener("click", () => {
      document.documentElement.classList.add("print-di");
      const done = () => { document.documentElement.classList.remove("print-di"); window.removeEventListener("afterprint", done); };
      window.addEventListener("afterprint", done);
      window.print();
      setTimeout(done, 1500);
    });
  }

  function makeBrief(kind, scroll = false) {
    $$("[data-brief]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.brief === kind)));
    if (kind === "search") $('[data-brief="search"]').hidden = false;
    const built = BRIEFS[kind.split(":")[0]]?.(kind.split(":").slice(1).join(":")) || BRIEFS.profile();
    doc = built.blocks; docTitle = built.title;
    const wrap = $("[data-di-brief]");
    wrap.hidden = false;
    $("#di-doc").innerHTML = toHtml(built);
    if (scroll) $("#brief").scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
    $("#di-doc").focus({ preventScroll: true });
  }

  // A brief is a list of blocks: { h }, { h3 }, { p }, { ul: [ { t, url?, lv? } ] }. Rendered to HTML, Markdown and text.
  const today = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const L = (node) => ({ t: node.label + (node.meta && node.meta.length ? ` — ${node.meta.filter(Boolean).slice(0, 2).join(", ")}` : ""), url: node.page ? href(node.page) : null, lv: node.level });
  const head = (title, intro) => ({ title, blocks: [
    { p: intro },
    { p: `Prepared ${today()} from ${ROOT.href}. Each line links to where it can be checked, and carries its evidence label: Live project, Record, Described on this site, Self-described, Stated (not yet documented) or Goal.` },
  ] });
  const capBlock = (c, B) => {
    const nb = neighbours(G, c.id);
    B.push({ h3: c.label, lv: c.level });
    B.push({ p: c.summary });
    const projs = nb.filter((x) => x.node.type === "proj").map((x) => x.node);
    if (projs.length) B.push({ k: "Evidence", ul: projs.map((p) => ({ t: `${p.label} — ${p.meta.slice(0, 2).join(", ")}`, url: href(p.page), lv: p.level, live: p.url })) });
    const tools = nb.filter((x) => x.node.type === "tech").map((x) => x.node);
    if (tools.length) B.push({ k: "Tools", p: tools.map((t) => t.label + (t.level === "live" ? "" : t.level === "goal" ? " (studying)" : " (self-described)")).join(", ") });
    const recs = nb.filter((x) => ["role", "edu", "report", "train", "prog", "goal", "research"].includes(x.node.type)).map((x) => x.node);
    if (recs.length) B.push({ k: "Record", ul: recs.map(L) });
    if (c.pages && c.pages.length) B.push({ k: "Read more", ul: c.pages.map((p) => ({ t: p.label, url: href(p.url) })) });
  };
  const contact = (B) => B.push({ h: "Contact" }, { ul: [{ t: "Email: rajdwaipayan@gmail.com", url: "mailto:rajdwaipayan@gmail.com" }, { t: "Start a project (brief form)", url: href("solutions/#inquiry") }, { t: "Website", url: ROOT.href }] });
  const caps = (ids) => ids.map((id) => G.nodes.get("cap:" + id)).filter(Boolean);

  const BRIEFS = {
    technical() {
      const r = head("Technical capability brief — Dwaipyan Mandal", "What Dwaipyan Mandal builds, what each capability is built with, and the live work that shows it. Ordered by strength of evidence.");
      caps(["wordpress", "crm", "ecommerce", "webapps", "ai", "security", "programming"]).sort((a, b) => LEVELS[b.level].rank - LEVELS[a.level].rank).forEach((c) => capBlock(c, r.blocks));
      contact(r.blocks); return r;
    },
    profile() {
      const r = head("Professional profile — Dwaipyan Mandal", "Technology professional, entrepreneur and NGO executive in Dhaka, Bangladesh.");
      const B = r.blocks;
      B.push({ h: "Current roles" }, { ul: ["role:sms-ceo", "role:ed-shield", "role:freelance"].map((id) => G.nodes.get(id)).filter(Boolean).map(L) });
      const st = ["role:pentangular", "role:tech-maximus"].map((id) => G.nodes.get(id)).filter(Boolean);
      if (st.length) B.push({ k: "Also stated (not yet documented on the site)", ul: st.map(L) });
      B.push({ h: "Capabilities, strongest evidence first" }, { ul: [...G.nodes.values()].filter((n) => n.type === "cap").sort((a, b) => LEVELS[b.level].rank - LEVELS[a.level].rank).map((c) => ({ t: `${c.label} — ${c.summary}`, url: c.page ? href(c.page) : null, lv: c.level })) });
      B.push({ h: "Education" }, { ul: [...G.nodes.values()].filter((n) => n.type === "edu").map(L) });
      contact(B); return r;
    },
    projects() {
      const r = head("Project experience — Dwaipyan Mandal", "Client websites that are live today, with what was built and the tools behind each.");
      const B = r.blocks;
      [...G.nodes.values()].filter((n) => n.type === "proj").sort((a, b) => LEVELS[b.level].rank - LEVELS[a.level].rank).forEach((p) => {
        B.push({ h3: p.label, lv: p.level });
        B.push({ p: [p.meta.join(" · "), p.summary].filter(Boolean).join(". ") });
        if (p.brief) B.push({ k: "The brief", p: p.brief });
        if (p.role) B.push({ k: "My part", p: p.role });
        if (p.built && p.built.length) B.push({ k: "Built with", p: p.built.join(", ") });
        B.push({ ul: (p.evidence || []).map((e) => ({ t: e.label, url: href(e.url) })) });
      });
      contact(B); return r;
    },
    leadership() {
      const r = head("Leadership profile — Dwaipyan Mandal", "Organisational, IT and project leadership in the NGO sector and in business. Results of programmes belong to the teams that delivered them; this describes his part.");
      const B = r.blocks;
      ["role:sms-ceo", "role:sms-it", "role:ed-shield", "role:pentangular"].map((id) => G.nodes.get(id)).filter(Boolean).forEach((n) => {
        B.push({ h3: n.label, lv: n.level });
        if (n.meta.length) B.push({ p: n.meta.join(" · ") });
        if (n.summary) B.push({ p: n.summary });
        if (n.points && n.points.length) B.push({ ul: n.points.map((t) => ({ t })) });
        if (n.page) B.push({ ul: [{ t: "Source", url: href(n.page) }] });
      });
      const progs = [...G.nodes.values()].filter((n) => n.type === "prog");
      if (progs.length) { B.push({ h: "Programmes" }); progs.forEach((p) => B.push({ ul: [L(p)] }, { p: p.summary })); }
      if (principles.length) B.push({ h: "In his own words" }, { ul: principles.map((p) => ({ t: `${p.title} — ${p.text}` })) });
      contact(B); return r;
    },
    academic() {
      const r = head("Academic profile — Dwaipyan Mandal", "Degrees, the master's project report, academic projects, training and research interests.");
      const B = r.blocks;
      [...G.nodes.values()].filter((n) => n.type === "edu").forEach((n) => { B.push({ h3: n.label, lv: n.level }, { p: n.summary }, { ul: [{ t: "Source", url: href(n.page) }] }); });
      const rep = G.nodes.get("report");
      if (rep) B.push({ h3: rep.label, lv: rep.level }, { p: rep.summary }, { ul: [{ t: "Source", url: href(rep.page) }] });
      const bp = [...G.nodes.values()].filter((n) => n.type === "bscp");
      if (bp.length) B.push({ h: "Academic projects (BSc)" }, { ul: bp.map((n) => ({ t: `${n.label} — ${n.summary}`, url: href(n.page), lv: n.level })) });
      B.push({ h: "Training" }, { ul: [...G.nodes.values()].filter((n) => n.type === "train").map((n) => ({ t: n.summary, url: href(n.page), lv: n.level })) });
      B.push({ h: "Research interests" }, { ul: [...G.nodes.values()].filter((n) => n.type === "research").map((n) => ({ t: `${n.label} — ${n.summary}`, url: href(n.page), lv: n.level })) });
      const g = G.nodes.get("goal:grad-study");
      if (g) B.push({ h: "Next" }, { ul: [{ t: g.summary, url: href(g.page), lv: g.level }] });
      contact(B); return r;
    },
    search() {
      const q = lastQuery;
      if (!q) return BRIEFS.profile();
      const label = q.kind === "search" ? `“${q.q}”` : intents[q.id].label;
      const r = head(`Relevant work for ${label.replace(/[“”]/g, "")} — Dwaipyan Mandal`, `What on this site answers: ${label}. Strongest evidence first.`);
      const capsN = q.kind === "search" ? q.result.caps.map((x) => x.node) : q.caps;
      capsN.forEach((c) => capBlock(c, r.blocks));
      if (q.kind === "search" && q.result.others.length) r.blocks.push({ h: "Also on the record" }, { ul: q.result.others.map((x) => L(x.node)) });
      contact(r.blocks); return r;
    },
    node(id) {
      const n = G.nodes.get(id);
      if (!n) return BRIEFS.profile();
      if (n.type === "cap") { const r = head(`${n.label} — Dwaipyan Mandal`, `Evidence for one capability.`); capBlock(n, r.blocks); contact(r.blocks); return r; }
      const r = head(`${n.label} — Dwaipyan Mandal`, `${TYPES[n.type]}: ${n.summary}`);
      r.blocks.push({ h: "Connections" }, { ul: neighbours(G, id).map(({ node, rel: rl }) => ({ ...L(node), t: `${rl}: ${L(node).t}` })) });
      if (n.evidence.length) r.blocks.push({ h: "Check it" }, { ul: n.evidence.map((e) => ({ t: e.label, url: href(e.url) })) });
      contact(r.blocks); return r;
    },
  };

  function toHtml(b) {
    const lv = (x) => (x ? " " + badge(x) : "");
    const li = (i) => `<li>${i.url ? `<a href="${esc(i.url)}"${/^https?:/.test(i.url) && !i.url.startsWith(ROOT.href) ? ' target="_blank" rel="noopener noreferrer"' : ""}>${esc(i.t)}</a>` : esc(i.t)}${lv(i.lv)}${i.live ? ` · <a href="${esc(i.live)}" target="_blank" rel="noopener noreferrer">live site ↗</a>` : ""}</li>`;
    return `<header class="di-doc-head"><p class="di-doc-k">DWAIPYAN INTELLIGENCE · brief</p><h3>${esc(b.title)}</h3></header>` + b.blocks.map((x) =>
      x.h ? `<h4>${esc(x.h)}</h4>` : x.h3 ? `<h5>${esc(x.h3)}${lv(x.lv)}</h5>` : x.ul ? `${x.k ? `<p class="di-doc-k2">${esc(x.k)}</p>` : ""}<ul>${x.ul.map(li).join("")}</ul>` : `${x.k ? `<p class="di-doc-k2">${esc(x.k)}</p>` : ""}<p>${esc(x.p)}</p>`).join("");
  }
  function toMd(blocks) {
    const lvT = (x) => (x ? ` _[${LEVELS[x].label}]_` : "");
    return `# ${docTitle}\n\n` + blocks.map((x) =>
      x.h ? `## ${x.h}` : x.h3 ? `### ${x.h3}${lvT(x.lv)}` : x.ul ? `${x.k ? `**${x.k}**\n\n` : ""}${x.ul.map((i) => `- ${i.url ? `[${i.t}](${i.url})` : i.t}${lvT(i.lv)}${i.live ? ` · [live site](${i.live})` : ""}`).join("\n")}` : `${x.k ? `**${x.k}:** ` : ""}${x.p}`).join("\n\n") + "\n";
  }
  function toText(blocks) {
    return `${docTitle}\n\n` + blocks.map((x) =>
      x.h ? x.h.toUpperCase() : x.h3 ? `${x.h3}${x.lv ? ` [${LEVELS[x.lv].label}]` : ""}` : x.ul ? `${x.k ? x.k + ":\n" : ""}${x.ul.map((i) => `• ${i.t}${i.lv ? ` [${LEVELS[i.lv].label}]` : ""}${i.url ? ` — ${i.url}` : ""}`).join("\n")}` : `${x.k ? x.k + ": " : ""}${x.p}`).join("\n\n") + "\n";
  }
}
