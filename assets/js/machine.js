// "Under the hood": a working simulation of a lead automation.
// It builds the real-looking payload, routing, CRM record and follow-up from what
// the visitor types. Nothing leaves the browser.
import { reduceMotion } from "./core.js";

const SERVICES = {
  website:    { label: "a new website",      tag: "website",    pipeline: "Web build",  channel: "#projects" },
  store:      { label: "an online store",    tag: "ecommerce",  pipeline: "E-commerce", channel: "#projects" },
  app:        { label: "a web app",          tag: "web-app",    pipeline: "Web app",    channel: "#projects" },
  automation: { label: "CRM automation",     tag: "automation", pipeline: "Automation", channel: "#automation" },
};

export function initMachine() {
  const root = document.querySelector("[data-machine]");
  if (!root) return;
  const form = root.querySelector("[data-machine-form]");
  const error = root.querySelector("[data-machine-error]");
  const button = form.querySelector('button[type="submit"]');
  const out = (key) => root.querySelector(`[data-out="${key}"]`);
  const step = (key) => root.querySelector(`[data-ms="${key}"]`);
  const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion.matches ? 0 : ms));

  const reset = () => {
    root.querySelectorAll(".ms").forEach((s) => s.classList.remove("is-done", "is-busy"));
    root.querySelectorAll("[data-check]").forEach((c) => c.classList.remove("ok"));
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nameInput = form.elements.name;
    const raw = nameInput.value.trim().replace(/\s+/g, " ");
    if (!raw || !/^[\p{L}][\p{L}\s'.-]{0,39}$/u.test(raw)) {
      nameInput.setAttribute("aria-invalid", "true");
      error.hidden = false;
      error.textContent = raw ? "Use letters only, up to 40 characters." : "Type a first name to run the demo.";
      nameInput.focus();
      return;
    }
    nameInput.removeAttribute("aria-invalid");
    error.hidden = true;

    const name = raw.charAt(0).toUpperCase() + raw.slice(1);
    const svc = SERVICES[form.elements.service.value] || SERVICES.website;
    button.disabled = true;
    reset();
    // On one-column layouts the steps sit below the form: bring them into view.
    if (window.matchMedia("(max-width: 1080px)").matches) {
      step("webhook").scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
    }

    // 1 · webhook
    step("webhook").classList.add("is-busy");
    const payload = {
      first_name: name,
      service: svc.tag,
      source: "portfolio-demo",
      submitted_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    };
    out("payload").textContent = "POST /webhook/lead\n" + JSON.stringify(payload, null, 2);
    await wait(650);
    step("webhook").classList.replace("is-busy", "is-done");

    // 2 · n8n
    step("n8n").classList.add("is-busy");
    for (const check of ["validate", "enrich", "route"]) {
      await wait(380);
      root.querySelector(`[data-check="${check}"]`).classList.add("ok");
    }
    out("route").textContent = `→ ${svc.pipeline} pipeline · tags: inbound, ${svc.tag}`;
    await wait(250);
    step("n8n").classList.replace("is-busy", "is-done");

    // 3 · CRM
    step("crm").classList.add("is-busy");
    out("crm-name").textContent = name;
    const tags = out("crm-tags");
    tags.textContent = "";
    for (const t of ["inbound", svc.tag]) {
      const s = document.createElement("span");
      s.className = "tag";
      s.textContent = t;
      tags.appendChild(s);
    }
    out("crm-stage").textContent = `Pipeline: ${svc.pipeline} → New lead`;
    await wait(600);
    step("crm").classList.replace("is-busy", "is-done");

    // 4 · follow-up
    step("follow").classList.add("is-busy");
    out("mail-subject").textContent = `Thanks, ${name} — next steps for ${svc.label}`;
    out("mail-body").textContent =
      `Hi ${name}, thanks for getting in touch about ${svc.label}. I'll read your note today and reply with a few questions and a time to talk.`;
    out("alert").textContent = `Team alert → ${svc.channel}: new ${svc.tag} lead from ${name}`;
    await wait(600);
    step("follow").classList.replace("is-busy", "is-done");

    button.disabled = false;
    button.firstChild.textContent = "Run it again ";
  });

  form.elements.name.addEventListener("input", () => form.elements.name.removeAttribute("aria-invalid"));
}
