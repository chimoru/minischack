// Ljudeffekter, skapade direkt i koden med Web Audio – inga ljudfiler behövs,
// så de fungerar offline och kräver inga licenser.
//
// iPhone/iPad tillåter bara ljud efter att användaren har rört skärmen, så ljudet
// "låses upp" vid första tryck.
import { store } from '../storage.js';

let ctx = null;

function unlock() {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { ctx = null; }
}
window.addEventListener('pointerdown', unlock, { capture: true });

// En ton: frekvens (Hz), start (s efter nu), längd (s), vågform, volym
function tone(freq, start, length, type = 'sine', volume = 0.25, slideTo = null) {
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + length);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + length + 0.02);
}

// Ett kort "tock" som när en träpjäs ställs ner
function knock(start = 0, pitch = 1, volume = 0.5) {
  const t = ctx.currentTime + start;
  const len = 0.06;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 900 * pitch;
  filter.Q.value = 2;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(t);
  tone(180 * pitch, start, 0.08, 'sine', volume * 0.5);
}

const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5;

const SOUNDS = {
  select: () => tone(700, 0, 0.06, 'sine', 0.12),
  move: () => knock(),
  capture: () => { knock(0, 0.8, 0.6); knock(0.07, 1.2, 0.4); },
  check: () => { tone(880, 0, 0.15, 'triangle', 0.25); tone(1175, 0.12, 0.25, 'triangle', 0.25); },
  mate: () => { knock(); [C5, E5, G5].forEach((f, i) => tone(f, 0.1 + i * 0.1, 0.3, 'triangle', 0.25)); },
  win: () => {
    [C5, E5, G5, C6].forEach((f, i) => tone(f, i * 0.14, 0.35, 'square', 0.1));
    tone(C6, 0.56, 0.7, 'triangle', 0.25);
  },
  lose: () => { tone(392, 0, 0.35, 'triangle', 0.2, 370); tone(330, 0.35, 0.6, 'triangle', 0.2, 290); },
  draw: () => { tone(G5, 0, 0.25, 'triangle', 0.2); tone(G5, 0.25, 0.35, 'triangle', 0.2); },
  nope: () => tone(160, 0, 0.14, 'triangle', 0.25, 120),
  star: () => [E5, G5, C6].forEach((f, i) => tone(f, i * 0.07, 0.2, 'sine', 0.2)),
};

export function sfx(name) {
  if (!store.settings.sound || !ctx || ctx.state !== 'running') return;
  try { SOUNDS[name]?.(); } catch { /* ljud är aldrig viktigare än spelet */ }
}
