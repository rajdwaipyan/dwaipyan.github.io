// The digital twin's voice — loaded only when a visitor turns on the microphone or spoken answers.
// Uses the browser's own speech features (Web Speech API): no service to pay for and no key.
//   • listening: SpeechRecognition (Chrome, Edge, Safari). The browser asks for the microphone the first time,
//     and some browsers send the audio to their own speech service to transcribe it.
//   • speaking: speechSynthesis (all modern browsers), with word events used to move the character's mouth.
// Nothing here runs without a click, and every failure reports back so the text chat keeps working.

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canListen = !!SR;
export const canSpeak = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

/* ---------- listening */
let rec = null;
/** start one question; handlers: onStart, onInterim(text), onFinal(text), onError(code), onEnd */
export function listen(h) {
  if (!SR) { h.onError?.("unsupported"); return () => {}; }
  stopListening();
  let final = "", done = false;
  rec = new SR();
  rec.lang = document.documentElement.lang || "en-GB";
  rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
  rec.onstart = () => h.onStart?.();
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += t; else interim += t;
    }
    h.onInterim?.((final + " " + interim).trim());
  };
  rec.onerror = (e) => { if (e.error !== "aborted") h.onError?.(e.error || "error"); };
  rec.onend = () => { if (done) return; done = true; rec = null; if (final.trim()) h.onFinal?.(final.trim()); h.onEnd?.(); };
  try { rec.start(); } catch { h.onError?.("error"); h.onEnd?.(); }
  return stopListening;
}
export function stopListening() { try { rec?.stop(); } catch { /* already stopped */ } }
export function cancelListening() { try { rec?.abort(); } catch { /* already stopped */ } rec = null; }

/* ---------- speaking */
let voice = null, queue = [], current = 0;
function pickVoice() {
  const all = speechSynthesis.getVoices();
  if (!all.length) return null;
  const want = ["en-IN", "en-GB", "en-AU", "en-US", "en"];
  for (const lang of want) {
    const pool = all.filter((v) => v.lang.replace("_", "-").startsWith(lang));
    if (pool.length) return pool.find((v) => /male|daniel|rishi|george|ryan|guy|david/i.test(v.name) && !/female/i.test(v.name)) || pool.find((v) => v.localService) || pool[0];
  }
  return all[0];
}
if (canSpeak) { voice = pickVoice(); speechSynthesis.addEventListener?.("voiceschanged", () => { voice = pickVoice(); }); }

/** text → what should be said aloud (no urls, symbols or list markers) */
export const speakable = (t) => t.replace(/https?:\/\/\S+/g, "").replace(/[·•→]/g, ", ").replace(/\s—\s/g, ", ").replace(/&/g, " and ").replace(/\bCGPA\b/g, "C G P A").replace(/\bBSc\b/g, "B S C").replace(/\s+/g, " ").trim();

/** speak text; handlers: onStart, onWord, onEnd(finished) */
export function speak(text, h = {}) {
  if (!canSpeak) { h.onEnd?.(false); return; }
  stopSpeaking();
  const id = ++current;
  // short chunks: some browsers cut off long utterances
  queue = speakable(text).match(/[^.!?]+[.!?]*\s*/g) || [];
  let started = false;
  const next = () => {
    if (id !== current) return;
    const part = queue.shift();
    if (!part || !part.trim()) { if (!queue.length) { h.onEnd?.(true); return; } next(); return; }
    const u = new SpeechSynthesisUtterance(part.trim());
    if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = "en-GB";
    u.rate = 1.02; u.pitch = 1;
    u.onstart = () => { if (!started) { started = true; h.onStart?.(); } };
    u.onboundary = () => { if (id === current) h.onWord?.(); };
    u.onend = () => next();
    u.onerror = () => { if (id === current) { current++; h.onEnd?.(false); } };
    speechSynthesis.speak(u);
  };
  next();
}
export function stopSpeaking() { current++; queue = []; if (canSpeak) { try { speechSynthesis.cancel(); } catch { /* nothing playing */ } } }
export const isSpeaking = () => canSpeak && (speechSynthesis.speaking || speechSynthesis.pending);
