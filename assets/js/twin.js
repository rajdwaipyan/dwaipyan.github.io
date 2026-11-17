// THE DIGITAL TWIN — the drawn Dwaipyan as a roaming, talking assistant.
//
//   roaming    flies in on load, then wanders between EMPTY spots of the screen. Before landing anywhere he
//              checks what is underneath (text, links, buttons, images, forms, the WhatsApp button, the header)
//              and only lands on clear ground. No clear ground → he peeks in from the screen edge instead.
//              While you scroll he tucks to the edge; when you stop he comes back out where there is room.
//   states     exploring · idle · curious · listening · thinking · speaking · celebrating  (data-state)
//   assistant  click him: he docks on a panel with the conversation, suggested questions for the section in
//              view, a text box, a microphone and a read-aloud switch. Answers come from twin-brain.js.
//   guide      answers carry buttons to the right page or section; "Back" returns you to where you were.
//              The conversation is kept for the browser tab (sessionStorage), so it follows you between pages.
//   quiet      nothing speaks or plays without a click; reduced motion = no flying; hidden tab = no timers
//              doing work; "Hide him for now" removes him until the footer button brings him back.
// The brain (twin-brain.js) and the voice (twin-voice.js) are loaded on first use, not with the page.
import { reduceMotion, finePointer } from "./core.js";
import { sfx, unlock, isMuted, setMuted } from "./sound.js";
import { burst } from "./particles.js";
import { lenis } from "./motion.js";

const KEY = "twin";
const COSTUMES = ["glasses bowtie", "shades lei", "hardhat", "headset", "glasses tie", "shades"];
const BLOCK = "a,button,input,select,textarea,label,summary,img,picture,video,canvas,svg,iframe,h1,h2,h3,h4,h5,h6,p,li,dt,dd,blockquote,figure,figcaption,pre,code,table,form,nav,dialog,[role=button],[role=tab],[role=tablist],.pv,.console,.wa-fab,.twin-panel";
const STATE_LABEL = { listening: "Listening…", thinking: "Thinking…", speaking: "Speaking…" };
const PAGE_TOPIC = [["portfolio", "projects"], ["services", "services"], ["experience", "experience"], ["leadership", "ceo"], ["education", "education"], ["ai-prompt-engineering", "prompts"], ["photography", "photography"], ["journal", "writing"], ["watch", "writing"], ["about", "who"]];

// where he looks under himself before landing (fractions of his own box): centre first, then edges and corners
const PROBE = [[0.5, 0.5], [0.08, 0.5], [0.92, 0.5], [0.5, 0.08], [0.5, 0.94], [0.1, 0.12], [0.9, 0.12], [0.1, 0.92], [0.9, 0.92], [0.3, 0.3], [0.7, 0.3], [0.3, 0.72], [0.7, 0.72], [0.2, 1.35], [0.8, 1.35]];   // the last two look just below him: content often slides up into place
const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

export function initTwin() {
  const guide = document.getElementById("guide");
  const panel = document.getElementById("twin-panel");
  if (!guide || !panel) return;
  const flyer = $("#twin-flyer"), figure = $("#guide-figure"), chip = $("#twin-chip");
  const log = $("#twin-log"), askRow = $("#twin-ask"), form = $("#twin-form"), input = $("#twin-input");
  const micBtn = $("#twin-mic"), voiceBtn = $("#twin-voice"), note = $("#twin-note"), stateEl = $("#twin-state");
  const tray = $("#twin-tray"), moreBtn = $("#twin-more"), sfxBtn = $("#twin-sfx");
  const root = guide.dataset.root || "", endpoint = (guide.dataset.endpoint || "").trim();
  const cfg = JSON.parse($("#twin-ctx")?.textContent || "{}");
  const still = reduceMotion.matches;
  const compactMq = window.matchMedia("(max-width: 640px)");
  const coarse = window.matchMedia("(pointer: coarse)");

  /* ---------- what the tab remembers */
  const store = Object.assign({ msgs: [], open: false, voice: false, greeted: false, hidden: false, back: null, arrived: "", lastTopic: "" },
    (() => { try { return JSON.parse(sessionStorage.getItem(KEY) || "{}"); } catch { return {}; } })());
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify({ ...store, msgs: store.msgs.slice(-40) })); } catch { /* storage blocked: fine */ } };

  /* ---------- state */
  let pos = { x: 0, y: 0 }, anim = 0, flying = false, peeking = false, docked = false;
  let mode = "";                    // "", listening, thinking, speaking
  let hovering = false, near = false, scrolling = false, asleep = false, busy = false, away = false;
  let section = "", project = "", magicProp = "";
  let roamT = 0, scrollT = 0, chipT = 0, idleT = 0, zT = 0, talkT = 0, lastCheck = 0;
  let pointer = { x: -999, y: -999 };
  let brain = null, voice = null, listening = false, stopListen = null;

  const vw = () => document.documentElement.clientWidth, vh = () => window.innerHeight;
  const size = () => figure.offsetWidth || 72;
  const hdr = () => (document.getElementById("site-header")?.querySelector(".header-inner")?.getBoundingClientRect().bottom || 64);
  const head = () => { const r = figure.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.42, w: r.width, top: r.top, bottom: r.bottom }; };

  /* ---------- expression state */
  const refresh = () => {
    const s = mode || (flying ? "exploring" : (hovering || near) && !asleep ? "curious" : "idle");
    if (guide.dataset.state !== s) guide.dataset.state = s;
    panel.dataset.state = mode || "idle";
    stateEl.textContent = STATE_LABEL[mode] || "Personal AI assistant";
  };
  const setMode = (m) => { mode = m; refresh(); };
  const gesture = (name, ms = 1600) => {
    if (still) return;
    guide.classList.remove("do-" + name);
    void guide.offsetWidth;
    guide.classList.add("do-" + name);
    setTimeout(() => guide.classList.remove("do-" + name), ms);
  };
  /* lip movement: each spoken word is turned into a short run of mouth shapes from its vowels
     (a = open, e/i = wide, o/u = round; the mouth closes between words). An approximation, not phoneme-exact. */
  let visT = [];
  const shapesFor = (word) => (String(word).toLowerCase().match(/[aeiouy]+/g) || ["a"]).slice(0, 3).map((v) => (/[ou]/.test(v) ? "o" : /a/.test(v) ? "a" : "e"));
  const stopLips = () => { visT.forEach(clearTimeout); visT = []; clearInterval(talkT); delete guide.dataset.vis; guide.classList.remove("is-o"); };
  const lipWord = (word) => {
    if (still) return;
    visT.forEach(clearTimeout); visT = [];
    const shapes = shapesFor(word), step = shapes.length > 2 ? 85 : 105;
    shapes.forEach((v, i) => visT.push(setTimeout(() => { guide.dataset.vis = v; }, i * step)));
    visT.push(setTimeout(() => { delete guide.dataset.vis; }, shapes.length * step + 40));
  };
  const mouth = (ms) => {   // typed answers: mime the words for a moment (spoken answers are driven word by word)
    stopLips();
    if (still) return;
    const end = Date.now() + ms, pool = ["a", "e", "o", "a", "e"];
    talkT = setInterval(() => { if (Date.now() > end) { stopLips(); return; } lipWord(pool[Math.floor(Math.random() * pool.length)].repeat(1)); }, 230);
  };
  const celebrate = () => { gesture("celebrate", 1300); if (!still) { const h = head(); burst(h.x, h.top + 8, "sparkle", 10); } };

  /* ---------- position */
  const set = (x, y) => { pos = { x, y }; flyer.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`; };
  const face = (right) => guide.classList.toggle("side-left", right);   // the drawing is mirrored to look right
  const settleFace = () => { face(pos.x + size() / 2 < vw() / 2); guide.classList.toggle("chip-left", pos.x + size() / 2 >= vw() / 2); };

  const blockedAt = (x, y) => {
    for (const el of document.elementsFromPoint(x, y)) {
      if (guide.contains(el) || el.classList.contains("fx-canvas")) continue;
      if (el === document.documentElement || el === document.body) return false;
      if (el.closest(BLOCK)) return true;
      for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) return true;
    }
    return false;
  };
  const waBox = () => { const r = $(".wa-fab")?.getBoundingClientRect(); return r && r.width ? { l: r.left - 16, t: r.top - 16, r: r.right + 16, b: r.bottom + 16 } : null; };
  const clearAt = (x, y, s = size()) => {
    if (y < hdr() + 6 || y + s > vh() - 6 || x < 2 || x + s > vw() - 2) return false;
    const wa = waBox();
    if (wa && x < wa.r && x + s > wa.l && y < wa.b && y + s > wa.t) return false;
    for (const [a, b] of PROBE) if (blockedAt(x + s * a, y + s * b)) return false;
    return true;
  };
  const candidates = () => {
    const s = size(), m = compactMq.matches ? 6 : 18, top = hdr() + 14, bot = vh() - s - 14, out = [];
    if (bot <= top) return out;
    const xs = [m, vw() - s - m];
    const gutter = $("main .container")?.getBoundingClientRect().left || 0;
    if (gutter > s + 28) xs.push(gutter / 2 - s / 2, vw() - gutter / 2 - s / 2);
    for (const x of xs) for (let i = 0; i <= 6; i++) out.push({ x, y: top + ((bot - top) * i) / 6 });
    if (!compactMq.matches) for (let i = 1; i < 6; i++) { const x = m + ((vw() - s - 2 * m) * i) / 6; out.push({ x, y: top }, { x, y: bot }); }
    return out;
  };
  const usable = (c) => Math.hypot(c.x - pointer.x, c.y - pointer.y) > 140 && clearAt(c.x, c.y);
  // candidates are tried in the given order and the search stops at the first clear one: far fewer hit-tests
  const firstClear = (list) => list.find(usable) || null;
  const byDistance = (x, y) => candidates().sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));

  const fly = (tx, ty, { dur, then } = {}) => {
    cancelAnimationFrame(anim);
    const sx = pos.x, sy = pos.y, dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
    if (still || d < 3) { set(tx, ty); flying = false; flyer.style.setProperty("--bank", "0deg"); refresh(); then?.(); return; }
    const T = dur || clamp(d / 0.5, 650, 2200);
    const bend = Math.min(80, d * 0.2) * (Math.random() < 0.5 ? -1 : 1);
    const nx = -dy / d, ny = dx / d, t0 = performance.now();
    if (Math.abs(dx) > 30) face(dx > 0);
    flying = true; guide.classList.add("is-flying"); refresh();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / T);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const b = Math.sin(Math.PI * e) * bend;
      set(sx + dx * e + nx * b, sy + dy * e + ny * b);
      flyer.style.setProperty("--bank", (Math.sign(dx) * Math.sin(Math.PI * k) * Math.min(11, d / 40)).toFixed(2) + "deg");
      if (k < 1) { anim = requestAnimationFrame(step); return; }
      flying = false; guide.classList.remove("is-flying"); flyer.style.setProperty("--bank", "0deg");
      refresh(); then?.();
    };
    anim = requestAnimationFrame(step);
  };

  const setPeek = (on) => { peeking = on; guide.classList.toggle("is-peek", on); };
  const peek = () => {   // half-hidden at the nearest edge
    const s = size(), left = compactMq.matches || pos.x + s / 2 < vw() / 2;
    const wa = waBox();
    let y = clamp(pos.y, hdr() + 20, vh() - s - 20);
    if (!left && wa && y + s > wa.t) y = wa.t - s - 8;
    setPeek(true); hideChip();
    fly(left ? -s * 0.46 : vw() - s * 0.54, y, { dur: 520, then: () => { face(left); guide.classList.toggle("chip-left", !left); } });
  };
  let recheckT = 0;
  const land = (c, opts = {}) => {
    setPeek(false);
    fly(c.x, c.y, { ...opts, then: () => {
      settleFace(); opts.then?.();
      // content can appear after he lands (images loading, sections animating in): look again shortly after
      clearTimeout(recheckT); let n = 0;
      const again = () => { if (!flying && !scrolling && !hovering) settle(); if (++n < 2) recheckT = setTimeout(again, 1500); };
      recheckT = setTimeout(again, 800);
    } });
  };
  const settle = () => {   // make sure he is on clear ground
    if (docked || away || store.hidden) return;
    if (typing()) { if (!peeking) peek(); return; }   // someone is filling in a form: stay at the edge
    if (!peeking && clearAt(pos.x, pos.y)) return;
    const spot = firstClear(byDistance(pos.x, pos.y));
    if (!spot) { if (!peeking) peek(); return; }
    land(spot, { dur: clamp(Math.hypot(spot.x - pos.x, spot.y - pos.y) / 0.9, 380, 900) });   // a short hop, not a tour
  };
  const wander = () => {
    const diag = Math.hypot(vw(), vh());
    const all = candidates().sort(() => Math.random() - 0.5);
    const far = all.filter((c) => { const d = Math.hypot(c.x - pos.x, c.y - pos.y); return d > diag * 0.18 && d < diag * 0.8; });
    const spot = firstClear(far) || firstClear(byDistance(pos.x, pos.y));
    if (!spot) { if (!peeking) peek(); return; }
    land(spot);
  };
  const lookAround = () => {
    if (still) return;
    [[-7, -2], [7, -1], [0, 0]].forEach(([fx, fy], i) => setTimeout(() => {
      figure.style.setProperty("--fx", fx + "px"); figure.style.setProperty("--fy", fy + "px");
      figure.style.setProperty("--ex", fx / 2.2 + "px"); figure.style.setProperty("--ey", fy / 2 + "px");
    }, i * 800));
  };

  /* ---------- when to stay put */
  const overlay = () => !!document.querySelector("dialog[open]") || document.body.classList.contains("nav-open") || document.documentElement.classList.contains("mega-is-open");
  const typing = () => { const a = document.activeElement; return !!a && !panel.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName); };
  const paused = () => still || docked || away || store.hidden || asleep || busy || flying || scrolling || hovering || document.hidden || typing() || !!mode;
  const senseOverlay = () => {
    const on = overlay();
    if (on === away) return;
    away = on; guide.classList.toggle("is-away", on);
    if (!on) setTimeout(settle, 300);
  };
  const schedule = () => { clearTimeout(roamT); roamT = setTimeout(tick, compactMq.matches ? rand(15000, 24000) : rand(8000, 14000)); };
  const tick = () => {
    schedule();
    if (paused()) return;
    if (!peeking && !clearAt(pos.x, pos.y)) { settle(); return; }
    const r = Math.random();
    if (r < 0.66) wander();
    else if (r < 0.86) lookAround();
    else if (r < 0.94) gesture("jump", 900);
    else if (!peeking) gesture("wave", 2200);
  };

  /* ---------- the little speech chip */
  const hideChip = () => { clearTimeout(chipT); guide.classList.remove("has-chip"); };
  const showChip = (text, ms = 5200, evenPeeking = false) => {
    if (!text || docked || (peeking && !evenPeeking) || away || store.hidden) return;
    chip.textContent = text;
    guide.classList.toggle("chip-left", pos.x + size() / 2 >= vw() / 2);
    guide.classList.add("has-chip");
    clearTimeout(chipT);
    if (ms) chipT = setTimeout(hideChip, ms);
  };

  /* ---------- context: which section is in view, and what to offer there */
  const pageKey = () => location.pathname.replace(/index\.html$/, "");
  const context = () => {
    const list = cfg.contexts || [];
    return list.find((c) => c.section && c.section.includes(section)) || list.find((c) => c.page && c.page.some((p) => pageKey().includes("/" + p + "/"))) || null;
  };
  const suggestions = () => (context()?.ask || cfg.suggestions?.default || []);
  const ctx = () => {
    const m = pageKey().match(/\/portfolio\/([\w-]+)\/$/);
    const pt = PAGE_TOPIC.find(([p]) => pageKey().includes("/" + p + "/"));
    return { page: pageKey(), section, project: project || (m ? m[1] : ""), pageTopic: pt ? pt[1] : "", lastTopic: store.lastTopic };
  };
  const paintSuggestions = () => {
    askRow.replaceChildren(...suggestions().slice(0, 4).map((q) => Object.assign(document.createElement("button"), { type: "button", className: "twin-q", textContent: q })));
    if (store.back) {
      const b = Object.assign(document.createElement("button"), { type: "button", className: "twin-q twin-back", textContent: "Back to " + store.back.label });
      b.dataset.back = "1"; askRow.prepend(b);
    }
  };
  const setProp = (p) => {
    p = p || "";
    if ((guide.dataset.prop || "") === p) return;
    if (!still && !peeking && !away && !store.hidden) { const h = head(); burst(h.x, h.y - h.w * 0.25, "puff", 7); }
    guide.dataset.prop = p;
  };
  const zones = [...document.querySelectorAll("main section[id], [data-guide-prop], [data-guide]")];
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target, id = el.id || el.closest("section[id]")?.id || "";
        if (el.dataset.guideProp !== undefined || el.dataset.guide !== undefined) { if (!magicProp) setProp(el.dataset.guideProp); magicProp = ""; }
        if (!id || id === section) continue;
        const before = context();
        section = id;
        project = id.startsWith("work-") ? id.slice(5) : "";
        if (docked) paintSuggestions();
        else if (context() && context() !== before && !still) { guide.classList.add("is-hint"); setTimeout(() => guide.classList.remove("is-hint"), 2400); }
      }
    }, { rootMargin: "-40% 0px -50% 0px" });
    zones.forEach((z) => io.observe(z));
  }

  /* ---------- conversation */
  const resolve = (url) => (/^(https?:|mailto:|tel:)/.test(url) ? url : new URL(root + url, location.href).href);
  const internal = (url) => !/^(https?:|mailto:|tel:)/.test(url);
  const renderMsg = (m) => {
    const el = document.createElement("div");
    el.className = "twin-msg twin-msg-" + (m.r === "u" ? "user" : "twin");
    el.appendChild(Object.assign(document.createElement("p"), { textContent: m.x }));
    const row = document.createElement("div"); row.className = "twin-acts";
    for (const l of m.links || []) {
      const a = Object.assign(document.createElement("a"), { className: "twin-go", href: resolve(l.url), textContent: l.label });
      if (internal(l.url)) { a.dataset.go = l.url; a.dataset.label = l.label; }
      else if (l.url.startsWith("http")) { a.target = "_blank"; a.rel = "noopener"; a.insertAdjacentHTML("beforeend", '<span class="sr-only"> (opens in a new tab)</span>'); }
      row.appendChild(a);
    }
    if (m.more) row.appendChild(Object.assign(document.createElement("button"), { type: "button", className: "twin-q", textContent: "Tell me more" }));
    for (const t of m.related || []) row.appendChild(Object.assign(document.createElement("button"), { type: "button", className: "twin-q", textContent: t }));
    if (row.childElementCount) el.appendChild(row);
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  };
  const addMsg = (r, x, extra = {}) => {
    const m = { r, x, links: extra.links || [], related: extra.related || [], more: !!extra.hasMore };
    store.msgs.push(m); save();
    return renderMsg(m);
  };
  const setNote = (t, ms = 6000) => { note.textContent = t; clearTimeout(setNote.t); if (t && ms) setNote.t = setTimeout(() => { note.textContent = ""; }, ms); };

  const go = (url, label) => {   // navigate on the visitor's request, and remember the way back
    const target = new URL(root + url, location.href);
    const here = location.pathname.replace(/index\.html$/, "") === target.pathname.replace(/index\.html$/, "");
    if (here) {
      const el = target.hash ? document.getElementById(decodeURIComponent(target.hash.slice(1))) : document.body;
      if (!el) return;
      store.back = { y: Math.round(window.scrollY), label: "where I was" }; save();
      if (compactMq.matches) close(); else paintSuggestions();
      if (lenis) lenis.scrollTo(target.hash ? el : 0, { offset: -(hdr() + 12) });
      else el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
      if (compactMq.matches) setTimeout(() => showChip("Here it is. Tap me to carry on.", 4200), 1500);
      return;
    }
    const title = (document.querySelector("h1")?.textContent || document.title).trim().split(/\s+/).slice(0, 4).join(" ");
    store.back = { url: location.href, label: title.length > 30 ? "the previous page" : title };
    store.arrived = label || ""; store.open = !compactMq.matches; save();
    voice?.stopSpeaking();
    location.href = target.href;
  };
  const goBack = () => {
    const b = store.back; if (!b) return;
    store.back = null; save();
    if (b.url) { store.arrived = ""; store.open = !compactMq.matches; save(); location.href = b.url; return; }
    paintSuggestions();
    if (lenis) lenis.scrollTo(b.y); else window.scrollTo({ top: b.y, behavior: still ? "auto" : "smooth" });
  };

  const say = async (text) => {   // read an answer aloud (only when the visitor has switched voice on)
    if (!store.voice) { mouth(Math.min(2600, text.split(/\s+/).length * 95)); return; }
    try { voice = voice || await import("./twin-voice.js"); } catch { return; }
    if (!voice.canSpeak) return;
    let last = 0, pulse = 0;
    const onWord = (word) => { last = Date.now(); lipWord(word || "a"); panel.classList.add("is-beat"); setTimeout(() => panel.classList.remove("is-beat"), 160); };
    stopLips();
    voice.speak(text, {
      // browsers that send no word events still get a moving mouth
      onStart: () => { setMode("speaking"); pulse = setInterval(() => { if (Date.now() - last > 420) onWord(["a", "e", "o"][Math.floor(Math.random() * 3)]); }, 240); },
      onWord,
      onEnd: () => { clearInterval(pulse); stopLips(); if (mode === "speaking") setMode(""); },
    });
  };

  const ask = async (question) => {
    const q = question.trim().slice(0, 300);
    if (!q || busy) return;
    voice?.stopSpeaking();
    addMsg("u", q); input.value = ""; setNote("");
    busy = true; panel.classList.add("is-busy"); setMode("thinking");
    const dots = Object.assign(document.createElement("div"), { className: "twin-msg twin-msg-twin twin-typing", innerHTML: "<p><i></i><i></i><i></i><span class=\"sr-only\">Thinking</span></p>" });
    log.appendChild(dots); log.scrollTop = log.scrollHeight;
    let res;
    try {
      const [b] = await Promise.all([brain || import("./twin-brain.js"), new Promise((r) => setTimeout(r, still ? 0 : rand(380, 620)))]);
      brain = b;
      res = await brain.ask(q, { root, endpoint, history: store.msgs.slice(-9, -1).map((m) => ({ role: m.r === "u" ? "user" : "assistant", text: m.x })), ctx: ctx() });
    } catch {
      res = { text: "I can't reach my notes right now. Please check your connection and try again — or contact Dwaipyan directly.", links: [{ label: "Email him", url: "mailto:rajdwaipayan@gmail.com" }], kind: "error" };
    }
    dots.remove();
    busy = false; panel.classList.remove("is-busy"); setMode("");
    if (res.topic) store.lastTopic = res.topic;
    const links = [...(res.links || [])];
    if (res.go && !res.go.auto && !links.some((l) => l.url === res.go.url)) links.unshift({ label: "Open " + res.go.label, url: res.go.url });
    addMsg("t", res.text, { ...res, links });
    say(res.text);
    if (res.trick) setTimeout(() => runTrick(res.trick), 250);
    if (res.celebrate) celebrate();
    if (res.go?.auto) setTimeout(() => go(res.go.url, res.go.label), still ? 300 : 1200);
  };

  /* ---------- voice controls */
  const paintVoice = () => { voiceBtn.setAttribute("aria-pressed", String(!!store.voice)); };
  voiceBtn.addEventListener("click", async () => {
    try { voice = voice || await import("./twin-voice.js"); } catch { setNote("Voice couldn't be loaded. Text chat still works."); return; }
    if (!voice.canSpeak) { setNote("This browser can't read text aloud. Text chat still works."); return; }
    store.voice = !store.voice; save(); paintVoice();
    if (store.voice) { setNote("I'll read my answers aloud."); const lastTwin = [...store.msgs].reverse().find((m) => m.r === "t"); if (lastTwin) say(lastTwin.x); }
    else { voice.stopSpeaking(); setMode(""); setNote("Voice off."); }
  });
  const MIC_ERR = {
    "not-allowed": "Microphone access was blocked. Allow it in your browser's site settings, or type your question.",
    "service-not-allowed": "Microphone access was blocked. Allow it in your browser's site settings, or type your question.",
    "no-speech": "I didn't hear anything. Tap the microphone to try again, or type.",
    "audio-capture": "No microphone was found. You can type your question instead.",
    network: "Voice recognition needs an internet connection. Please type instead.",
    unsupported: "Voice input isn't available in this browser. You can type your question instead.",
  };
  const micOff = () => { listening = false; micBtn.setAttribute("aria-pressed", "false"); if (mode === "listening") setMode(""); };
  micBtn.addEventListener("click", async () => {
    try { voice = voice || await import("./twin-voice.js"); } catch { setNote("Voice couldn't be loaded. Text chat still works."); return; }
    if (listening) { stopListen?.(); return; }
    if (!voice.canListen) { setNote(MIC_ERR.unsupported, 9000); return; }
    voice.stopSpeaking();
    stopListen = voice.listen({
      onStart: () => { listening = true; micBtn.setAttribute("aria-pressed", "true"); setMode("listening"); setNote("Listening — ask your question.", 0); },
      onInterim: (t) => { input.value = t; },
      onFinal: (t) => { if (voice.canSpeak && !store.voice) { store.voice = true; save(); paintVoice(); } setNote(""); ask(t); },
      onError: (code) => { setNote(MIC_ERR[code] || "Voice input stopped. You can type your question instead.", 9000); },
      onEnd: () => { micOff(); if (note.textContent.startsWith("Listening")) setNote(""); },
    });
  });

  /* ---------- tricks (the original drawn-me repertoire) */
  const later = (ms, fn) => setTimeout(fn, still ? 0 : ms);
  const tricks = {
    wave() { gesture("wave", 2200); sfx.pop(); },
    dance() { gesture("dance", 2500); sfx.dance(); [0, 800, 1600].forEach((t) => later(t, () => { const h = head(); burst(h.x, h.top + 10, "sparkle", 8); })); return 2500; },
    jump() { gesture("jump", 900); sfx.boing(); later(620, () => { const h = head(); burst(h.x, h.bottom - 4, "puff", 7); }); return 900; },
    sneeze() { gesture("sneeze", 1400); sfx.achoo(); later(650, () => { const h = head(); const dir = guide.classList.contains("side-left") ? 1 : -1; burst(h.x + dir * h.w * 0.12, h.y + h.w * 0.05, "drop", 14, -dir); }); return 1400; },
    spin() { gesture("spin", 1000); sfx.spin(); later(500, () => { const h = head(); burst(h.x, h.y, "sparkle", 12); }); return 1000; },
    magic() {
      sfx.chime(); const h = head(); burst(h.x, h.y, "sparkle", 30, 1.4); gesture("poof", 900);
      const options = COSTUMES.filter((c) => c !== guide.dataset.prop);
      magicProp = options[Math.floor(Math.random() * options.length)];
      later(300, () => { guide.dataset.prop = magicProp; });
      return 900;
    },
  };
  let tricking = false;
  const runTrick = (name) => {
    if (tricking || !tricks[name]) return;
    unlock(); wake(true); tricking = true;
    setTimeout(() => { tricking = false; }, still ? 300 : tricks[name]() || 1200);
  };
  tray.addEventListener("click", (e) => { const b = e.target.closest("[data-trick]"); if (b) runTrick(b.dataset.trick); });
  const paintSfx = () => { sfxBtn.setAttribute("aria-pressed", String(!isMuted())); sfxBtn.textContent = "Sound effects: " + (isMuted() ? "off" : "on"); };
  sfxBtn.addEventListener("click", () => { unlock(); setMuted(!isMuted()); paintSfx(); sfx.pop(); });
  paintSfx();
  moreBtn.addEventListener("click", () => { const on = tray.hidden; tray.hidden = !on; moreBtn.setAttribute("aria-expanded", String(on)); log.scrollTop = log.scrollHeight; place(); });
  $("#twin-about").textContent = (endpoint
    ? "Answers come from an AI model that is given Dwaipyan's published portfolio; it can be wrong, so check anything important with him. "
    : "Answers are matched from Dwaipyan's published portfolio in your browser — no AI service is called and nothing you type is sent anywhere. ")
    + "Voice uses your browser's speech features; some browsers process the audio on their own servers. The conversation is kept only until you close this tab.";

  /* ---------- the panel */
  const dockSize = () => (compactMq.matches ? 68 : 92);
  const place = () => {   // sit on the panel's top-left corner
    if (!docked) return;
    const r = panel.getBoundingClientRect(), s = dockSize();
    cancelAnimationFrame(anim); flying = false; guide.classList.remove("is-flying");
    set(r.left + 14, r.top - s * 0.56);
  };
  const open = ({ focus = true, quiet = false } = {}) => {
    if (docked) { if (focus) input.focus({ preventScroll: true }); return; }
    if (store.hidden) { store.hidden = false; guide.classList.remove("is-hidden"); }
    wake(true); hideChip(); setPeek(false);
    docked = true; store.open = true; store.greeted = true; save();
    panel.hidden = false;
    guide.classList.add("is-docked"); figure.setAttribute("aria-expanded", "true");
    paintSuggestions();
    const r = panel.getBoundingClientRect(), s = dockSize();
    face(true); guide.classList.remove("chip-left");
    fly(r.left + 14, r.top - s * 0.56, { dur: quiet ? 1 : 620, then: place });
    requestAnimationFrame(() => panel.classList.add("is-open"));
    if (!store.msgs.length) addMsg("t", cfg.intro || "Ask me anything about Dwaipyan.");
    log.scrollTop = log.scrollHeight;
    if (!quiet) { gesture("wave", 2200); unlock(); sfx.pop(); }
    if (focus && !coarse.matches) setTimeout(() => input.focus({ preventScroll: true }), 80);
    import("./twin-brain.js").then((b) => { brain = b; b.load(root).catch(() => {}); }).catch(() => {});
    refresh();
  };
  const close = ({ focus = false } = {}) => {
    if (!docked) return;
    docked = false; store.open = false; save();
    voice?.stopSpeaking(); if (listening) voice?.cancelListening(); micOff(); setMode("");
    panel.classList.remove("is-open"); guide.classList.remove("is-docked"); figure.setAttribute("aria-expanded", "false");
    tray.hidden = true; moreBtn.setAttribute("aria-expanded", "false");
    setTimeout(() => { if (!docked) panel.hidden = true; }, 320);
    requestAnimationFrame(() => { const spot = firstClear(byDistance(pos.x, pos.y)); if (spot) land(spot); else peek(); });
    if (focus) figure.focus({ preventScroll: true });
    schedule();
  };
  figure.addEventListener("click", () => {
    if (asleep) wake(true);
    if (docked) { gesture("jump", 700); unlock(); sfx.pop(); return; }
    open();
  });
  $("#twin-close").addEventListener("click", () => close({ focus: true }));
  panel.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); close({ focus: true }); } });
  form.addEventListener("submit", (e) => { e.preventDefault(); ask(input.value); });
  panel.addEventListener("click", (e) => {
    const q = e.target.closest(".twin-q");
    if (q) { if (q.dataset.back) goBack(); else ask(q.textContent); return; }
    const a = e.target.closest("a[data-go]");
    if (a) { e.preventDefault(); go(a.dataset.go, a.dataset.label); }
  });
  $("#twin-clear").addEventListener("click", () => {
    voice?.stopSpeaking(); store.msgs = []; store.lastTopic = ""; save();
    log.replaceChildren(); addMsg("t", cfg.intro || "Ask me anything about Dwaipyan."); setNote("Conversation cleared.");
  });
  $("#twin-hide").addEventListener("click", () => {
    close(); store.hidden = true; save(); hideChip();
    guide.classList.add("is-hidden");
    document.querySelector("[data-guide-open]")?.focus({ preventScroll: true });
  });
  document.querySelectorAll("[data-guide-open]").forEach((b) => b.addEventListener("click", () => {
    if (store.hidden) { store.hidden = false; save(); guide.classList.remove("is-hidden"); set(vw() - size() - 24, vh() - size() - 120); }
    open();
  }));
  if ("ResizeObserver" in window) new ResizeObserver(place).observe(panel);
  if (window.visualViewport) {   // keep the text box above the phone keyboard
    const vv = window.visualViewport;
    const fit = () => { panel.style.setProperty("--kb", Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) + "px"); panel.style.setProperty("--vvh", Math.round(vv.height) + "px"); place(); };
    vv.addEventListener("resize", fit); fit();
  }

  /* ---------- sleep when nobody is around */
  const sleep = () => {
    if (docked || busy || asleep || document.hidden || store.hidden || away || peeking || flying || mode) return;
    asleep = true; hideChip(); guide.classList.add("is-asleep"); refresh();
    const z = () => { if (!asleep) return; if (!document.hidden) { const h = head(); burst(h.x + h.w * 0.2, h.y - h.w * 0.25, "z", 3); } zT = setTimeout(z, 2800); };
    if (!still) z();
  };
  function wake(silent = false) {
    if (!asleep) return;
    asleep = false; clearTimeout(zT); guide.classList.remove("is-asleep"); refresh();
    if (!silent) gesture("jump", 900);
  }
  const poke = () => { clearTimeout(idleT); idleT = setTimeout(sleep, 70000); };
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach((t) => window.addEventListener(t, () => { if (asleep) wake(); poke(); }, { passive: true }));
  poke();

  /* ---------- the page moves: scroll, resize, overlays, forms */
  window.addEventListener("scroll", () => {
    poke();
    if (docked || store.hidden || away) return;
    if (!scrolling) { scrolling = true; hideChip(); }
    const now = performance.now();
    if (now - lastCheck > 180) { lastCheck = now; if (!peeking && !flying && !clearAt(pos.x, pos.y)) peek(); }
    clearTimeout(scrollT);
    scrollT = setTimeout(() => { scrolling = false; settle(); }, 460);
  }, { passive: true });
  let resizeT = 0;
  window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (docked) place(); else { setPeek(false); set(clamp(pos.x, 6, vw() - size() - 6), clamp(pos.y, hdr() + 10, vh() - size() - 10)); settle(); } }, 180); });
  ["click", "keyup", "toggle", "close"].forEach((t) => document.addEventListener(t, () => setTimeout(senseOverlay, 80), true));
  document.addEventListener("focusin", () => { if (typing() && !docked && !peeking && !store.hidden) peek(); });
  document.addEventListener("focusout", () => setTimeout(() => { if (!typing() && peeking && !scrolling) settle(); }, 200));
  document.addEventListener("visibilitychange", () => { if (document.hidden) { voice?.stopSpeaking(); if (mode === "speaking") setMode(""); } else schedule(); });
  window.addEventListener("pagehide", () => { voice?.stopSpeaking(); save(); });

  /* ---------- other parts of the page can make him react (fx.js) */
  document.addEventListener("guide:say", (e) => {
    const { line, gesture: g, sound } = e.detail || {};
    if (g) gesture(g, g === "dance" ? 2500 : 1600);
    if (sound && sfx[sound]) sfx[sound]();
    if (line && e.detail.force) showChip(line, 3600);
  });

  /* ---------- pointer: hover hint, curiosity, eyes */
  figure.addEventListener("pointerenter", (e) => {
    if (e.pointerType !== "mouse" || docked) return;
    hovering = true; refresh();
    if (peeking) { const s = size(); setPeek(false); fly(pos.x < 0 ? 8 : vw() - s - 8, pos.y, { dur: 320, then: settleFace }); }
    else showChip(context()?.hint || "Ask me about Dwaipyan", 0);
  });
  figure.addEventListener("pointerleave", () => { if (!hovering) return; hovering = false; hideChip(); refresh(); if (!docked) setTimeout(() => { if (!hovering && !docked) settle(); }, 900); });
  figure.addEventListener("focus", () => { if (!docked && figure.matches(":focus-visible")) { if (peeking) { setPeek(false); fly(pos.x < 0 ? 8 : vw() - size() - 8, pos.y, { dur: 200, then: settleFace }); } showChip(context()?.hint || "Ask me about Dwaipyan", 0); } });
  figure.addEventListener("blur", hideChip);

  if (!still) {
    const blink = () => { if (!asleep && !document.hidden) { guide.classList.add("is-blink"); setTimeout(() => guide.classList.remove("is-blink"), 140); } setTimeout(blink, 2400 + Math.random() * 3600); };
    setTimeout(blink, 2600);
    if (finePointer.matches) {
      let frame = 0;
      window.addEventListener("pointermove", (e) => {
        pointer = { x: e.clientX, y: e.clientY };
        if (frame || store.hidden) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          const h = head(), dx = pointer.x - h.x, dy = pointer.y - h.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 260);
          const flip = guide.classList.contains("side-left") ? -1 : 1, ux = (dx / d) * k * flip, uy = (dy / d) * k;
          figure.style.setProperty("--ex", (ux * 3.4).toFixed(2) + "px"); figure.style.setProperty("--ey", (uy * 3.4).toFixed(2) + "px");
          figure.style.setProperty("--fx", (ux * 7).toFixed(2) + "px"); figure.style.setProperty("--fy", (uy * 4).toFixed(2) + "px");
          figure.style.setProperty("--tilt", (clamp(dx / 90, -6, 6) * flip).toFixed(2) + "deg");
          const n = d < 170 && !docked;
          if (n !== near) { near = n; refresh(); }
        });
      }, { passive: true });
    }
  }

  /* ---------- enter */
  store.msgs.forEach(renderMsg);
  paintVoice();
  guide.hidden = false;
  if (store.hidden) guide.classList.add("is-hidden");
  refresh();
  const s0 = size();
  set(vw() + 30, clamp(vh() * 0.34, hdr() + 20, vh() - s0 - 20));
  requestAnimationFrame(() => guide.classList.add("is-on"));
  const whenIdle = (fn) => setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2500 }) : fn()), still ? 200 : 1100);
  whenIdle(() => {
    senseOverlay();
    if (store.open && !compactMq.matches) {
      open({ focus: false, quiet: true });
      if (store.arrived) { addMsg("t", `Here's ${store.arrived}. Ask me anything about it.`); store.arrived = ""; save(); }
      return;
    }
    store.open = false;
    // prefer the right-hand side, a little above the middle — away from the WhatsApp button
    const spot = firstClear(byDistance(vw() * 0.9, vh() * 0.5));
    const after = () => {
      if (store.arrived) { showChip(`Here's ${store.arrived}. Tap me to carry on.`, 5200); store.arrived = ""; save(); return; }
      if (store.greeted) return;
      store.greeted = true; save();
      gesture("wave", 2200);
      if (!still) { const h = head(); burst(h.x, h.y, "sparkle", 14); }
      showChip(guide.dataset.greeting, compactMq.matches ? 5000 : 7000);
    };
    if (spot) land(spot, { dur: still ? 1 : 1500, then: after });
    else {   // nowhere clear to land: peek in from the edge and say hello from there
      set(compactMq.matches ? -s0 : vw(), pos.y); peek();
      setTimeout(() => { if (store.arrived) { store.arrived = ""; save(); } if (store.greeted || docked) return; store.greeted = true; save(); showChip(guide.dataset.greeting, 5000, true); }, 900);
    }
    schedule();
  });
}
