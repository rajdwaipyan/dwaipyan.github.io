// One client for every form on the site: talks to the email API set in _data/forms.yml (endpoint).
// With no endpoint the forms keep working exactly as before (email app / WhatsApp), so nothing here runs.
//
//   const ctl = formClient(formElement);           // null when the API isn't configured
//   const res = await ctl.send("contact", fields);  // { ok, ref, confirmation } or throws FormError
//
// Security: a signed form token is fetched when the visitor starts filling the form (the server refuses
// instant submissions), Cloudflare Turnstile runs invisibly unless Cloudflare needs a check, and each form
// fill has an idempotency key so a double click or a retry can never send twice.

const meta = (n) => (document.querySelector(`meta[name="${n}"]`)?.content || "").trim();
export const formsEndpoint = () => { const u = meta("forms-endpoint"); return u ? u.replace(/\/?$/, "/") : ""; };
const SITEKEY = () => meta("turnstile-sitekey");
const TS_SRC = () => meta("turnstile-script") || "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__tsReady";

export class FormError extends Error {
  constructor(code, message, fields = {}) { super(message); this.code = code; this.fields = fields; }
}

const MESSAGES = {
  invalid: "Please check the highlighted fields.",
  rate_limited: "Too many messages from this connection — please try again later, or email or WhatsApp instead.",
  turnstile: "The spam check didn't pass. Please try again.",
  turnstile_unavailable: "The spam check couldn't be reached. Please try again in a minute.",
  token: "This page has been open a long time. Please try again.",
  expired: "This page has been open a long time. Please try again.",
  too_fast: "Please try again.",
  unavailable: "Sending isn't working right now.",
  network: "Couldn't reach the server — check your connection.",
};

let tsLoading = null;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (tsLoading) return tsLoading;
  tsLoading = new Promise((resolve, reject) => {
    window.__tsReady = () => resolve(window.turnstile);
    window.__tsOnload = "__tsReady";
    const s = document.createElement("script");
    s.src = TS_SRC(); s.async = true; s.defer = true;
    s.onerror = () => { tsLoading = null; reject(new FormError("turnstile_unavailable", MESSAGES.turnstile_unavailable)); };
    document.head.appendChild(s);
    setTimeout(() => { if (!window.turnstile) { tsLoading = null; reject(new FormError("turnstile_unavailable", MESSAGES.turnstile_unavailable)); } }, 12000);
  });
  return tsLoading;
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join(""));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, init = {}, timeout = 25000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(formsEndpoint() + path, { ...init, signal: ctl.signal, credentials: "omit", cache: "no-store" });
    const d = await res.json().catch(() => ({}));
    return { status: res.status, d };
  } catch { throw new FormError("network", MESSAGES.network); }
  finally { clearTimeout(t); }
}

/** Prepare a form for sending. Returns null when no endpoint is configured. */
export function formClient(form) {
  if (!formsEndpoint() || !form) return null;
  const state = { token: null, tokenAt: 0, tokenP: null, idem: newId(), widget: null, tsP: null, tsToken: "", tsWait: [] };
  const slot = form.querySelector("[data-turnstile]");

  const getToken = () => {
    if (state.token && Date.now() - state.tokenAt < 100 * 60 * 1000) return Promise.resolve(state.token);
    state.tokenP = state.tokenP || api("token", { method: "GET" }, 12000).then(({ status, d }) => {
      state.tokenP = null;
      if (status !== 200 || !d.token) throw new FormError("unavailable", MESSAGES.unavailable);
      state.token = d.token; state.tokenAt = Date.now(); return d.token;
    }, (e) => { state.tokenP = null; throw e; });
    return state.tokenP;
  };

  const startTurnstile = () => {
    if (!SITEKEY() || !slot) return Promise.resolve(null);
    state.tsP = state.tsP || loadTurnstile().then((ts) => {
      state.widget = ts.render(slot, {
        sitekey: SITEKEY(), appearance: "interaction-only", size: "flexible", action: form.dataset.source || "form",
        callback: (t) => { state.tsToken = t; state.tsWait.splice(0).forEach((f) => f(t)); },
        "expired-callback": () => { state.tsToken = ""; },
        "error-callback": () => { state.tsToken = ""; },
      });
      return ts;
    }).catch((e) => { state.tsP = null; throw e; });
    return state.tsP;
  };

  const turnstileToken = async () => {
    if (!SITEKEY() || !slot) return "";
    const ts = await startTurnstile();
    const now = state.tsToken || (ts && ts.getResponse(state.widget));
    if (now) return now;
    return Promise.race([
      new Promise((r) => state.tsWait.push(r)),
      sleep(30000).then(() => { throw new FormError("turnstile", MESSAGES.turnstile); }),
    ]);
  };

  // warm up on first interaction so the visitor never waits at the end
  const warm = () => { getToken().catch(() => {}); startTurnstile().catch(() => {}); };
  form.addEventListener("focusin", warm, { once: true });
  form.addEventListener("pointerdown", warm, { once: true });

  return {
    async send(source, fields) {
      const token = await getToken();
      const elapsed = Date.now() - state.tokenAt;
      if (elapsed < 3500) await sleep(3500 - elapsed);           // the server refuses submissions under 3 seconds
      const turnstile = await turnstileToken();
      const honeypot = form.querySelector('[name="website"]')?.value || "";
      const body = JSON.stringify({ source, idem: state.idem, token, turnstile, website: honeypot, fields: { page: location.pathname.slice(0, 200), ...fields } });
      const { status, d } = await api("submit", { method: "POST", headers: { "Content-Type": "application/json" }, body });
      // a Turnstile token works once: get a fresh one for any next attempt
      state.tsToken = "";
      try { if (state.widget != null) window.turnstile?.reset(state.widget); } catch { /* widget gone */ }
      if (status === 200 && d.ok) { state.idem = newId(); return d; }
      if (d.error === "token" || d.error === "expired") { state.token = null; }
      throw new FormError(d.error || "unavailable", MESSAGES[d.error] || MESSAGES.unavailable, d.fields || {});
    },
  };
}

/** Mark server-side field errors on a form: fieldMap maps API field names to input names. Returns the first input. */
export function showFieldErrors(form, fields, fieldMap = {}) {
  let first = null;
  for (const [k, msg] of Object.entries(fields || {})) {
    const el = form.elements[fieldMap[k] || k];
    const input = el && (el.length && !el.tagName ? el[0] : el);
    if (!input || !input.setAttribute) continue;
    input.setAttribute("aria-invalid", "true");
    input.title = msg;
    first = first || input;
  }
  return first;
}

export const describeFields = (fields) => Object.values(fields || {}).join(" ");
