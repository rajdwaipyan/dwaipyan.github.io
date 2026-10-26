// Tiny sound engine for the guide. Every sound is synthesised with the Web Audio API —
// no audio files to download or license. Nothing plays until a visitor clicks the guide
// (browsers require a click before audio anyway), and the mute choice is remembered.

const KEY = "guide-sound"; // "off" = muted
let ctx = null, master = null, noiseBuf = null;
let muted = (() => { try { return localStorage.getItem(KEY) === "off"; } catch { return false; } })();

export const isMuted = () => muted;
export const isReady = () => !!ctx && ctx.state === "running";

export function setMuted(m) {
  muted = m;
  try { localStorage.setItem(KEY, m ? "off" : "on"); } catch { /* storage blocked */ }
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.32, ctx.currentTime, 0.02);
}

/** Call from inside a click handler: creates/resumes the audio context. */
export function unlock() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.32;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") ctx.resume();
}

const ok = () => ctx && !muted && ctx.state === "running";

function tone({ type = "sine", f0, f1 = f0, t = 0, dur = 0.12, vol = 0.5, attack = 0.005, curve = "exp" }) {
  const now = ctx.currentTime + t;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, now);
  if (f1 !== f0) curve === "lin" ? o.frequency.linearRampToValueAtTime(f1, now + dur) : o.frequency.exponentialRampToValueAtTime(f1, now + dur);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(vol, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.connect(g).connect(master);
  o.start(now); o.stop(now + dur + 0.05);
  return o;
}

function noise({ t = 0, dur = 0.3, vol = 0.4, type = "bandpass", f0 = 1000, f1 = f0, q = 1, attack = 0.01 }) {
  const now = ctx.currentTime + t;
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; s.loop = true;
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, now);
  f.frequency.exponentialRampToValueAtTime(f1, now + dur);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(vol, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  s.connect(f).connect(g).connect(master);
  s.start(now, Math.random()); s.stop(now + dur + 0.05);
}

const PENTA = [0, 2, 4, 7, 9];
const note = (base, step) => base * Math.pow(2, (PENTA[((step % 5) + 5) % 5] + 12 * Math.floor(step / 5)) / 12);

export const sfx = {
  /** a soft "pop" — opening the menu, clicking him */
  pop() { if (!ok()) return; tone({ f0: 420, f1: 1100, dur: 0.09, vol: 0.45 }); },

  /** cartoon voice: one blip per syllable, pitch wandering like speech */
  babble(text, { pitch = 1 } = {}) {
    if (!ok()) return;
    const n = Math.min(16, Math.max(3, Math.round(text.split(/\s+/).length * 1.4)));
    let p = 0;
    for (let i = 0; i < n; i++) {
      p += Math.round(Math.random() * 4 - 2);
      tone({ type: "triangle", f0: note(330 * pitch, p + 5), f1: note(330 * pitch, p + 4), t: i * 0.075, dur: 0.06, vol: 0.28, curve: "lin" });
    }
  },

  boing() { if (!ok()) return; tone({ f0: 160, f1: 620, dur: 0.18, vol: 0.5 }); tone({ f0: 620, f1: 220, t: 0.16, dur: 0.28, vol: 0.4 }); },

  whoosh() { if (!ok()) return; noise({ dur: 0.55, vol: 0.25, f0: 300, f1: 2400, q: 0.8, attack: 0.18 }); },

  achoo() {
    if (!ok()) return;
    tone({ type: "triangle", f0: 300, f1: 520, dur: 0.5, vol: 0.18, curve: "lin", attack: 0.2 });  // "ah-"
    noise({ t: 0.05, dur: 0.45, vol: 0.12, f0: 600, f1: 1400, q: 2, attack: 0.3 });
    noise({ t: 0.62, dur: 0.32, vol: 0.6, type: "highpass", f0: 1800, f1: 900, q: 0.7, attack: 0.004 }); // "CHOO"
    tone({ type: "square", f0: 240, f1: 120, t: 0.62, dur: 0.12, vol: 0.12 });
  },

  chime() {
    if (!ok()) return;
    [0, 2, 4, 7, 9, 12].forEach((s, i) => tone({ f0: note(880, s), t: i * 0.06, dur: 0.6, vol: 0.18 }));
  },

  /** a two-bar bouncy loop that matches the 2.4s dance */
  dance() {
    if (!ok()) return;
    const bass = [0, 0, 3, 3, 1, 1, 4, 2];
    const lead = [5, 7, 8, 7, 6, 8, 9, 10];
    for (let i = 0; i < 8; i++) {
      const t = i * 0.3;
      tone({ type: "square", f0: note(110, bass[i]), t, dur: 0.22, vol: 0.16 });
      tone({ type: "triangle", f0: note(440, lead[i]), t: t + 0.15, dur: 0.14, vol: 0.2 });
      noise({ t, dur: 0.05, vol: 0.12, type: "highpass", f0: 6000, attack: 0.002 });
    }
  },

  spin() { if (!ok()) return; tone({ type: "sawtooth", f0: 200, f1: 1600, dur: 0.5, vol: 0.12, curve: "lin" }); this.pop(); },

  snore() { if (!ok()) return; noise({ dur: 1.2, vol: 0.1, type: "lowpass", f0: 400, f1: 160, q: 4, attack: 0.5 }); },

  /** short grains while scratching the sand card (only if audio is already unlocked) */
  scratch() { if (!ok()) return; noise({ dur: 0.07, vol: 0.06, f0: 2500 + Math.random() * 2000, q: 1.5, attack: 0.004 }); },
};
