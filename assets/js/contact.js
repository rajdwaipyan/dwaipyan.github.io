// Contact brief: choose a project type, see the relevant extra field, then open a
// pre-filled email. There is no backend, so the site never claims it "sent" anything.
import { copyText, flash } from "./core.js";

const EMAIL = "rajdwaipayan@gmail.com";

export function initContact() {
  const form = document.getElementById("brief-form");
  if (!form) return;
  const errorBox = document.getElementById("form-error");
  const done = document.getElementById("form-done");
  const kindSet = form.querySelector(".brief-kind");
  const extras = [...form.querySelectorAll(".field[data-for]")];
  let lastBrief = "";

  const showExtras = () => {
    const kind = form.elements.kind.value;
    extras.forEach((f) => f.classList.toggle("is-shown", f.dataset.for === kind));
    kindSet.removeAttribute("aria-invalid");
  };
  form.querySelectorAll('input[name="kind"]').forEach((r) => r.addEventListener("change", showExtras));
  showExtras();

  const val = (name) => (form.elements[name]?.value || "").trim();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const problems = [];
    if (!form.elements.kind.value) { problems.push("what you need"); kindSet.setAttribute("aria-invalid", "true"); }
    for (const name of ["name", "message"]) {
      const el = form.elements[name];
      const empty = !el.value.trim();
      el.setAttribute("aria-invalid", String(empty));
      if (empty) problems.push(name === "name" ? "your name" : "a few lines about the project");
    }
    if (problems.length) {
      errorBox.hidden = false;
      errorBox.textContent = "Please add " + problems.join(", ").replace(/, ([^,]*)$/, " and $1") + ".";
      done.hidden = true;
      (form.querySelector('[aria-invalid="true"] input, input[aria-invalid="true"], textarea[aria-invalid="true"]') || form.querySelector('input[name="kind"]')).focus();
      return;
    }
    errorBox.hidden = true;

    const kind = val("kind");
    const extraField = extras.find((f) => f.dataset.for === kind)?.querySelector("input, select");
    const extraLabel = extraField ? form.querySelector(`label[for="${extraField.id}"]`)?.firstChild.textContent.trim() : "";
    const lines = [
      "Hi Dwaipyan,",
      "",
      val("message"),
      "",
      `— Project: ${kind}`,
      extraField && extraField.value.trim() ? `— ${extraLabel}: ${extraField.value.trim()}` : "",
      val("timeline") ? `— Timeline: ${val("timeline")}` : "",
      `— Name: ${val("name")}`,
    ].filter((l, i) => l !== "" || i === 1 || i === 3);
    lastBrief = lines.join("\n");
    const subject = `Project enquiry: ${kind} — ${val("name")}`;

    done.hidden = false;
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lastBrief)}`;
  });

  form.querySelectorAll("input, textarea").forEach((el) =>
    el.addEventListener("input", () => { if (el.value.trim()) el.removeAttribute("aria-invalid"); })
  );

  done.querySelector("[data-copy-brief]")?.addEventListener("click", async () => {
    const ok = await copyText(`To: ${EMAIL}\n\n${lastBrief}`);
    flash(done.querySelector(".copy-status"), ok ? "Brief copied" : "Couldn't copy — please select the text in your form");
  });
}
