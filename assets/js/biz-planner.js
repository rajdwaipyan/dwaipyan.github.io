// The Business Builder's reasoning — runs entirely in the browser, from _data/solutions.yml.
//
//   analyse(text)          → what the description suggests: industry, goals, stage, market, size (with confidence)
//   blueprint(answers)     → a preliminary blueprint: sections of plain statements, plus a Markdown copy
//
// It is a rule-based planner, not a language model: every recommendation comes from the categories, industries
// and lifecycle written in the data file, combined by the rules below. It never states revenue, success rates,
// market sizes or prices that are not in the data file (category `budget` fields, empty by default).

const norm = (s) => " " + String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9&+\s-]/g, " ").replace(/\s+/g, " ").trim() + " ";
const has = (t, w) => t.includes(" " + w + " ") || (w.includes(" ") && t.includes(w));

export function analyse(text, data) {
  const t = norm(text);
  // industry: the one with the most (and longest) matching words
  let industry = null, best = 0;
  for (const i of data.industries) {
    const score = i.words.reduce((s, w) => s + (has(t, w) ? 1 + w.split(" ").length * 0.5 : 0), 0);
    if (score > best) { best = score; industry = i.id; }
  }
  const goals = data.goals.filter((g) => g.words.some((w) => has(t, w))).map((g) => g.id);
  let stage = null;
  if (/ (scale|scaling|expand|expanding|internationally|abroad|new markets|multiple branches|franchise) /.test(t)) stage = "scaling";
  else if (/ (i own|we own|my business|our business|my company|our company|my restaurant|my shop|my store|my clinic|existing|currently|we have|already|our customers|my customers) /.test(t)) stage = "operating";
  else if (/ (launch|launching|opening|about to|ready to open) /.test(t)) stage = "launching";
  else if (/ (start|starting|idea|establish|new business|want to open|planning to|thinking of|begin) /.test(t)) stage = "idea";
  let market = null;
  if (/ (international|internationally|abroad|export|global|overseas|countries|worldwide) /.test(t)) market = "international";
  else if (/ (nationwide|national|across the country|all over) /.test(t)) market = "national";
  else if (/ (local|city|town|area|neighbourhood|neighborhood|nearby|in dhaka|in my city) /.test(t)) market = "local";
  let size = null;
  if (/ (enterprise|multinational|corporate|group of companies|conglomerate) /.test(t)) size = 4;
  else if (/ (factory|industrial|manufacturer) /.test(t)) size = 4;
  else if (/ (ngo|nonprofit|non-profit|charity|foundation|institution|university) /.test(t)) size = 5;
  else if (/ (startup|start-up|idea|new business) /.test(t)) size = 0;
  if (industry === "startup" && !goals.includes("platform")) goals.push("platform");
  if (stage === "idea" && !goals.includes("start")) goals.unshift("start");
  if (industry === "nonprofit" && size === null) size = 5;
  if (industry === "enterprise" && size === null) size = 4;
  return { industry, goals, stage, market, size, words: t.trim().split(" ").length };
}

/* ---------- industry-specific content used by the blueprint (generic practice, no figures) */
const WEB = {
  retail: ["An online store with product variations, search and filters", "Secure checkout with local and international payment options", "Shipping zones, delivery charges and order emails", "Stock synchronised between the store and any physical shop"],
  healthcare: ["Service and practitioner pages written for patients", "Online appointment booking with confirmations and reminders", "Forms that collect only the data needed, over HTTPS", "Accessible design, readable on any phone"],
  education: ["Course or programme pages with clear outcomes", "Enrolment and online payments", "A learning platform (LMS) or member area", "Student emails for onboarding and reminders"],
  realestate: ["Listings with search, filters and enquiry buttons", "Separate forms for buyers, sellers and renters, feeding the CRM", "Area or project landing pages", "Fast mobile pages for visitors coming from ads"],
  hospitality: ["Menu, rooms or experiences presented with strong photography", "Reservations or online booking with deposits where needed", "Google Business Profile and map listing kept accurate", "Clear opening hours, location and contact on every page"],
  manufacturing: ["A searchable product catalogue with specifications and downloads", "Request-for-quote forms instead of a shopping cart", "Distributor, dealer and contact pages by region", "A link to inventory or ERP data where it exists"],
  professional: ["A site that shows expertise: services, team, case studies, insights", "Consultation booking and a structured intake form", "Thought-leadership articles that support search", "Client documents and onboarding handled securely"],
  nonprofit: ["Programme, impact and partner pages", "Donation or partnership enquiry flow", "Reports and publications library", "Simple internal tools for attendance, expenses or data collection"],
  startup: ["A landing page with a clear promise and a waitlist or sign-up", "An MVP scoped to the one job users need done", "Onboarding emails and in-product messages", "Analytics events from the first user"],
  enterprise: ["Integration between existing systems before anything new is added", "Single sign-on and role-based access", "Documented automations with owners", "Staging and change-control for every system"],
  other: ["A fast, mobile-first website with clear services and contact routes", "Forms that send enquiries straight into the CRM", "Business email on your own domain", "Hosting, backups and SSL handled"],
};
const AUTO = {
  retail: ["Order confirmation, shipping and review-request emails", "Abandoned-cart reminders", "Low-stock alerts and reorder lists", "Customer questions answered from your own policies by an AI assistant, with hand-over to a person"],
  healthcare: ["Appointment reminders by SMS or WhatsApp", "Intake forms routed to the right person", "Follow-up messages after a visit", "An FAQ assistant answering only from approved information"],
  education: ["Enrolment confirmations and payment receipts", "Course reminders and progress nudges", "Certificates generated on completion", "An assistant that answers course questions from your material"],
  realestate: ["Instant SMS and email reply to every new lead", "Lead routing to the right agent", "Viewing reminders and post-viewing follow-up", "Pipeline stages that move when a lead books or replies"],
  hospitality: ["Booking confirmations and reminders", "Review requests after a visit", "Birthday or return-visit offers", "WhatsApp replies to common questions"],
  manufacturing: ["Quote requests routed to sales with the product details", "Order status updates for distributors", "Stock and production reports", "Document generation for quotations and invoices"],
  professional: ["Intake form to CRM to booked consultation", "Engagement letters and onboarding checklists", "Meeting notes to actions", "Monthly client reports"],
  nonprofit: ["Donor acknowledgements and receipts", "Volunteer or beneficiary registration", "Programme data collected into one sheet", "Report drafting from collected data, reviewed by staff"],
  startup: ["Sign-up to onboarding email sequence", "Lead and user data synced to the CRM", "Support questions answered from documentation", "Weekly metrics report"],
  enterprise: ["Cross-department approvals", "Data moved between systems without re-typing", "AI assistants for internal knowledge, with access control", "Exception alerts to the right owner"],
  other: ["Every enquiry captured into one CRM", "Automatic first reply and follow-up reminders", "Invoices and receipts generated from orders", "Weekly summary of leads and sales"],
};
const CHANNELS = {
  local: ["Google Business Profile with reviews", "Local SEO pages for your area", "Social media with location targeting", "WhatsApp as a contact channel"],
  national: ["Search ads on high-intent keywords", "SEO content around what customers search for", "Social campaigns to defined audiences", "Email marketing to past enquiries and customers"],
  international: ["Multi-language or multi-region pages (hreflang)", "Search and social campaigns per target market", "Partnerships and marketplaces in each market", "Email sequences adapted to each audience"],
};
const NOUN = { retail: "retail or eCommerce", healthcare: "healthcare", education: "education", realestate: "real estate", hospitality: "hospitality", manufacturing: "manufacturing", professional: "professional services", nonprofit: "nonprofit", startup: "technology", enterprise: "enterprise" };
// lower-case a label for use mid-sentence, but keep acronyms ("CRM & funnels", "SEO", "IT & security")
const lc = (s) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
const list = (a) => (a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);
const B2B = new Set(["manufacturing", "professional", "enterprise", "startup"]);

const STAGE_LABEL = { idea: "an idea", launching: "about to launch", operating: "already operating", scaling: "growing or scaling" };
const BUDGET_NOTE = {
  lean: "Lean first phase: start with the essentials marked “Phase 1” and add the rest once they pay their way.",
  moderate: "Moderate budget: Phase 1 and the most important parts of Phase 2 can usually be planned together.",
  substantial: "Substantial budget: the phases can run in parallel where they don't depend on each other.",
  unsure: "Budget not decided: a short call is the quickest way to size each phase to what you're comfortable spending.",
};
const TIMELINE_NOTE = { asap: "You'd like to start as soon as possible", quarter: "You'd like to start within three months", later: "You're planning to start later this year", exploring: "You're exploring options" };

/** answers: { text, industry, stage, size (index), market, budget, timeline, goals } */
export function blueprint(a, data) {
  const cat = Object.fromEntries(data.categories.map((c) => [c.id, c]));
  const ind = data.industries.find((i) => i.id === a.industry) || null;
  const indId = ind ? ind.id : "other";
  const goals = a.goals.length ? a.goals : ["website", "customers"];
  const goalObjs = goals.map((g) => data.goals.find((x) => x.id === g)).filter(Boolean);

  // score every category: what the visitor asked for counts most, then the industry's usual mix, then the stage
  const score = Object.fromEntries(data.categories.map((c) => [c.id, 0]));
  goalObjs.forEach((g) => g.cats.forEach((c, i) => { score[c] += 6 - i; }));
  (ind ? ind.combo : ["web", "marketing", "crm"]).forEach((c, i) => { score[c] += 3 - i * 0.3; });
  const stageBoost = { idea: ["strategy", "branding", "web"], launching: ["web", "seo", "crm", "branding"], operating: ["crm", "marketing", "ai", "analytics"], scaling: ["expansion", "operations", "analytics", "security"] }[a.stage] || [];
  stageBoost.forEach((c) => { score[c] += 2.5; });
  if (a.market === "international") score.expansion += 3;
  if (a.size >= 3) { score.security += 2; score.operations += 2; score.support += 1; }
  const ranked = Object.entries(score).filter(([, s]) => s > 2).sort((x, y) => y[1] - x[1]).map(([id]) => id);
  const maxCore = a.budget === "lean" ? 3 : a.budget === "substantial" ? 6 : 4;
  const core = ranked.slice(0, maxCore), later = ranked.slice(maxCore, maxCore + 4);
  // the practice that defines the visitor's current stage is always in Phase 1
  const anchor = stageBoost[0];
  if (anchor && !core.includes(anchor)) {
    const li = later.indexOf(anchor); if (li >= 0) later.splice(li, 1);
    const bumped = core.length >= maxCore ? core.pop() : null;
    core.unshift(anchor);
    if (bumped) later.unshift(bumped);
  }
  if (!core.includes("security") && !later.includes("security")) later.push("security");

  // dependencies: some things must come before others
  const order = ["strategy", "branding", "web", "security", "crm", "seo", "marketing", "ai", "operations", "analytics", "expansion", "support"];
  const sorted = (ids) => [...ids].sort((x, y) => order.indexOf(x) - order.indexOf(y));
  const all = new Set([...core, ...later]);
  const deps = [];
  if (all.has("branding") && all.has("web") && (core.includes("branding") || !core.includes("web"))) deps.push("Identity before the website, so the site is designed once, not twice.");
  if (all.has("web") && (all.has("seo") || all.has("marketing"))) deps.push("Website and tracking live before paid marketing, so spend can be measured.");
  if (all.has("crm") && all.has("marketing") && (core.includes("crm") || !core.includes("marketing"))) deps.push("CRM and follow-up ready before campaigns start, so no lead is lost.");
  if (all.has("ai")) deps.push("Automation after the manual process is clear — automate a process that works, not one that is still changing.");
  if (all.has("expansion")) deps.push("New markets after the home market's site, payments and support run smoothly.");
  if (all.has("analytics")) deps.push("Agree the few numbers that matter before building dashboards.");
  if (a.stage === "idea") deps.unshift("Validate demand with a small test before committing the larger budget.");

  // roadmap: work is grouped by what it builds on, so a phase never needs something from a later one —
  // foundations, then customers, then systems and growth; Phase-1 work first, later work after it.
  const BUCKETS = [
    { cats: ["strategy", "branding", "web", "security"], title: "Foundations", stages: "Idea → Establish",
      line: a.stage === "idea" ? "Plan, identity and website — with a small test of demand before the larger spend." : "Plan, identity, website and the basic safeguards everything else sits on." },
    { cats: ["seo", "marketing", "crm"], title: "Customers", stages: "Launch → Market",
      line: "Get found, bring the right people in and follow up every enquiry." },
    { cats: ["ai", "operations", "analytics", "support", "expansion"], title: "Systems & growth", stages: "Automate → Scale",
      line: "Automate the routine, run operations in one place, measure what works and expand." },
  ];
  const phases = BUCKETS.map((b) => {
    const now = sorted(core.filter((c) => b.cats.includes(c)));
    const then = sorted(later.filter((c) => b.cats.includes(c)));
    return { title: b.title, stages: b.stages, line: b.line, now: now.length > 0, ids: [...now, ...then] };
  }).filter((p) => p.ids.length)
    .map((p) => (!p.now && p.title === "Foundations" ? { ...p, line: "Refresh the identity, website and safeguards once the first phase is paying for itself." } : p))
    .sort((x, y) => (x.now === y.now ? 0 : x.now ? -1 : 1));   // stable: phases with Phase-1 work first

  const reqs = [...(ind ? ind.needs : WEB.other.slice(0, 3))];
  if (a.market === "international") reqs.push("Content, payments and support that work in each target market");
  if (a.size >= 3) reqs.push("Roles, permissions and documentation for several teams");
  if (goals.includes("crm")) reqs.push("One pipeline where every lead and its next step is visible");
  if (goals.includes("operations")) reqs.push("One reliable system for operations data instead of separate spreadsheets");

  const tech = [];
  const pickTech = (c) => (cat[c]?.tech || []).slice(0, 3);
  sorted([...all]).forEach((c) => { const t = pickTech(c); if (t.length) tech.push(`${cat[c].short}: ${t.join(", ")}`); });
  if (indId === "retail") tech.unshift("Store platform: Shopify or WooCommerce, chosen by catalogue size, budget and who will run it");
  if (indId === "startup") tech.unshift("Product: a no-code or WordPress MVP first, custom code (e.g. React / Next.js) once the core is proven");

  const brand = a.stage === "idea" || goals.includes("brand") || goals.includes("start")
    ? ["A name and positioning that fit the customer you described", "Logo, colour and type system", "Brand guidelines and templates so everything stays consistent", "Social profiles and email signatures set up in the new identity"]
    : ["A review of how consistently the current identity is used", "Refresh only what hurts trust — usually the website and social profiles", "Templates so new material matches"];

  const infra = [...WEB[indId], "Business email on your own domain, SSL, backups and basic security from day one"];
  const channels = [...CHANNELS[a.market || (a.size >= 3 ? "national" : "local")]];
  if (B2B.has(indId)) channels.unshift("LinkedIn and direct outreach to defined target accounts");
  const sales = B2B.has(indId)
    ? ["Capture: content and search bring in qualified enquiries", "Qualify: a short intake form or call routes each lead", "Follow up: CRM tasks and email sequences until a decision", "Close: proposals and contracts tracked in the pipeline"]
    : ["Capture: website, social and search send enquiries to one place", "Respond: an instant first reply by email, SMS or WhatsApp", "Convert: booking, ordering or a call made easy", "Return: reviews, offers and reminders bring customers back"];

  const budgetLines = sorted(core).map((c) => `${cat[c].title}: ${cat[c].budget ? "starting " + cat[c].budget : "quoted after a short call"}`);

  const understood = [ind ? ind.title : "Industry not specified", a.stage ? "stage: " + STAGE_LABEL[a.stage] : null, a.market ? "customers: " + { local: "local", national: "nationwide", international: "international" }[a.market] : null, a.size != null && data.sizes[a.size] ? data.sizes[a.size].toLowerCase() : null].filter(Boolean).join(" · ");

  const sections = [
    { id: "summary", h: "Summary", text: `A plan to ${{ idea: "establish", launching: "launch", operating: "strengthen", scaling: "scale" }[a.stage] || "strengthen"} ${ind ? "a " + NOUN[ind.id] + " business" : "the business"}. Goals: ${list(goalObjs.map((g) => lc(g.label))) || "a stronger online presence"}. Start with ${list(sorted(core).map((c) => lc(cat[c].short)))}${later.length ? `; then add ${list(sorted(later).map((c) => lc(cat[c].short)))}` : ""}.` },
    { id: "requirements", h: "Business requirements", items: reqs },
    { id: "services", h: "Recommended services", services: [...sorted(core).map((c) => ({ id: c, phase: "Phase 1", why: cat[c].value, mode: cat[c].delivery })), ...sorted(later).map((c) => ({ id: c, phase: "Later", why: cat[c].value, mode: cat[c].delivery }))].map((s) => ({ ...s, title: cat[s.id].title })) },
    { id: "tech", h: "Technology stack", items: tech.slice(0, 7) },
    { id: "brand", h: "Branding", items: brand },
    { id: "infra", h: "Website & digital infrastructure", items: infra },
    { id: "marketing", h: "Marketing strategy", items: channels },
    { id: "sales", h: "Sales & customer acquisition", items: sales },
    { id: "automation", h: "Automation opportunities", items: AUTO[indId] },
    { id: "roadmap", h: "Implementation roadmap", phases: phases.map((p, i) => ({ title: p.title, stages: p.stages, line: p.line, now: p.now, n: i + 1, cats: p.ids.map((c) => cat[c].title + (core.includes(c) ? "" : " (later)")) })), note: "Each phase builds on the one before. How long each takes depends on scope and is agreed with you in writing." },
    { id: "deps", h: "Priorities & dependencies", items: deps },
    { id: "budget", h: "Budget", items: [BUDGET_NOTE[a.budget || "unsure"], ...budgetLines], note: "Ranges are given only where a starting price is published; everything else is quoted in writing after a short call." },
  ];
  if (a.timeline) sections[0].text += ` ${TIMELINE_NOTE[a.timeline]}.`;
  return { understood, sections, core: sorted(core), later: sorted(later), md: toMarkdown(sections, a, understood) };
}

function toMarkdown(sections, a, understood) {
  const out = ["# Preliminary business blueprint", "", `_${understood}_`, "", `> ${a.text.trim()}`, ""];
  for (const s of sections) {
    out.push(`## ${s.h}`, "");
    if (s.text) out.push(s.text, "");
    if (s.items) out.push(...s.items.map((x) => "- " + x), "");
    if (s.services) out.push(...s.services.map((x) => `- **${x.title}** (${x.phase}) — ${x.why}`), "");
    if (s.phases) s.phases.forEach((p) => out.push(`${p.n}. **${p.title}${p.now ? "" : " (later)"}** (${p.stages}) — ${p.line} ${p.cats.length ? "Services: " + p.cats.join(", ") + "." : ""}`));
    if (s.phases) out.push("");
    if (s.note) out.push(`_${s.note}_`, "");
  }
  out.push("---", "Preliminary recommendation, not a quotation or a promise of results. Scope, timeline and price are agreed in writing.", "Dwaipyan Mandal · rajdwaipayan@gmail.com · https://rajdwaipyan.github.io/dwaipyan.github.io/solutions/");
  return out.join("\n");
}
