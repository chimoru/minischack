// Låter datornivåerna spela mot varandra. Kör med:  node tests/ai.test.mjs [antal partier]
// Starkare nivåer ska vinna mot svagare, och alla drag ska vara lagliga.
// Första raden mäter Kyckling mot en ren slumpspelare – den ska vara lätt att slå.
import { newGame, legalMoves, playMove, gameStatus, cloneState } from '../js/chess/rules.js';
import { chooseMove } from '../js/chess/ai.js';

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
    const m = who === 'random' ? randomMove(g) : chooseMove(cloneState(g), who);
    slowest = Math.max(slowest, Date.now() - t);
    if (!legalMoves(g).some((x) => x.from === m.from && x.to === m.to)) throw new Error('olagligt drag');
    playMove(g, m);
  }
  return { result: 'draw', slowest };
}

const pairs = [['chick', 'random'], ['bunny', 'chick'], ['fox', 'bunny'], ['owl', 'fox']];
const GAMES = Number(process.argv[2] ?? 4);
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
