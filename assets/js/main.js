// Entry point (loaded as a module, so it runs after the HTML is parsed).
import { initCore } from "./core.js";
import { initHero } from "./hero.js";
import { initBuilder } from "./builder.js";
import { initMachine } from "./machine.js";
import { initContact } from "./contact.js";
import { initXray } from "./xray.js";

const run = (name, fn) => {
  try { fn(); } catch (err) { console.error(`[${name}]`, err); }
};

run("core", initCore);
run("hero", initHero);
run("builder", initBuilder);
run("machine", initMachine);
run("contact", initContact);
run("xray", initXray);
