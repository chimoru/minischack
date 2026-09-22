// Regeltester. Kör med:  node tests/rules.test.mjs
//
// "Perft" räknar alla möjliga dragföljder till ett visst djup. Facit kommer från
// schackprogrammerarnas standardpositioner (chessprogramming.org/Perft_Results).
// Minsta fel i rockad, en passant, förvandling eller schackregler ger fel siffra.

import {
  newGame, perft, gameStatus, legalMoves, playMove, squareIndex, START_FEN,
} from '../js/chess/rules.js';

let failed = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}: ${actual}${ok ? '' : ` (förväntat ${expected})`}`);
}

const PERFT = [
  ['Startställning', START_FEN, [20, 400, 8902, 197281]],
  ['Kiwipete (rockad, en passant, förvandling)',
    'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['Position 3 (en passant + schack)', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['Position 4 (förvandlingar)',
    'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['Position 5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
];

for (const [name, fen, counts] of PERFT) {
  counts.forEach((expected, i) => {
    check(`${name}, djup ${i + 1}`, perft(newGame(fen), i + 1), expected);
  });
}

// Spelar drag angivna som "e2e4" (och "e7e8q" för förvandling)
function play(game, ...moves) {
  for (const txt of moves) {
    const from = squareIndex(txt.slice(0, 2)), to = squareIndex(txt.slice(2, 4));
    const promo = txt[4];
    const m = legalMoves(game).find((x) => x.from === from && x.to === to &&
      (!promo || x.promotion?.toLowerCase() === promo));
    if (!m) throw new Error(`Olagligt drag i testet: ${txt}`);
    playMove(game, m);
  }
  return game;
}

check('Schackmatt (narrmatt)',
  gameStatus(play(newGame(), 'f2f3', 'e7e5', 'g2g4', 'd8h4')).result, 'checkmate');
check('Patt', gameStatus(newGame('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')).result, 'stalemate');
check('Trefaldig upprepning', gameStatus(play(newGame(),
  'g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8')).result, 'repetition');
check('50-dragsregeln', gameStatus(newGame('7k/8/8/8/8/8/R7/K7 w - - 100 80')).result, 'fifty');
check('Otillräckligt material', gameStatus(newGame('7k/8/8/8/8/8/1N6/K7 w - - 0 1')).result, 'material');
check('Parti pågår', gameStatus(newGame()).result, null);

console.log(failed ? `\n❌ ${failed} test misslyckades` : '\n🎉 Alla test gick igenom!');
process.exit(failed ? 1 : 0);
