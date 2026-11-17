// Contact brief: choose a project type, see the relevant extra field, then send.
// With the email API configured (_data/forms.yml → endpoint) the form sends directly and the visitor gets a
// confirmation email. Without it — or if sending fails — it opens a pre-filled email, as it always has.
import { copyText, flash } from "./core.js";
import { formClient, showFieldErrors } from "./forms-api.js";

const EMAIL = "rajdwaipayan@gmail.com";
const SOURCE = { "Partnership / organisation": "partnership", "Academic / research": "collaboration" };

export function initContact() {
  const form = document.getElementById("brief-form");
  if (!form) return;
  const errorBox = document.getElementById("form-error");
  const done = document.getElementById("form-done");
  const kindSet = form.querySelector(".brief-kind");
  const extras = [...form.querySelectorAll(".field[data-for]")];
  const client = formClient(form);
  const submitBtn = form.querySelector('button[type="submit"]');
  let lastBrief = "", lastSubject = "", sending = false;

  const showExtras = () => {
    const kind = form.elements.kind.value;
    extras.forEach((f) => f.classList.toggle("is-shown", f.dataset.for === kind));
    kindSet.removeAttribute("aria-invalid");
  };
  form.querySelectorAll('input[name="kind"]').forEach((r) => r.addEventListener("change", showExtras));
  showExtras();

  const val = (name) => (form.elements[name]?.value || "").trim();
  const extra = () => {
    const field = extras.find((f) => f.dataset.for === val("kind"))?.querySelector("input, select");
    if (!field || !field.value.trim()) return null;
    return { name: field.name, label: form.querySelector(`label[for="${field.id}"]`)?.firstChild.textContent.trim() || field.name, value: field.value.trim() };
  };
  const compose = () => {
    const x = extra();
    const lines = [
      "Hi Dwaipyan,", "", val("message"), "",
      `— Topic: ${val("kind")}`,
      x ? `— ${x.label}: ${x.value}` : "",
      val("timeline") ? `— Timeline: ${val("timeline")}` : "",
      `— Name: ${val("name")}`,
    ].filter((l, i) => l !== "" || i === 1 || i === 3);
    lastBrief = lines.join("\n");
    lastSubject = `Enquiry: ${val("kind")} — ${val("name")}`;
  };
  const openMail = () => {
    compose();
    done.hidden = false;
    done.querySelector("[data-done-mail]")?.removeAttribute("hidden");
    done.querySelector("[data-done-sent]")?.setAttribute("hidden", "");
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(lastSubject)}&body=${encodeURIComponent(lastBrief)}`;
  };
  const fail = (msg, focus) => {
    errorBox.hidden = false;
    errorBox.textContent = msg;
    done.hidden = true;
    focus?.focus();
  };

  const validate = () => {
    const problems = [];
    let first = null;
    if (!form.elements.kind.value) { problems.push("what it is about"); kindSet.setAttribute("aria-invalid", "true"); first = form.querySelector('input[name="kind"]'); }
    const required = client ? [["name", "your name"], ["email", "your email"], ["message", "a short message"]] : [["name", "your name"], ["message", "a short message"]];
    for (const [name, label] of required) {
      const el = form.elements[name];
      let bad = !el.value.trim();
      if (!bad && name === "email") bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
      el.setAttribute("aria-invalid", String(bad));
      if (bad) { problems.push(name === "email" && el.value.trim() ? "a valid email address" : label); first = first || el; }
    }
    if (problems.length) { fail("Please add " + problems.join(", ").replace(/, ([^,]*)$/, " and $1") + ".", first); return false; }
    errorBox.hidden = true;
    return true;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (sending || !validate()) return;
    if (!client) { openMail(); return; }

    const x = extra();
    const kind = val("kind");
    sending = true;
    const label = submitBtn.innerHTML;
    submitBtn.disabled = true; submitBtn.setAttribute("aria-busy", "true"); submitBtn.textContent = "Sending…";
    try {
      const res = await client.send(SOURCE[kind] || "contact", {
        name: val("name"), email: val("email"), phone: val("phone"),
        company: x && (x.name === "organisation" || x.name === "institution") ? x.value : "",
        services: [kind], timeline: val("timeline"), message: val("message"),
        details: { topic: kind, ...(x ? { [x.name]: x.value } : {}) },
      });
      const sent = done.querySelector("[data-done-sent]");
      sent.innerHTML = "";
      const b = document.createElement("b"); b.textContent = "Thank you — your message has been sent.";
      sent.append(b, ` Reference ${res.ref}. ` + (res.confirmation ? `A confirmation is on its way to ${val("email")}.` : "Dwaipyan will reply by email."));
      sent.hidden = false;
      done.querySelector("[data-done-mail]").hidden = true;
      done.querySelector("[data-copy-brief]").hidden = true;
      done.hidden = false;
      errorBox.hidden = true;
      if (!res.duplicate) {
        form.querySelectorAll("input:not([type=radio]), textarea, select").forEach((el) => { if (el.name !== "website") el.value = ""; });
        form.querySelectorAll('input[name="kind"]').forEach((r) => { r.checked = false; });
        showExtras();
      }
      done.focus?.();
    } catch (err) {
      const first = showFieldErrors(form, err.fields);
      errorBox.hidden = false;
      errorBox.textContent = (err.code === "invalid" && err.fields ? Object.values(err.fields).join(" ") : err.message) + " ";
      if (err.code !== "invalid") {
        const a = document.createElement("a");
        a.href = "#"; a.textContent = "Write the email instead";
        a.addEventListener("click", (ev) => { ev.preventDefault(); openMail(); });
        errorBox.append(a, ".");
      }
      done.hidden = true;
      first?.focus();
    } finally {
      sending = false;
      submitBtn.disabled = false; submitBtn.removeAttribute("aria-busy"); submitBtn.innerHTML = label;
    }
  });

  form.querySelector("[data-mail-instead]")?.addEventListener("click", (e) => {
    if (!form.elements.kind.value || !val("name") || !val("message")) return;   // nothing typed yet: plain mailto link
    e.preventDefault(); openMail();
  });

  form.querySelectorAll("input, textarea").forEach((el) =>
    el.addEventListener("input", () => { if (el.value.trim()) { el.removeAttribute("aria-invalid"); el.removeAttribute("title"); } })
  );

  done.querySelector("[data-copy-brief]")?.addEventListener("click", async () => {
    const ok = await copyText(`To: ${EMAIL}\n\n${lastBrief}`);
    flash(done.querySelector(".copy-status"), ok ? "Brief copied" : "Couldn't copy — please select the text in your form");
  });
}
