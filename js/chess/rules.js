// Alla schackregler – ren logik utan något UI.
//
// Brädet är en lista med 64 rutor. Ruta 0 = a8 (övre vänstra hörnet sett från vit),
// ruta 63 = h1. Rad = index >> 3 (0 = rad 8), kolumn = index & 7 (0 = a-linjen).
// Pjäser skrivs som bokstäver: stor bokstav = vit, liten = svart.
//   P/p bonde, N/n springare, B/b löpare, R/r torn, Q/q dam, K/k kung.

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const isWhite = (p) => p !== null && p === p.toUpperCase();
export const colorOf = (p) => (p === null ? null : isWhite(p) ? 'w' : 'b');
export const typeOf = (p) => p.toLowerCase();
const rowOf = (sq) => sq >> 3;
const colOf = (sq) => sq & 7;
const at = (r, c) => (r < 0 || r > 7 || c < 0 || c > 7 ? -1 : r * 8 + c);

export const squareName = (sq) => 'abcdefgh'[colOf(sq)] + (8 - rowOf(sq));
export const squareIndex = (name) => (8 - Number(name[1])) * 8 + 'abcdefgh'.indexOf(name[0]);

const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

// Rutor som påverkar rockadrätten om något flyttas från/till dem
const A1 = 56, E1 = 60, H1 = 63, A8 = 0, E8 = 4, H8 = 7;

// ---------- FEN (textformat för en ställning) ----------

export function fromFEN(fen) {
  const [placement, turn, castling, ep, half, full] = fen.trim().split(/\s+/);
  const board = [];
  for (const ch of placement) {
    if (ch === '/') continue;
    if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) board.push(null);
    else board.push(ch);
  }
  return {
    board,
    turn,
    castling: {
      K: castling.includes('K'), Q: castling.includes('Q'),
      k: castling.includes('k'), q: castling.includes('q'),
    },
    ep: ep === '-' ? null : squareIndex(ep),
    halfmove: Number(half ?? 0),
    fullmove: Number(full ?? 1),
    history: [],        // positionsnycklar för upprepningsregeln
  };
}

export function positionKey(s) {
  let out = '';
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const p = s.board[r * 8 + c];
      if (p === null) { empty++; continue; }
      if (empty) { out += empty; empty = 0; }
      out += p;
    }
    if (empty) out += empty;
    if (r < 7) out += '/';
  }
  const cs = ['K', 'Q', 'k', 'q'].filter((k) => s.castling[k]).join('') || '-';
  return `${out} ${s.turn} ${cs} ${s.ep === null ? '-' : squareName(s.ep)}`;
}

export const toFEN = (s) => `${positionKey(s)} ${s.halfmove} ${s.fullmove}`;

export function newGame(fen = START_FEN) {
  const s = fromFEN(fen);
  s.history.push(positionKey(s));
  return s;
}

export function cloneState(s) {
  return {
    board: s.board.slice(),
    turn: s.turn,
    castling: { ...s.castling },
    ep: s.ep,
    halfmove: s.halfmove,
    fullmove: s.fullmove,
    history: s.history.slice(),
  };
}

// ---------- Hot ----------

// Är rutan `sq` anfallen av någon pjäs med färgen `by`?
export function isAttacked(s, sq, by) {
  const b = s.board;
  const r = rowOf(sq), c = colOf(sq);
  const white = by === 'w';

  // Bönder (vit bonde anfaller uppåt, alltså från raden under)
  const pr = white ? r + 1 : r - 1;
  const pawn = white ? 'P' : 'p';
  for (const dc of [-1, 1]) {
    const t = at(pr, c + dc);
    if (t >= 0 && b[t] === pawn) return true;
  }

  const knight = white ? 'N' : 'n';
  for (const [dr, dc] of KNIGHT) {
    const t = at(r + dr, c + dc);
    if (t >= 0 && b[t] === knight) return true;
  }

  const king = white ? 'K' : 'k';
  for (const [dr, dc] of KING) {
    const t = at(r + dr, c + dc);
    if (t >= 0 && b[t] === king) return true;
  }

  const rook = white ? 'R' : 'r', bishop = white ? 'B' : 'b', queen = white ? 'Q' : 'q';
  for (const [dr, dc] of ROOK_DIRS) {
    for (let i = 1; ; i++) {
      const t = at(r + dr * i, c + dc * i);
      if (t < 0) break;
      const p = b[t];
      if (p === null) continue;
      if (p === rook || p === queen) return true;
      break;
    }
  }
  for (const [dr, dc] of BISHOP_DIRS) {
    for (let i = 1; ; i++) {
      const t = at(r + dr * i, c + dc * i);
      if (t < 0) break;
      const p = b[t];
      if (p === null) continue;
      if (p === bishop || p === queen) return true;
      break;
    }
  }
  return false;
}

export function kingSquare(s, color) {
  const k = color === 'w' ? 'K' : 'k';
  return s.board.indexOf(k);
}

export function inCheck(s, color = s.turn) {
  const k = kingSquare(s, color);
  return k >= 0 && isAttacked(s, k, color === 'w' ? 'b' : 'w');
}

// ---------- Draggenerering ----------

// Drag som följer pjäsernas rörelser men som ännu inte kontrollerats mot schack.
function pseudoMoves(s, onlyFrom = -1) {
  const moves = [];
  const b = s.board;
  const us = s.turn;
  const them = us === 'w' ? 'b' : 'w';

  const add = (from, to, extra) => {
    moves.push({ from, to, piece: b[from], captured: b[to], ...extra });
  };

  for (let from = 0; from < 64; from++) {
    if (onlyFrom >= 0 && from !== onlyFrom) continue;
    const p = b[from];
    if (p === null || colorOf(p) !== us) continue;
    const r = rowOf(from), c = colOf(from);
    const t = typeOf(p);

    if (t === 'p') {
      const dir = us === 'w' ? -1 : 1;
      const startRow = us === 'w' ? 6 : 1;
      const lastRow = us === 'w' ? 0 : 7;
      const pushPawn = (to, extra = {}) => {
        if (rowOf(to) === lastRow) {
          for (const promo of ['q', 'r', 'b', 'n']) {
            add(from, to, { ...extra, promotion: us === 'w' ? promo.toUpperCase() : promo });
          }
        } else add(from, to, extra);
      };
      const one = at(r + dir, c);
      if (one >= 0 && b[one] === null) {
        pushPawn(one);
        const two = at(r + 2 * dir, c);
        if (r === startRow && b[two] === null) add(from, two, { flag: 'double' });
      }
      for (const dc of [-1, 1]) {
        const to = at(r + dir, c + dc);
        if (to < 0) continue;
        if (b[to] !== null && colorOf(b[to]) === them) pushPawn(to);
        else if (to === s.ep) {
          add(from, to, { flag: 'ep', captured: us === 'w' ? 'p' : 'P' });
        }
      }
      continue;
    }

    if (t === 'n' || t === 'k') {
      for (const [dr, dc] of t === 'n' ? KNIGHT : KING) {
        const to = at(r + dr, c + dc);
        if (to < 0) continue;
        if (b[to] === null || colorOf(b[to]) === them) add(from, to);
      }
      if (t === 'k') addCastling(s, from, add);
      continue;
    }

    const dirs = t === 'r' ? ROOK_DIRS : t === 'b' ? BISHOP_DIRS : [...ROOK_DIRS, ...BISHOP_DIRS];
    for (const [dr, dc] of dirs) {
      for (let i = 1; ; i++) {
        const to = at(r + dr * i, c + dc * i);
        if (to < 0) break;
        if (b[to] === null) { add(from, to); continue; }
        if (colorOf(b[to]) === them) add(from, to);
        break;
      }
    }
  }
  return moves;
}

function addCastling(s, from, add) {
  const b = s.board;
  const white = s.turn === 'w';
  const them = white ? 'b' : 'w';
  const home = white ? E1 : E8;
  if (from !== home) return;
  if (isAttacked(s, home, them)) return;            // får inte rockera ur schack
  const rook = white ? 'R' : 'r';

  // Kort rockad: kungen går två steg mot h-linjen
  if (s.castling[white ? 'K' : 'k'] && b[home + 3] === rook &&
      b[home + 1] === null && b[home + 2] === null &&
      !isAttacked(s, home + 1, them) && !isAttacked(s, home + 2, them)) {
    add(from, home + 2, { flag: 'castleK' });
  }
  // Lång rockad: kungen går två steg mot a-linjen
  if (s.castling[white ? 'Q' : 'q'] && b[home - 4] === rook &&
      b[home - 1] === null && b[home - 2] === null && b[home - 3] === null &&
      !isAttacked(s, home - 1, them) && !isAttacked(s, home - 2, them)) {
    add(from, home - 2, { flag: 'castleQ' });
  }
}

// ---------- Göra / ångra drag ----------

// Utför draget direkt på `s` och returnerar det som behövs för att ångra det.
export function makeMove(s, m) {
  const b = s.board;
  const undo = {
    castling: { ...s.castling }, ep: s.ep, halfmove: s.halfmove, fullmove: s.fullmove,
  };

  b[m.to] = m.promotion ?? m.piece;
  b[m.from] = null;

  if (m.flag === 'ep') {
    b[m.to + (s.turn === 'w' ? 8 : -8)] = null;
  } else if (m.flag === 'castleK') {
    b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = null;
  } else if (m.flag === 'castleQ') {
    b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = null;
  }

  // Rockadrätten försvinner när kung eller torn flyttar, eller när ett torn slås
  for (const sq of [m.from, m.to]) {
    if (sq === E1) { s.castling.K = false; s.castling.Q = false; }
    if (sq === E8) { s.castling.k = false; s.castling.q = false; }
    if (sq === H1) s.castling.K = false;
    if (sq === A1) s.castling.Q = false;
    if (sq === H8) s.castling.k = false;
    if (sq === A8) s.castling.q = false;
  }

  s.ep = m.flag === 'double' ? (m.from + m.to) / 2 : null;
  s.halfmove = typeOf(m.piece) === 'p' || m.captured ? 0 : s.halfmove + 1;
  if (s.turn === 'b') s.fullmove++;
  s.turn = s.turn === 'w' ? 'b' : 'w';
  return undo;
}

export function unmakeMove(s, m, undo) {
  const b = s.board;
  s.turn = s.turn === 'w' ? 'b' : 'w';
  b[m.from] = m.piece;
  if (m.flag === 'ep') {
    b[m.to] = null;
    b[m.to + (s.turn === 'w' ? 8 : -8)] = m.captured;
  } else {
    b[m.to] = m.captured;
  }
  if (m.flag === 'castleK') {
    b[m.to + 1] = b[m.to - 1]; b[m.to - 1] = null;
  } else if (m.flag === 'castleQ') {
    b[m.to - 2] = b[m.to + 1]; b[m.to + 1] = null;
  }
  s.castling = undo.castling;
  s.ep = undo.ep;
  s.halfmove = undo.halfmove;
  s.fullmove = undo.fullmove;
}

// Bara drag som inte lämnar den egna kungen i schack.
// capturesOnly: bara slag och förvandlingar (används av datorn).
export function legalMoves(s, onlyFrom = -1, capturesOnly = false) {
  const us = s.turn;
  const out = [];
  for (const m of pseudoMoves(s, onlyFrom)) {
    if (capturesOnly && !m.captured && !m.promotion) continue;
    const undo = makeMove(s, m);
    if (!inCheck(s, us)) out.push(m);
    unmakeMove(s, m, undo);
  }
  return out;
}

// Spelar ett drag "på riktigt" i ett parti (sparar historik för upprepningsregeln).
export function playMove(s, m) {
  makeMove(s, m);
  if (s.halfmove === 0) s.history = [];   // efter bonddrag/slag kan tidigare ställningar aldrig återkomma
  s.history.push(positionKey(s));
}

// ---------- Hur går det i partiet? ----------

function insufficientMaterial(s) {
  const pieces = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = s.board[sq];
    if (p === null || typeOf(p) === 'k') continue;
    const t = typeOf(p);
    if (t === 'p' || t === 'r' || t === 'q') return false;
    pieces.push({ t, sq });
  }
  if (pieces.length <= 1) return true;                     // K mot K, K+L/S mot K
  // Bara löpare, alla på samma färg av rutor
  if (pieces.every((x) => x.t === 'b')) {
    const shade = (sq) => (rowOf(sq) + colOf(sq)) % 2;
    return pieces.every((x) => shade(x.sq) === shade(pieces[0].sq));
  }
  return false;
}

// Returnerar t.ex. { over: true, result: 'checkmate', winner: 'w' }
export function gameStatus(s) {
  const moves = legalMoves(s);
  const check = inCheck(s);
  if (moves.length === 0) {
    return check
      ? { over: true, result: 'checkmate', winner: s.turn === 'w' ? 'b' : 'w', check }
      : { over: true, result: 'stalemate', winner: null, check };
  }
  if (s.halfmove >= 100) return { over: true, result: 'fifty', winner: null, check };
  const key = s.history[s.history.length - 1];
  if (key && s.history.filter((k) => k === key).length >= 3) {
    return { over: true, result: 'repetition', winner: null, check };
  }
  if (insufficientMaterial(s)) return { over: true, result: 'material', winner: null, check };
  return { over: false, result: null, winner: null, check };
}

// ---------- Perft (räknar drag, används av testerna) ----------

export function perft(s, depth) {
  if (depth === 0) return 1;
  const moves = legalMoves(s);
  if (depth === 1) return moves.length;
  let n = 0;
  for (const m of moves) {
    const undo = makeMove(s, m);
    n += perft(s, depth - 1);
    unmakeMove(s, m, undo);
  }
  return n;
}
