// DWAIPYAN INTELLIGENCE — builds the knowledge graph from the site's own data files (embedded in the page by
// Jekyll) and the curated connections in _data/intelligence.yml. Pure functions, no DOM: the same graph feeds the
// map, the search and the briefs. A reference that doesn't resolve is dropped, never guessed.

export const LEVELS = {
  live:   { rank: 6, label: "Live project",               short: "Live" },
  record: { rank: 5, label: "Record",                     short: "Record" },
  role:   { rank: 4, label: "Described on this site",     short: "On this site" },
  self:   { rank: 3, label: "Self-described",             short: "Self-described" },
  stated: { rank: 2, label: "Stated, not yet documented", short: "Stated" },
  goal:   { rank: 1, label: "Goal",                       short: "Goal" },
};
export const TYPES = {
  person: "Person", cap: "Capability", tech: "Tool or skill", proj: "Project", role: "Role", edu: "Education",
  report: "Research report", train: "Training", bscp: "Academic project", research: "Research interest", prog: "Programme", goal: "Goal",
};

export const slug = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const ALIAS = { "asp-net-mvc": "c-asp-net-mvc", "html": "html-css", "css": "html-css" };
const techId = (name) => "tech:" + (ALIAS[slug(name)] || slug(name));

export function buildGraph(D) {
  const I = D.intel, nodes = new Map(), adj = new Map();
  const add = (n) => { if (!nodes.has(n.id)) { nodes.set(n.id, { evidence: [], meta: [], ...n }); adj.set(n.id, new Map()); } return nodes.get(n.id); };
  const link = (a, b, rel) => {
    if (!nodes.has(a) || !nodes.has(b) || a === b) return;
    if (!adj.get(a).has(b)) adj.get(a).set(b, rel);
    if (!adj.get(b).has(a)) adj.get(b).set(a, rel);
  };

  add({ id: "me", type: "person", label: "Dwaipyan Mandal", level: "record",
    summary: "Technology professional, entrepreneur and NGO executive in Dhaka, Bangladesh. Start here, or pick a capability.",
    page: "about/" });

  // ── technologies: names from skills.yml groups and project tools ──
  const techName = new Map();
  const groupOf = new Map();
  (D.skills || []).forEach((g) => (g.items || []).forEach((name) => { techName.set(techId(name), name); groupOf.set(techId(name), g.group); }));
  (D.projects || []).forEach((p) => (p.built_with || []).forEach((name) => { if (!techName.has(techId(name))) techName.set(techId(name), name); }));
  const bsc = (D.education.degrees || []).find((d) => d.id === "bsc");
  (bsc?.projects || []).forEach((bp) => (bp.tools || []).forEach((name) => { if (!techName.has(techId(name))) techName.set(techId(name), name); }));
  techName.forEach((name, id) => {
    const studying = /\(studying\)/i.test(name);
    add({ id, type: "tech", label: name.replace(/\s*\(studying\)/i, ""), level: studying ? "goal" : "self",
      summary: studying ? "Being studied now — part of the research direction, not yet a delivered skill." : groupOf.has(id) ? `Listed under “${groupOf.get(id)}” in the skills.` : "Used in the work below.",
      page: groupOf.has(id) ? "experience/#skills" : null });
  });

  // ── projects (live client sites) ──
  (D.projects || []).forEach((p) => {
    const n = add({ id: "proj:" + p.id, type: "proj", label: p.title, level: p.url ? "live" : "role",
      summary: p.summary || p.work, page: `portfolio/${p.id}/`, url: p.url || null,
      meta: [p.industry, (p.country || "").split(" · ")[0], p.work].filter(Boolean), role: p.role || "", brief: p.brief || "", built: p.built_with || [] });
    if (p.url) n.evidence.push({ label: "Open the live site", url: p.url, ext: true });
    n.evidence.push({ label: "Read the case study", url: `portfolio/${p.id}/` });
    (p.built_with || []).forEach((t) => link(n.id, techId(t), "built with"));
  });
  (I.projects_extra || []).forEach((p) => {
    add({ id: "proj:" + p.id, type: "proj", label: p.label, level: p.level, summary: p.summary, page: p.page, meta: ["Internal"] });
    (p.tech || []).forEach((t) => link("proj:" + p.id, "tech:" + t, "built with"));
  });

  // ── roles ──
  const orgs = [...(D.experience.organisations || []), ...(D.experience.independent || [])];
  (I.roles || []).forEach((r) => {
    if (r.from) {
      const org = orgs.find((o) => o.org === r.from && o.published !== false);
      if (!org) return;
      const role = r.title ? (org.roles || []).find((x) => x.title === r.title) : (org.roles || [])[0];
      if (!role) return;
      const when = [role.start_label, role.end_label].filter(Boolean).join(" – ");
      add({ id: "role:" + r.id, type: "role", label: `${role.title} — ${org.org.replace(/\s*\(.*\)$/, "")}`, short: r.short, level: r.level,
        summary: role.summary || "", page: r.page, meta: [when, org.location].filter(Boolean), points: role.points || [],
        kw: [org.org_note || "", /non-governmental/i.test(org.org_note || "") ? "NGO" : "", ...(org.skills || [])].filter(Boolean) });
    } else {
      add({ id: "role:" + r.id, type: "role", label: r.label, short: r.short, level: r.level, summary: r.summary, page: null, meta: ["No dates yet"] });
    }
  });
  link("role:sms-ceo", "role:sms-it", "before that");
  link("role:ed-shield", "proj:edshield-tools", "built for the company");

  // ── education ──
  (D.education.degrees || []).forEach((d) => {
    add({ id: "edu:" + d.id, type: "edu", label: `${d.short} — ${d.institution}`, level: "record",
      summary: `${d.degree}, ${d.institution}${d.unit ? " (" + d.unit + ")" : ""}. ${d.result}.`, page: "education/#" + d.id, meta: [d.year_label, d.result].filter(Boolean) });
    if (d.report) {
      add({ id: "report", type: "report", label: "Master's project report: Digital Shield", short: "Master's report: Digital Shield", level: "record",
        summary: `“${d.report.title}”. ${d.report.kind}, accepted ${d.report.accepted}. ${d.report.summary || ""}`.trim(), page: "education/#report",
        meta: [`Accepted ${d.report.accepted}`, d.report.supervisor ? "Supervisor: " + d.report.supervisor : ""].filter(Boolean) });
      link("edu:" + d.id, "report", "project report");
    }
    (d.projects || []).forEach((bp, i) => {
      add({ id: `bscp:${i + 1}`, type: "bscp", label: bp.title, level: "role", summary: bp.detail, page: "education/#" + d.id, meta: ["BSc project"] });
      link("edu:" + d.id, `bscp:${i + 1}`, "academic project");
      (bp.tools || []).forEach((t) => link(`bscp:${i + 1}`, techId(t), "built with"));
    });
  });
  (D.education.training || []).forEach((t, i) => add({ id: `train:${i + 1}`, type: "train", label: t.title, level: "role",
    summary: `${t.title} — ${t.provider}, ${t.length}.`, page: "education/#training", meta: [t.provider, t.length] }));
  (D.education.research_interests || []).forEach((r, i) => {
    add({ id: `research:${i + 1}`, type: "research", label: r.title, level: "goal", summary: r.detail + " An ongoing interest, not published research.", page: "education/#research" });
    link("report", `research:${i + 1}`, "continues as");
  });

  // ── programmes ──
  (D.leadership.programmes || []).filter((p) => p.published !== false).forEach((p) => {
    add({ id: "prog:" + p.id, type: "prog", label: p.title, level: "role",
      summary: [p.my_part ? "My part: " + p.my_part : "", p.team_note || ""].filter(Boolean).join(" "), page: "leadership/#prog-" + p.id,
      meta: [(p.partners || []).join(", "), p.place].filter(Boolean) });
    link("prog:" + p.id, "role:sms-it", "delivered in");
  });

  // ── goals ──
  (I.goals || []).forEach((g) => add({ id: "goal:" + g.id, type: "goal", label: g.label, level: "goal", summary: g.summary, page: g.page }));

  // ── capabilities and their connections ──
  (I.capabilities || []).forEach((c) => {
    const n = add({ id: "cap:" + c.id, type: "cap", label: c.label, level: c.level, summary: c.summary, page: (c.pages || [])[0]?.url, pages: c.pages || [] });
    (c.pages || []).forEach((pg) => n.evidence.push({ label: pg.label, url: pg.url }));
    link("me", n.id, "works in");
    (c.tech || []).forEach((t) => link(n.id, "tech:" + t, "uses"));
    (c.projects || []).forEach((p) => link(n.id, "proj:" + p, "shown in"));
    (c.roles || []).forEach((r) => link(n.id, "role:" + r, "practised as"));
    (c.education || []).forEach((e) => link(n.id, /^(train|bscp):|^report$/.test(e) ? e : "edu:" + e, e === "report" ? "researched in" : "learned through"));
    (c.research || []).forEach((r) => link(n.id, "research:" + r, "researching"));
    (c.programmes || []).forEach((p) => link(n.id, "prog:" + p, "delivered in"));
    (c.goals || []).forEach((g) => link(n.id, "goal:" + g, "heading toward"));
  });

  // a tool used in a live project is backed by that project — upgrade it and list the projects as its evidence
  nodes.forEach((n) => {
    if (n.type !== "tech") return;
    const projs = [...adj.get(n.id).keys()].map((id) => nodes.get(id)).filter((m) => m.type === "proj" && m.level === "live");
    if (projs.length) {
      n.level = "live";
      n.summary = `Used in ${projs.length} live client ${projs.length === 1 ? "project" : "projects"}.` + (groupOf.has(n.id) ? ` Also listed under “${groupOf.get(n.id)}”.` : "");
      projs.forEach((p) => n.evidence.push({ label: p.label, url: p.page }));
    }
  });
  // drop tools nobody links to (keeps the map honest and small)
  nodes.forEach((n, id) => { if (n.type === "tech" && adj.get(id).size === 0) { nodes.delete(id); adj.delete(id); } });
  // every node gets its own page as evidence, when it has one
  nodes.forEach((n) => { if (n.page && !n.evidence.some((e) => e.url === n.page)) n.evidence.push({ label: pageLabel(n.page), url: n.page }); });
  return { nodes, adj, intel: I };
}

function pageLabel(url) {
  const map = { "about/": "About", "experience/": "Experience", "leadership/": "Leadership", "education/": "Education", "cv/": "CV", "portfolio/": "Portfolio", "services/": "Services" };
  const [path, hash] = url.split("#");
  const base = map[path] || path.replace(/\/$/, "").split("/").pop().replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
  const anchor = { skills: "skills", independent: "business and freelance work", report: "the research report", research: "research interests", training: "training", journey: "the journey", build: "how it is built", cases: "case studies" }[hash];
  return anchor ? `${base} — ${anchor}` : `${base} page`;
}

/** Neighbours of a node, strongest evidence first, then capabilities and projects before tools. */
export function neighbours(G, id) {
  const order = { person: 0, cap: 1, proj: 2, role: 3, prog: 4, edu: 5, report: 5, bscp: 6, train: 6, research: 7, goal: 8, tech: 9 };
  return [...(G.adj.get(id) || new Map()).entries()].map(([nid, rel]) => ({ node: G.nodes.get(nid), rel }))
    .filter((x) => x.node)
    .sort((a, b) => (order[a.node.type] - order[b.node.type]) || (LEVELS[b.node.level].rank - LEVELS[a.node.level].rank) || a.node.label.localeCompare(b.node.label));
}

// ── search: transparent keyword matching over labels, synonyms, tools, industries and places ──
const STOP = new Set("a an and or the for of to in on at with my our we i me need want looking someone who can is are be by from that this it as your help find show about like build make".split(" "));
const words = (s) => String(s || "").toLowerCase().replace(/[^\p{L}\p{N}#.+\s-]/gu, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));

export function search(G, q) {
  const terms = words(q);
  if (!terms.length) return { terms, caps: [], projects: [], others: [] };
  const syn = G.intel.synonyms || {};
  // whole words only (plurals allowed): "lead" finds "leads", not "leadership"
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\#]/g, "\\$&");
  const hit = (text, t) => new RegExp(`(^|[^\\p{L}\\p{N}])${esc(t)}(s|es)?([^\\p{L}\\p{N}]|$)`, "u").test(String(text || "").toLowerCase());
  const phrase = String(q).toLowerCase();
  const score = new Map(), why = new Map();
  const bump = (id, n, w) => { score.set(id, (score.get(id) || 0) + n); if (!why.has(id)) why.set(id, new Set()); why.get(id).add(w); };

  G.nodes.forEach((n) => {
    if (n.type === "person") return;
    terms.forEach((t) => {
      if (hit(n.label, t)) bump(n.id, n.type === "cap" ? 4 : 3, t);
      else if ((n.meta && n.meta.some((m) => hit(m, t))) || (n.kw && n.kw.some((m) => hit(m, t)))) bump(n.id, 2, t);
      else if (hit(n.summary, t)) bump(n.id, 1, t);
    });
    if (n.type === "cap") {
      const s = syn[n.id.slice(4)] || [];
      s.forEach((w) => { if (w.includes(" ") ? phrase.includes(w) : terms.includes(w)) bump(n.id, 4, w); });
    }
  });
  // a matching item also lifts the capabilities it belongs to; a matching tool lifts the work built with it
  [...score.keys()].forEach((id) => {
    const n = G.nodes.get(id);
    if (n.type === "cap") return;
    neighbours(G, id).forEach(({ node }) => {
      if (node.type === "cap") bump(node.id, Math.min(score.get(id), 3), [...why.get(id)][0]);
      else if (n.type === "tech" && (node.type === "proj" || node.type === "bscp")) bump(node.id, 2, [...why.get(id)][0]);
    });
  });
  const ranked = [...score.entries()].map(([id, s]) => ({ node: G.nodes.get(id), score: s + LEVELS[G.nodes.get(id).level].rank / 10, why: [...why.get(id)] }))
    .sort((a, b) => b.score - a.score);
  return {
    terms,
    // a single word found only in a description (score 1) is too weak to show
    caps: ranked.filter((r) => r.node.type === "cap" && r.score >= 2).slice(0, 5),
    projects: ranked.filter((r) => r.node.type === "proj" && r.score >= 1).slice(0, 6),
    others: ranked.filter((r) => !["cap", "proj", "tech"].includes(r.node.type) && r.score >= 2).slice(0, 6),
  };
}
