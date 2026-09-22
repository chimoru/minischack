// "Lär dig pjäserna": välj en pjäs, se vart den kan gå och fånga stjärnor.
// Ingen motståndare, ingen press – bara pjäsen, gröna rutor och en stjärna att nå.
import { legalMoves, makeMove, squareIndex } from '../chess/rules.js';
import { BoardView } from './board.js';
import { pieceSVG, PIECE_NAMES } from './pieces.js';
import { popup } from './popup.js';
import { sfx } from './sound.js';
import { store } from '../storage.js';

const STARS_TO_LEARN = 5;

const PIECES = [
  { type: 'p', tip: 'Bonden går rakt fram – men tar andra pjäser snett!' },
  { type: 'r', tip: 'Tornet går rakt: framåt, bakåt och åt sidan.' },
  { type: 'b', tip: 'Löparen går snett, hur långt som helst.' },
  { type: 'n', tip: 'Springaren hoppar som ett L – och kan hoppa över andra pjäser!' },
  { type: 'q', tip: 'Damen går både rakt och snett, hur långt som helst.' },
  { type: 'k', tip: 'Kungen går ett steg åt alla håll.' },
];

const content = document.getElementById('learn-content');
const title = document.getElementById('learn-title');
let onExit = () => {};
let board = null;        // BoardView för övningsbrädet
let current = null;      // { type, tip }
let state = null;        // schackställning med bara vår pjäs (och ibland en svart bonde)
let pieceSq = -1;
let star = -1;
let caught = 0;
let sliding = false;     // en pjäs är på väg – vänta med nästa tryck

const style = () => store.settings.pieceStyle;
const random = (list) => list[Math.floor(Math.random() * list.length)];

export function initLearn(exit) {
  onExit = exit;
  document.getElementById('learn-back').addEventListener('click', () => {
    if (current) showPicker(); else onExit();
  });
}

// ---------- Välj pjäs ----------

export function showPicker() {
  current = null;
  board = null;
  title.textContent = 'Lär dig pjäserna';
  content.innerHTML = `
    <p class="learn-intro">Tryck på en pjäs!</p>
    <div class="learn-grid">
      ${PIECES.map((p) => `
        <button class="btn btn-white learn-choice" type="button" data-piece="${p.type}">
          ${store.learned.includes(p.type) ? '<span class="learned-check" aria-label="Klar">✔</span>' : ''}
          <span class="learn-piece">${pieceSVG(p.type.toUpperCase(), style())}</span>
          <span>${PIECE_NAMES[p.type]}</span>
        </button>`).join('')}
    </div>`;
}

content.addEventListener('click', (e) => {
  const type = e.target.closest('.learn-choice')?.dataset.piece;
  const piece = PIECES.find((p) => p.type === type);
  if (piece) startPractice(piece);
});

// ---------- Öva ----------

function emptyState() {
  return {
    board: Array(64).fill(null), turn: 'w',
    castling: { K: false, Q: false, k: false, q: false },
    ep: null, halfmove: 0, fullmove: 1, history: [],
  };
}

function startPractice(piece) {
  current = piece;
  caught = 0;
  sfx('select');
  title.textContent = PIECE_NAMES[piece.type];
  content.innerHTML = `
    <div class="learn-top card">
      <span class="learn-tip-piece">${pieceSVG(piece.type.toUpperCase(), style())}</span>
      <p class="learn-tip">${piece.tip}</p>
    </div>
    <div class="learn-stars" id="learn-stars" aria-label="Stjärnor"></div>
    <div class="board-wrap"><div class="board learn-board" id="learn-board"></div></div>`;
  board = new BoardView(document.getElementById('learn-board'), onSquare);

  state = emptyState();
  pieceSq = piece.type === 'p' ? squareIndex(random(['c2', 'd2', 'e2', 'f2'])) : squareIndex('d4');
  state.board[pieceSq] = piece.type.toUpperCase();
  placeStar();
  render();
}

// Lägg stjärnan på en ruta pjäsen kan nå med ett drag
function placeStar() {
  // Ta bort gamla svarta bönder från förra rundan
  for (let sq = 0; sq < 64; sq++) if (sq !== pieceSq) state.board[sq] = null;

  if (current.type === 'p') {
    // Bonden har gått nästan hela vägen: börja om längst ner
    if (pieceSq >> 3 <= 2) {
      state.board[pieceSq] = null;
      pieceSq = squareIndex(random(['b2', 'c2', 'd2', 'e2', 'f2', 'g2']));
      state.board[pieceSq] = 'P';
    }
    // Varannan gång: en svart bonde snett framför, med stjärnan på – bonden tar snett!
    const col = pieceSq & 7;
    const diagonals = [-9, -7].filter((d) => Math.abs(((pieceSq + d) & 7) - col) === 1);
    if (Math.random() < 0.5 && diagonals.length) {
      star = pieceSq + random(diagonals);
      state.board[star] = 'p';
      return;
    }
  }
  const targets = legalMoves(state, pieceSq).map((m) => m.to);
  star = random(targets);
}

function render() {
  board.render(state.board, {
    selected: pieceSq,
    hints: legalMoves(state, pieceSq).map((m) => ({ to: m.to, capture: !!m.captured })),
    style: style(),
    stars: [star],
  });
  document.getElementById('learn-stars').innerHTML = Array.from({ length: STARS_TO_LEARN },
    (_, i) => `<span class="${i < caught ? 'got' : ''}">⭐</span>`).join('');
}

async function onSquare(sq) {
  if (!current || sliding || sq === pieceSq) return;
  const move = legalMoves(state, pieceSq).find((m) => m.to === sq && (!m.promotion || m.promotion === 'Q'));
  if (!move) { board.shake(sq); sfx('nope'); return; }

  // Låt pjäsen glida dit (utom när den dragits med fingret – då är den redan där)
  const practising = current;
  sliding = true;
  await board.slide([{ from: pieceSq, to: sq, piece: move.piece }], board.dropped ? 0 : 250, style());
  sliding = false;
  if (current !== practising) return;   // man gick tillbaka under tiden

  makeMove(state, move);
  state.turn = 'w';                  // här är det alltid vår tur
  state.ep = null;
  pieceSq = sq;
  if (move.promotion) state.board[sq] = 'P';   // bonden får vara kvar som bonde i övningen

  if (sq !== star) {
    sfx(move.captured ? 'capture' : 'move');
    // Kan pjäsen inte längre nå stjärnan (t.ex. bonden gick förbi)? Flytta stjärnan.
    if (!legalMoves(state, pieceSq).some((m) => m.to === star)) placeStar();
    render();
    return;
  }

  caught++;
  sfx('star');
  if (caught < STARS_TO_LEARN) { placeStar(); render(); return; }

  star = -1;
  render();
  store.addLearned(current.type);
  sfx('win');
  const name = PIECES_DEFINITE[current.type];
  const choice = await popup(
    `<div class="popup-piece">${pieceSVG(current.type.toUpperCase(), style())}</div>
     <h2>Bra jobbat! 🌟</h2><p class="popup-sub">Nu kan du ${name}!</p>`,
    [
      { html: '🔁 Öva mer', className: 'btn-green', value: 'again' },
      { html: '♟️ Andra pjäser', className: 'btn-blue', value: 'picker' },
    ],
  );
  if (choice === 'again') startPractice(current); else showPicker();
}

const PIECES_DEFINITE = {
  p: 'bonden', r: 'tornet', b: 'löparen', n: 'springaren', q: 'damen', k: 'kungen',
};
