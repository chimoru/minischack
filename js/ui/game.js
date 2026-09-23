// Styr ett parti: turordning, val av pjäs, drag, förvandling och slutet.
import {
  newGame, legalMoves, playMove, gameStatus, kingSquare, colorOf, typeOf,
} from '../chess/rules.js';
import { BoardView } from './board.js';
import { pieceSVG } from './pieces.js';
import { popup } from './popup.js';
import { sfx } from './sound.js';
import { store } from '../storage.js';

const banner = document.getElementById('turn-banner');           // vit / den som spelar mot datorn
const bannerTop = document.getElementById('turn-banner-top');    // svart i kompisläget (upp och ner)
const screenEl = document.getElementById('screen-game');
const resultBar = document.getElementById('result-bar');
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
  resultBar.hidden = true;
  // Mot en kompis sitter man mitt emot varandra: en banderoll vänd mot vardera spelaren
  screenEl.classList.toggle('friend-mode', opts.mode === 'friend');
  board.setFlipBlack(opts.mode === 'friend');
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
    })), { flipped: opts.mode === 'friend' && !white });   // svart läser rutan från sitt håll
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

  if (status.over) { setTimeout(showResult, 600); return; }
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

// Etikett för specialdrag, så man förstår vad som hände
function moveTag(m) {
  if (m?.flag === 'castleK' || m?.flag === 'castleQ') return '<span class="move-tag">Rockad! 🏰</span>';
  if (m?.flag === 'ep') return '<span class="move-tag">En passant!</span>';
  return '';
}

// Kompisläget: varje spelare har sin egen banderoll. Den som är på tur lyser,
// den andra är nedtonad. Schack visas hos den som står i schack, och ett specialdrag
// (rockad, en passant) visas hos den som just gjorde det.
function renderFriendBanners() {
  for (const color of ['w', 'b']) {
    const el = color === 'w' ? banner : bannerTop;
    const active = game.turn === color;
    const justMoved = lastMove && colorOf(lastMove.piece) === color;
    let text;
    if (active) {
      text = 'Din tur!';
      if (status.check) text += ' <span class="check-tag">Schack!</span>';
    } else {
      text = (justMoved && moveTag(lastMove)) || 'Vänta…';
    }
    el.className = `turn-banner ${color === 'w' ? 'turn-white' : 'turn-black'}${active ? '' : ' waiting'}`;
    el.innerHTML = `<span class="banner-icon">${pieceSVG(color === 'w' ? 'K' : 'k', style())}</span><span>${text}</span>`;
  }
}

function renderBanner() {
  if (opts.mode === 'friend') { renderFriendBanners(); return; }
  const white = game.turn === 'w';
  const icon = pieceSVG(white ? 'K' : 'k', style());
  let text;
  if (opts.mode === 'computer') {
    text = white ? `Din tur, ${escape(store.name)}!` : `${opts.level.emoji} ${opts.level.name} tänker…`;
  } else {
    text = white ? 'Vit spelar' : 'Svart spelar';
  }
  const tag = moveTag(lastMove);
  if (tag) text += ` ${tag}`;
  if (status.check && !status.over) text += ' <span class="check-tag">Schack!</span>';
  banner.className = `turn-banner ${white ? 'turn-white' : 'turn-black'}${busy && !white ? ' thinking' : ''}`;
  banner.innerHTML = `<span class="banner-icon">${icon}</span><span>${text}</span>`;
}

// ---------- Slutet på partiet ----------
// Resultatet visas UNDER brädet (inte i en popup framför), så man ser hur partiet slutade.


// Varför det blev oavgjort – med ord som ett barn förstår
const DRAW_REASON = {
  stalemate: 'Patt! Den som skulle spela kunde inte flytta någon pjäs – men stod inte i schack.',
  fifty: 'Ingen har tagit en pjäs eller flyttat en bonde på 50 drag.',
  repetition: 'Samma ställning kom tillbaka tre gånger.',
  material: 'Det finns för få pjäser kvar för att någon ska kunna göra schackmatt.',
};

function showResult() {
  let emoji, title, sub = '';
  if (status.result === 'checkmate') {
    const winner = status.winner;
    if (opts.mode === 'computer') {
      if (winner === 'w') {
        store.addWin(opts.level.id);
        sfx('win');
        emoji = '🎉🏆🎉';
        title = 'Schackmatt! Du vann!';
        sub = `Du har vunnit ${store.totalWins} ${store.totalWins === 1 ? 'gång' : 'gånger'}!`;
      } else {
        sfx('lose');
        emoji = opts.level.emoji;
        title = `Schackmatt – ${opts.level.name} vann`;
        sub = 'Titta på brädet och se hur det gick. Försök igen!';
      }
    } else {
      sfx('win');
      emoji = '🎉';
      title = `Schackmatt! ${winner === 'w' ? 'Vit' : 'Svart'} vann!`;
      sub = '';
    }
  } else {
    sfx('draw');
    emoji = '🤝';
    title = 'Oavgjort!';
    sub = DRAW_REASON[status.result];
  }

  // Banderollen visar också resultatet – i kompisläget från varje spelares håll
  if (opts.mode === 'friend') {
    for (const color of ['w', 'b']) {
      const el = color === 'w' ? banner : bannerTop;
      const won = status.winner === color;
      const text = !status.winner ? '🤝 Oavgjort!' : won ? '🎉 Du vann!' : 'Schackmatt! Bra kämpat 💪';
      el.className = `turn-banner ${won || !status.winner ? 'turn-over' : 'turn-lost'}`;
      el.innerHTML = `<span>${text}</span>`;
    }
  } else {
    banner.className = 'turn-banner turn-over';
    banner.innerHTML = `<span>${emoji} ${title}</span>`;
  }

  resultBar.innerHTML = `
    ${sub ? `<p class="result-sub">${sub}</p>` : ''}
    <div class="result-buttons">
      <button class="btn btn-green" type="button" data-result="again">🔄 Spela igen</button>
      <button class="btn btn-blue" type="button" data-result="menu">🏠 Menyn</button>
    </div>`;
  resultBar.hidden = false;
  resultBar.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

resultBar.addEventListener('click', (e) => {
  const choice = e.target.closest('[data-result]')?.dataset.result;
  if (!choice) return;
  resultBar.hidden = true;
  if (choice === 'again') startGame(opts); else opts.onExit();
});

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
