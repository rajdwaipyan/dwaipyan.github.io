// Entry point (loaded as a module, so it runs after the HTML is parsed).
import { initCore } from "./core.js";
import { initMotion } from "./motion.js";
import { initMenu } from "./menu.js";
import { initCases } from "./cases.js";
import { initJournal } from "./journal.js";
import { initVideo } from "./video.js";
import { initPhoto } from "./photo.js";
import { initAI } from "./ai.js";
import { initPreviews } from "./preview.js";
import { initServices } from "./services.js";
import { initSolutions } from "./solutions.js";
import { initHero } from "./hero.js";
import { initBuilder } from "./builder.js";
import { initMachine } from "./machine.js";
import { initContact } from "./contact.js";
import { initXray } from "./xray.js";
import { initTwin } from "./twin.js";
import { initFx } from "./fx.js";

const run = (name, fn) => {
  try { fn(); } catch (err) { console.error(`[${name}]`, err); }
};

run("core", initCore);
run("menu", initMenu);
run("hero", initHero);      // before motion: the hero splits its own letters
run("motion", initMotion);
run("cases", initCases);
run("journal", initJournal);
run("video", initVideo);
run("photo", initPhoto);
run("ai", initAI);
run("preview", initPreviews);
run("services", initServices);
run("solutions", initSolutions);
run("builder", initBuilder);
run("machine", initMachine);
run("contact", initContact);
run("xray", initXray);
run("twin", initTwin);
run("fx", initFx);
// DWAIPYAN INTELLIGENCE: loaded only on its own page
if (document.getElementById("di-data")) import("./intelligence.js").then((m) => run("intelligence", m.initIntelligence), (e) => console.error("[intelligence]", e));
