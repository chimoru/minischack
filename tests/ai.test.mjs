// Låter datornivåerna spela mot varandra. Kör med:  node tests/ai.test.mjs [antal partier] [--gammal]
// --gammal: jämför också varje nivå mot sin tidigare (svårare) version.
// Starkare nivåer ska vinna mot svagare, och alla drag ska vara lagliga.
// Första raden mäter Kyckling mot en ren slumpspelare – den ska vara lätt att slå.
import { newGame, legalMoves, playMove, gameStatus, cloneState } from '../js/chess/rules.js';
import { chooseMove, PREVIOUS_LEVEL_SETTINGS } from '../js/chess/ai.js';

// En "spelare" som bara gör slumpdrag – används för att mäta hur lätt Kyckling är
const randomMove = (g) => { const ms = legalMoves(g); return ms[Math.floor(Math.random() * ms.length)]; };

function match(white, black) {
  const g = newGame();
  let slowest = 0;
  for (let ply = 0; ply < 200; ply++) {
    const st = gameStatus(g);
    if (st.over) return { result: st.winner ?? 'draw', slowest };
    const t = Date.now();
    const who = g.turn === 'w' ? white : black;
    const m = who === 'random' ? randomMove(g)
      : who.startsWith('old-') ? chooseMove(cloneState(g), PREVIOUS_LEVEL_SETTINGS[who.slice(4)])
      : chooseMove(cloneState(g), who);
    slowest = Math.max(slowest, Date.now() - t);
    if (!legalMoves(g).some((x) => x.from === m.from && x.to === m.to)) throw new Error('olagligt drag');
    playMove(g, m);
  }
  return { result: 'draw', slowest };
}

// [starkare, svagare]: trappan ska gå uppåt, och varje nivås gamla version ska slå den nya
const pairs = [['chick', 'random'], ['bunny', 'chick'], ['fox', 'bunny'], ['owl', 'fox'],
  ...(process.argv.includes('--gammal') ? [['old-chick', 'chick'], ['old-bunny', 'bunny'], ['old-fox', 'fox'], ['old-owl', 'owl']] : [])];
const GAMES = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 4);
let failed = 0;
for (const [strong, weak] of pairs) {
  let score = 0, slowest = 0;
  for (let i = 0; i < GAMES; i++) {
    const [w, b] = i % 2 ? [weak, strong] : [strong, weak];
    const r = match(w, b);
    slowest = Math.max(slowest, r.slowest);
    const strongColor = i % 2 ? 'b' : 'w';
    score += r.result === 'draw' ? 0.5 : r.result === strongColor ? 1 : 0;
  }
  const ok = score > GAMES / 2;
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${strong} mot ${weak}: ${score}/${GAMES} poäng, långsammaste draget ${slowest} ms`);
}
process.exit(failed ? 1 : 0);
