// Datormotståndaren.
//
// Så här "tänker" datorn: den provar sina drag, sedan motståndarens svar, osv. några
// drag framåt (sökdjup), och ger varje slutställning poäng (material + hur bra pjäserna
// står). Alfa-beta-tricket hoppar över varianter som ändå inte kan bli bättre.
//
// På de lätta nivåerna tänker datorn kortare, gör ibland slumpdrag och väljer ibland
// medvetet ett sämre drag, så att barnet får chansen att vinna.

import { legalMoves, makeMove, unmakeMove, inCheck, typeOf, isWhite } from './rules.js';

// depth     – hur många drag framåt datorn tänker
// quiesce   – tittar vidare på slag efter sökdjupet (annars missar den återtagningar)
// random    – andel helt slumpade drag (som ett barn som precis lärt sig pjäserna)
// takeMate  – chans att den ser en matt den kan göra (1 = alltid)
// mistake   – chans att medvetet välja ett sämre drag, högst `margin` poäng sämre
export const LEVEL_SETTINGS = {
  chick: { depth: 1, quiesce: false, random: 0.5, takeMate: 0.3, mistake: 0.5, margin: 600 },
  bunny: { depth: 1, quiesce: false, random: 0.1, takeMate: 0.7, mistake: 0.45, margin: 450 },
  fox: { depth: 2, quiesce: true, takeMate: 1, mistake: 0.22, margin: 160 },
  owl: { depth: 4, quiesce: true, takeMate: 1, mistake: 0, margin: 0, timeMs: 1500 },
};

const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const MATE = 100000;

// Positionstabeller (sett från vit, ruta 0 = a8). Bonus/straff för var pjäsen står.
const PST = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20],
  // I slutspelet ska kungen i stället gå fram mot mitten
  kEnd: [
    -50, -40, -30, -20, -20, -30, -40, -50,
    -30, -20, -10, 0, 0, -10, -20, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -30, 0, 0, 0, 0, -30, -30,
    -50, -30, -30, -30, -30, -30, -30, -50],
};

// Poäng från den som ska spelas perspektiv (positivt = bra för den som är på tur)
function evaluate(s) {
  const b = s.board;
  let score = 0;
  let heavy = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq];
    if (p && typeOf(p) !== 'p' && typeOf(p) !== 'k') heavy += VALUE[typeOf(p)];
  }
  const endgame = heavy <= 1300;
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq];
    if (p === null) continue;
    const t = typeOf(p);
    const white = isWhite(p);
    const idx = white ? sq : sq ^ 56;       // spegla tabellen för svart
    const table = t === 'k' && endgame ? PST.kEnd : PST[t];
    const v = VALUE[t] + table[idx];
    score += white ? v : -v;
  }
  return s.turn === 'w' ? score : -score;
}

// Bra drag först (slå dyra pjäser med billiga) gör alfa-beta mycket snabbare
function order(moves) {
  const key = (m) => (m.captured ? 10 * VALUE[typeOf(m.captured)] - VALUE[typeOf(m.piece)] + 10000 : 0)
    + (m.promotion ? 8000 : 0);
  return moves.sort((a, b) => key(b) - key(a));
}

class Search {
  constructor(settings, deadline) {
    this.settings = settings;
    this.deadline = deadline;
    this.nodes = 0;
    this.stopped = false;
  }

  timeUp() {
    if (this.deadline && (++this.nodes & 1023) === 0 && Date.now() > this.deadline) this.stopped = true;
    return this.stopped;
  }

  // Efter sökdjupet: fortsätt titta på slag, så datorn inte missar att pjäsen tas tillbaka
  quiesce(s, alpha, beta, qdepth = 0) {
    const stand = evaluate(s);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (qdepth > 6) return alpha;
    const captures = order(legalMoves(s, -1, true));
    for (const m of captures) {
      const undo = makeMove(s, m);
      const score = -this.quiesce(s, -beta, -alpha, qdepth + 1);
      unmakeMove(s, m, undo);
      if (this.timeUp()) return alpha;
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  negamax(s, depth, alpha, beta, ply) {
    const moves = legalMoves(s);
    if (moves.length === 0) return inCheck(s) ? -MATE + ply : 0;   // matt eller patt
    if (s.halfmove >= 100) return 0;
    if (depth === 0) return this.settings.quiesce ? this.quiesce(s, alpha, beta) : evaluate(s);

    for (const m of order(moves)) {
      const undo = makeMove(s, m);
      const score = -this.negamax(s, depth - 1, -beta, -alpha, ply + 1);
      unmakeMove(s, m, undo);
      if (this.timeUp()) return alpha;
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  // Poäng för varje drag i ställningen på ett visst djup
  // Drag som är sämre än (bästa hittills − margin) räknas inte ut exakt – de kan
  // ändå aldrig väljas – vilket gör sökningen mycket snabbare.
  scoreRoot(s, moves, depth, margin) {
    const out = [];
    let alpha = -MATE - 1;
    for (const m of moves) {
      const undo = makeMove(s, m);
      const score = -this.negamax(s, depth - 1, -MATE - 1, -alpha, 1);
      if (score - margin - 6 > alpha) alpha = score - margin - 6;
      unmakeMove(s, m, undo);
      if (this.stopped) return null;
      out.push({ move: m, score });
    }
    return out.sort((a, b) => b.score - a.score);
  }
}

// Väljer datorns drag. `state` ändras inte (kopian görs av den som anropar).
export function chooseMove(state, levelId, random = Math.random) {
  const settings = LEVEL_SETTINGS[levelId] ?? LEVEL_SETTINGS.bunny;
  const moves = order(legalMoves(state));
  const pick = (list) => list[Math.floor(random() * list.length)];
  if (moves.length === 1) return moves[0];

  // Kyckling: spelar ibland helt på måfå – vilken pjäs som helst, vart som helst
  if (settings.random && random() < settings.random) return pick(moves);

  const deadline = settings.timeMs ? Date.now() + settings.timeMs : 0;
  const search = new Search(settings, deadline);
  let scored = null;

  // Uggla tänker ett drag djupare i taget så länge tiden räcker
  const firstDepth = settings.timeMs ? 1 : settings.depth;
  for (let d = firstDepth; d <= settings.depth; d++) {
    const ordered = scored ? scored.map((x) => x.move) : moves;
    const result = search.scoreRoot(state, ordered, d, settings.margin);
    if (!result) break;
    scored = result;
    if (scored[0].score > MATE - 100) break;          // hittat matt – räcker så
  }
  scored ??= moves.map((m) => ({ move: m, score: 0 }));

  // Hittade den en matt? De lätta nivåerna "ser" den inte alltid – precis som en nybörjare
  const best = scored[0].score;
  const canMate = best > MATE - 100;
  if (canMate && random() < (settings.takeMate ?? 1)) return scored[0].move;
  const pool = canMate ? scored.filter((x) => x.score <= MATE - 100) : scored;
  if (!pool.length) return scored[0].move;
  const top = pool[0].score;

  if (settings.mistake && random() < settings.mistake) {
    // "Nybörjarmisstag": ett sämre drag, men inte ett som leder till att den själv blir matt
    const ok = pool.filter((x) => x.score >= top - settings.margin && x.score > -MATE + 100);
    if (ok.length) return pick(ok).move;   // tomt om alla drag förlorar
  }
  // Bland lika bra drag: välj slumpvis, så partierna blir olika
  return pick(pool.filter((x) => x.score >= top - 5)).move;
}
