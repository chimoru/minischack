// Ber datorn om ett drag. Använder bakgrundstråden om den finns, annars räknar
// vi direkt (då kan appen hacka en kort stund, men spelet fungerar ändå).
import { cloneState } from '../chess/rules.js';

const THINK_AT_LEAST_MS = 700;    // så det känns som att någon faktiskt tänker

let worker = null;
try {
  worker = new Worker(new URL('../chess/ai-worker.js', import.meta.url), { type: 'module' });
} catch { worker = null; }

let nextId = 0;
const waiting = new Map();
worker?.addEventListener('message', (e) => {
  waiting.get(e.data.id)?.(e.data.move);
  waiting.delete(e.data.id);
});
worker?.addEventListener('error', () => { worker = null; });

async function think(state, levelId) {
  if (worker) {
    const id = nextId++;
    return new Promise((resolve) => {
      waiting.set(id, resolve);
      worker.postMessage({ id, state, level: levelId });
    });
  }
  const { chooseMove } = await import('../chess/ai.js');
  return chooseMove(state, levelId);
}

export async function computerMove(game, level) {
  const started = Date.now();
  const move = await think(cloneState(game), level.id);
  const wait = THINK_AT_LEAST_MS - (Date.now() - started);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  return move;
}
