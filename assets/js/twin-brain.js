// The digital twin's brain — loaded the first time a visitor asks something.
//
// Two ways to answer, in this order:
//   1. Live AI (optional): if _data/twin.yml has an `endpoint`, the question goes to that server
//      (tools/twin-worker), which holds the API key and calls a language model. No key is ever in this code.
//   2. Portfolio answers (always available): the question is matched against assets/twin-knowledge.json —
//      topics written in _data/twin.yml plus the project and service data — entirely in the browser.
// If the live service is missing, slow or failing, the twin falls back to (2) and says nothing is wrong.
// It never invents: below a confidence threshold it says it doesn't know and offers the contact options.

const STOP = new Set("a an the is are was were be been am do does did has have had of to in on at for with and or but if so it its this that these those i you he she we they me my your his her our their him them what which who whom when where why how can could would should will shall may might about tell say please give any some there here from as by not no yes into than then also just very really more most much many up out over under again know knows s t ll d re ve m".split(" "));
const SYN = {
  ghl: "gohighlevel", highlevel: "gohighlevel", wp: "wordpress", site: "website", sites: "website", websites: "website", web: "website",
  resume: "cv", "résumé": "cv", uni: "university", college: "university", studied: "education", study: "education", studies: "education", degree: "education", degrees: "education",
  job: "experience", jobs: "experience", career: "experience", worked: "experience",
  priced: "price", quoted: "price", programs: "programme", programmes: "programme", program: "programme", hacked: "hack", hacking: "hack", malware: "hack",
  cost: "price", costs: "price", pricing: "price", prices: "price", rate: "price", rates: "price", fee: "price", fees: "price", charge: "price", budget: "price",
  email: "contact", mail: "contact", phone: "contact", reach: "contact", call: "contact",
  hiring: "hire", employ: "hire", recruit: "hire", commission: "hire",
  security: "cybersecurity", cyber: "cybersecurity", infosec: "cybersecurity",
  ngo: "surjamukhi", sangstha: "surjamukhi", organisations: "organisation", organization: "organisation", organizations: "organisation",
  skill: "skills", expertise: "skills", stack: "skills", technologies: "skills",
  projects: "project", clients: "client", services: "service", automations: "automation", agents: "agent", prompts: "prompt",
  dwaipayan: "dwaipyan", mandal: "dwaipyan", collaborate: "collaboration", partner: "collaboration", partnership: "collaboration",
  photos: "photography", photo: "photography", pictures: "photography", videos: "video", articles: "writing", blog: "writing",
};
const norm = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "").replace(/[^a-z0-9#+.\s-]/g, " ").replace(/\s+/g, " ").trim();
const stem = (w) => SYN[w] || (w.length > 4 && w.endsWith("ies") ? w.slice(0, -3) + "y" : w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? (SYN[w.slice(0, -1)] || w.slice(0, -1)) : w);
const tokens = (s) => norm(s).split(/[\s.-]+/).filter((w) => w && !STOP.has(w)).map(stem);

let kb = null, index = null, loading = null;

export function load(root) {
  if (kb) return Promise.resolve(kb);
  if (!loading) {
    loading = fetch(root + "assets/twin-knowledge.json", { credentials: "omit" })
      .then((r) => { if (!r.ok) throw new Error("knowledge " + r.status); return r.json(); })
      .then((data) => { kb = data; build(); return kb; })
      .catch((e) => { loading = null; throw e; });
  }
  return loading;
}

function build() {
  const df = new Map();
  index = kb.topics.map((t) => {
    const phrases = (t.q || []).map(norm);
    const strong = new Set([...tokens(t.t), ...phrases.flatMap((p) => tokens(p))]);
    const weak = new Set(tokens(t.a + " " + (t.more || "")));
    new Set([...strong, ...weak]).forEach((w) => df.set(w, (df.get(w) || 0) + 1));
    return { t, phrases, strong, weak };
  });
  const n = index.length;
  index.idf = (w) => Math.log(1 + n / (1 + (df.get(w) || 0)));
}

/** best matching topics for a question: [{ topic, score, coverage }] */
function search(question) {
  const q = norm(question), words = tokens(question);
  const total = words.reduce((s, w) => s + index.idf(w), 0) || 1;   // no content words ("what does he do?") still matches by phrase
  return index.map((e) => {
    let score = 0, hit = 0;
    for (const w of words) {
      const idf = index.idf(w);
      if (e.strong.has(w)) { score += 3 * idf; hit += idf; }
      else if (e.weak.has(w)) { score += 0.6 * idf; hit += 0.35 * idf; }
    }
    let phrase = false;
    for (const p of e.phrases) if (p.length > 3 && (" " + q + " ").includes(" " + p + " ")) { score += 4 + p.split(" ").length * 1.5; phrase = true; }
    return { topic: e.t, score, coverage: phrase ? Math.max(0.5, hit / total) : hit / total };
  }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const TRICKS = { wave: /\b(wave|say hi|hello there)\b/, dance: /\b(dance|dancing|moves)\b/, jump: /\b(jump|hop)\b/, sneeze: /\bsneeze\b/, spin: /\b(spin|twirl|turn around)\b/, magic: /\b(magic|costume|outfit|dress up|change clothes)\b/ };

function place(q) {
  let best = null, len = 0;
  for (const p of kb.places) for (const w of [p.label.toLowerCase(), ...p.words]) {
    if ((" " + q + " ").includes(" " + w + " ") && w.length > len) { best = p; len = w.length; }
  }
  return best;
}

/**
 * Answer from the portfolio's own content.
 * ctx: { page, section, project, lastTopic }  →  { text, links, topic, go?, trick?, kind }
 */
export function answerLocal(question, ctx = {}) {
  const q = norm(question);
  const byId = (id) => kb.topics.find((t) => t.id === id);
  const out = (text, extra = {}) => ({ text, links: [], kind: "answer", ...extra });
  const topicOut = (t, more = false) => out(more && t.more ? t.more : t.a, { links: t.links || [], topic: t.id, hasMore: !more && !!t.more });

  if (!q) return out("I didn't catch that — could you say it again?", { kind: "small" });
  if (/^(hi|hello|hey|hiya|good (morning|afternoon|evening)|salam|assalamu alaikum|namaste|nomoshkar)\b/.test(q) && q.split(" ").length <= 4)
    return out(pick(["Hello! What would you like to know about Dwaipyan?", "Hi there. Ask me about his work, his experience or how to reach him."]), { kind: "small" });
  if (/^(thanks|thank you|thx|cheers|great|awesome|perfect|nice|cool|good job|well done)\b/.test(q) && q.split(" ").length <= 6)
    return out(pick(["You're welcome. Anything else you'd like to know?", "Glad that helped. Ask me anything else."]), { kind: "small", celebrate: true });
  if (/^(bye|goodbye|see you|that s all|thats all|no thanks)\b/.test(q)) return out("Thanks for stopping by. I'll be floating around if you need me.", { kind: "small" });
  for (const [name, re] of Object.entries(TRICKS)) if (re.test(q) && q.split(" ").length <= 6 && !/\b(who|what|how|why)\b/.test(q)) return out(name === "magic" ? "New look coming up." : "With pleasure.", { kind: "small", trick: name });

  if (/\b(who|what) are you\b|\bare you (real|human|an? ai|a bot|a robot|chatgpt|alive)\b|\byour name\b|how do you work|are you dwaipyan/.test(q))
    return out(ctx.live
      ? "I'm Dwaipyan's digital twin — a drawn version of him connected to an AI model that answers from his portfolio. I'm not Dwaipyan himself, so for anything important, check with him directly."
      : "I'm Dwaipyan's digital twin — a drawn version of him that answers from what's published on this portfolio. I'm not Dwaipyan himself and not a general chatbot, so if I don't know something, I'll say so.", { kind: "small" });
  if (/\bwhat can (you|i) (do|ask)\b|^help\b|what do you know/.test(q)) return out(kb.intro, { kind: "small" });

  // a visitor describing their own business → hand it to the Business Builder on /solutions/
  if (/^(i|we)\s?(want|wanna|would like|d like|plan|am planning|are planning|need|own|run|have|m starting|am starting|are starting)\b.*\b(business|company|startup|shop|store|restaurant|clinic|agency|brand|platform|ecommerce|e commerce|online store|factory|ngo|school|hotel|cafe|firm|practice)\b/.test(q)
      || /^(my|our) (business|company|startup|shop|store|restaurant|clinic|agency|organisation|organization|ngo|firm|factory|brand) /.test(q)
      || /\b(business idea|start a business|starting a business|open a business|launch a business|grow my business|scale my business|expand my business)\b/.test(q))
    return out("That's exactly what the Business Builder is for. I'll pass your words to it — it asks a few questions and drafts a preliminary blueprint: services, technology, marketing, automation and a phased roadmap. It's a starting point for a conversation, not a quote.",
      { links: [{ label: "Draft my blueprint", url: "solutions/#builder", prefill: question.trim().slice(0, 1200) }, { label: "Business solutions", url: "solutions/" }], topic: "solutions", kind: "answer" });

  // "explain this project / this page"
  if (/\b(this|that|current|selected) (project|site|website|case|one|page)\b|\bexplain (this|it)\b|what am i looking at/.test(q)) {
    const t = ctx.project && byId("project-" + ctx.project);
    if (t) return topicOut(t);
    if (ctx.pageTopic && byId(ctx.pageTopic)) return topicOut(byId(ctx.pageTopic));
  }
  // follow-ups
  if (ctx.lastTopic && /^(tell me more|more|go on|continue|and\b|what else|anything else|details?|elaborate|explain more|why|how so)/.test(q) && q.split(" ").length <= 5) {
    const t = byId(ctx.lastTopic);
    if (t && t.more) return topicOut(t, true);
  }
  if (ctx.lastTopic && /built with|what (tools|stack|platform)|which (tools|platform)/.test(q) && ctx.lastTopic.startsWith("project-")) return topicOut(byId(ctx.lastTopic), true);
  if (ctx.project && /built with|what (tools|stack|platform)|which (tools|platform)/.test(q)) return topicOut(byId("project-" + ctx.project), true);

  // navigation: "take me to…", "open…", "show me the … page"
  const nav = q.match(/^(?:please )?(?:can you |could you )?(?:take me to|go to|open|navigate to|bring me to|jump to|scroll to|show me|show|see|view|visit|where is|where can i (?:find|see))\s+(.+)$/);
  if (nav) {
    const p = place(nav[1].replace(/\b(the|his|your|page|section|me)\b/g, " ").replace(/\s+/g, " ").trim()) || place(q);
    const explicit = /take me|go to|open|navigate|bring me|jump|scroll/.test(nav[0]);
    if (p) {
      const hits = search(question);
      const t = !explicit && hits[0] && hits[0].score >= 5 ? hits[0].topic : null;
      return out(t ? t.a : `Opening ${p.label}.`, { links: t ? (t.links || []) : [], topic: t ? t.id : undefined, go: { label: p.label, url: p.url, auto: explicit }, kind: "nav" });
    }
  }

  const hits = search(question);
  const top = hits[0];
  if (top && top.score >= 5 && top.coverage >= 0.3) {
    const res = topicOut(top.topic);
    const also = hits.slice(1, 4).filter((h) => h.score >= Math.max(5, top.score * 0.6) && h.topic.id !== top.topic.id).map((h) => h.topic.t);
    if (also.length) res.related = also.slice(0, 2);
    return res;
  }
  // nothing solid: be honest, offer the nearest topics
  const near = hits.filter((h) => h.score >= 2.5).slice(0, 3).map((h) => h.topic.t);
  return out(kb.unknown, { kind: "unknown", related: near, links: [{ label: "Contact form", url: "#contact" }, { label: "Email him", url: "mailto:rajdwaipayan@gmail.com" }] });
}

/* ---------- optional live AI (server-side key; see tools/twin-worker) */
let liveDown = 0, lastCall = 0, calls = 0;
const MAX_CALLS = 40;           // per page load
const MIN_GAP = 1500;           // ms between requests

async function answerLive(endpoint, question, history, ctx) {
  if (calls >= MAX_CALLS || Date.now() < liveDown) throw new Error("live unavailable");
  const wait = lastCall + MIN_GAP - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now(); calls++;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 14000);
  try {
    const res = await fetch(endpoint, {
      method: "POST", signal: ctl.signal, credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question.slice(0, 300), history: history.slice(-8), page: ctx.page || "", section: ctx.section || "" }),
    });
    if (!res.ok) throw new Error("live " + res.status);
    const data = await res.json();
    if (!data || typeof data.answer !== "string" || !data.answer.trim()) throw new Error("live empty");
    return data.answer.trim().slice(0, 1200);
  } catch (e) {
    liveDown = Date.now() + 60000;   // rest the live service for a minute, answer locally meanwhile
    throw e;
  } finally { clearTimeout(timer); }
}

/** The one entry point: resolves to { text, links, topic, go, trick, kind, source } */
export async function ask(question, { root, endpoint, history = [], ctx = {} }) {
  await load(root);
  const local = answerLocal(question, { ...ctx, live: !!endpoint });
  // small talk, tricks and navigation are handled here; so is everything when no server is configured
  if (!endpoint || local.kind === "small" || local.kind === "nav") return { ...local, source: "local" };
  try {
    const text = await answerLive(endpoint, question, history, ctx);
    return { ...local, text, kind: "answer", related: [], source: "live" };
  } catch { return { ...local, source: "local" }; }
}

export const topicTitle = (id) => (kb && kb.topics.find((t) => t.id === id) || {}).t || "";
