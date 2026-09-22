// Styr ett parti: turordning, val av pjäs, drag, förvandling och slutet.
import {
  newGame, legalMoves, playMove, gameStatus, kingSquare, colorOf, typeOf,
} from '../chess/rules.js';
import { BoardView } from './board.js';
import { pieceSVG } from './pieces.js';
import { popup } from './popup.js';
import { sfx } from './sound.js';
import { store } from '../storage.js';

const banner = document.getElementById('turn-banner');
const escape = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let board;          // BoardView
let game;           // schackställningen
let opts;           // { mode: 'friend' | 'computer', level, onExit }
let selected = -1;
let lastMove = null;
let arrived = -1;
let busy = false;   // true medan datorn tänker, en pjäs glider eller en popup visas
let paused = false; // true medan "Vill du sluta spela?" visas
let status = { over: false };
let token = 0;      // ökar vid nytt parti, så gamla datordrag ignoreras

// Datorns drag kopplas in i steg 4: (ställning) => Promise<drag>
let computerMove = null;
export function setComputerPlayer(fn) { computerMove = fn; }

export function startGame(options) {
  opts = options;
  token++;
  board ??= new BoardView(document.getElementById('board'), onSquare);
  game = newGame(opts.fen);
  selected = -1; lastMove = null; arrived = -1; busy = false; paused = false;
  status = gameStatus(game);
  update();
}

const humanColor = () => (opts.mode === 'computer' ? 'w' : game.turn);
const style = () => store.settings.pieceStyle;

function onSquare(sq) {
  if (busy || paused || status.over || game.turn !== humanColor()) return;
  const p = game.board[sq];

  if (selected >= 0) {
    const moves = legalMoves(game, selected).filter((m) => m.to === sq);
    if (moves.length) { chooseMove(moves, board.dropped); return; }
    if (sq === selected) { selected = -1; update(); return; }   // tryck igen = släpp pjäsen
  }

  if (p && colorOf(p) === game.turn) {
    selected = sq;
    sfx('select');
    if (legalMoves(game, sq).length === 0) { board.shake(sq); sfx('nope'); }
    update();
    return;
  }

  // Fel ruta: mjuk skakning + ljud, ingen förklarande text
  board.shake(sq);
  sfx('nope');
}

async function chooseMove(moves, dropped) {
  let move = moves[0];
  if (moves.length > 1) {          // flera drag till samma ruta = bondeförvandling
    busy = true;
    const white = game.turn === 'w';
    const choice = await popup('<h2>Vad ska bonden bli?</h2>', ['q', 'r', 'b', 'n'].map((t) => ({
      html: pieceSVG(white ? t.toUpperCase() : t, style()),
      className: 'btn-white promo-btn',
      value: t,
    })));
    busy = false;
    move = moves.find((m) => typeOf(m.promotion) === choice);
  }
  doMove(move, dropped ? 0 : SLIDE_TAP_MS);   // dragen pjäs står redan på plats
}

// Hur länge pjäserna glider till sin nya ruta. Datorns drag går långsamt, så barnet
// hinner se vilken pjäs som flyttade och varifrån.
const SLIDE_COMPUTER_MS = 700;
const SLIDE_TAP_MS = 200;

// Vilka pjäser som rör sig i ett drag (vid rockad flyttar även tornet)
function slidesFor(m) {
  const slides = [{ from: m.from, to: m.to, piece: m.piece }];
  const rook = m.piece === 'K' ? 'R' : 'r';
  if (m.flag === 'castleK') slides.push({ from: m.to + 1, to: m.to - 1, piece: rook });
  if (m.flag === 'castleQ') slides.push({ from: m.to - 2, to: m.to + 1, piece: rook });
  return slides;
}

async function doMove(m, slideMs = 0) {
  selected = -1;
  if (slideMs) {
    busy = true;
    update();                        // ta bort gröna rutor innan pjäsen glider
    const my = token;
    await board.slide(slidesFor(m), slideMs, style());
    if (my !== token) return;        // partiet avslutades medan pjäsen gled
    busy = false;
  }
  playMove(game, m);
  lastMove = m;
  arrived = slideMs ? -1 : m.to;     // "hopp"-effekten behövs bara om pjäsen inte gled dit
  status = gameStatus(game);

  if (status.result === 'checkmate') sfx('mate');
  else if (status.check) sfx('check');
  else if (m.captured) sfx('capture');
  else sfx('move');

  update();
  arrived = -1;

  if (status.over) { setTimeout(showResult, 900); return; }
  if (opts.mode === 'computer' && game.turn !== humanColor()) askComputer();
}

async function askComputer() {
  if (!computerMove) return;
  busy = true;
  renderBanner();
  const my = token;
  const m = await computerMove(game, opts.level);
  if (my !== token) return;          // partiet har avslutats under tiden
  busy = false;
  doMove(m, SLIDE_COMPUTER_MS);
}

// ---------- Vems tur ----------

function update() {
  const hints = selected >= 0 && store.settings.teaching
    ? legalMoves(game, selected).map((m) => ({ to: m.to, capture: !!m.captured }))
    : [];
  board.render(game.board, {
    selected: selected >= 0 ? selected : undefined,
    hints,
    lastMove,
    checkSq: status.check ? kingSquare(game, game.turn) : undefined,
    style: style(),
    arrived,
  });
  renderBanner();
}

function renderBanner() {
  const white = game.turn === 'w';
  const icon = pieceSVG(white ? 'K' : 'k', style());
  let text;
  if (opts.mode === 'computer') {
    text = white ? `Din tur, ${escape(store.name)}!` : `${opts.level.emoji} ${opts.level.name} tänker…`;
  } else {
    text = white ? 'Vit spelar' : 'Svart spelar';
  }
  if (status.check && !status.over) text += ' <span class="check-tag">Schack!</span>';
  banner.className = `turn-banner ${white ? 'turn-white' : 'turn-black'}${busy && !white ? ' thinking' : ''}`;
  banner.innerHTML = `<span class="banner-icon">${icon}</span><span>${text}</span>`;
}

// ---------- Slutet på partiet ----------

async function showResult() {
  let html;
  if (status.result === 'checkmate') {
    const winner = status.winner;
    const kingIcon = `<div class="popup-piece">${pieceSVG(winner === 'w' ? 'K' : 'k', style())}</div>`;
    if (opts.mode === 'computer') {
      if (winner === 'w') {
        store.addWin(opts.level.id);
        sfx('win');
        html = `<div class="popup-emoji">🎉🏆🎉</div><h2>Schackmatt! Du vann!</h2>
          <p class="popup-sub">Du har vunnit ${store.totalWins} ${store.totalWins === 1 ? 'gång' : 'gånger'}!</p>`;
      } else {
        sfx('lose');
        html = `<div class="popup-emoji">${opts.level.emoji}</div><h2>${opts.level.name} vann den här gången</h2>
          <p class="popup-sub">Försök igen – du blir bättre för varje parti!</p>`;
      }
    } else {
      sfx('win');
      html = `${kingIcon}<h2>Schackmatt! ${winner === 'w' ? 'Vit' : 'Svart'} vann! 🎉</h2>`;
    }
  } else {
    sfx('draw');
    const why = {
      stalemate: 'Patt – den som ska spela kan inte flytta.',
      fifty: '50 drag utan att någon tagit en pjäs.',
      repetition: 'Samma ställning tre gånger.',
      material: 'Ingen kan göra schackmatt längre.',
    }[status.result];
    html = `<div class="popup-emoji">🤝</div><h2>Oavgjort!</h2><p class="popup-sub">${why}</p>`;
  }

  busy = true;
  const choice = await popup(html, [
    { html: '🔄 Spela igen', className: 'btn-green', value: 'again' },
    { html: '🏠 Menyn', className: 'btn-blue', value: 'menu' },
  ]);
  if (choice === 'again') startGame(opts); else opts.onExit();
}

export async function confirmExit() {
  if (status.over || !lastMove) { opts.onExit(); return; }
  paused = true;
  const choice = await popup('<div class="popup-emoji">🏠</div><h2>Vill du sluta spela?</h2>', [
    { html: 'Ja, till menyn', className: 'btn-coral', value: true },
    { html: 'Nej, spela vidare', className: 'btn-green', value: false },
  ]);
  paused = false;
  if (choice) { token++; opts.onExit(); }
}
