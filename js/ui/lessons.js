// "Lär dig spela" → Reglerna. Varje regel har:
//   – ett litet bräde som spelar upp regeln av sig själv (demo)
//   – några korta meningar, skrivna för 6–7-åringar
//   – "Prova själv!": en uppgift på brädet (utom för regler som bara visas)
import {
  newGame, legalMoves, playMove, gameStatus, inCheck, kingSquare, colorOf, typeOf,
} from '../chess/rules.js';
import { RULES, VALUES, findMove, fenOf } from './lesson-data.js';
import { BoardView, slidesFor } from './board.js';
import { pieceSVG } from './pieces.js';
import { icon } from './icons.js';
import { popup } from './popup.js';
import { sfx } from './sound.js';
import { store } from '../storage.js';

const content = document.getElementById('learn-content');
const title = document.getElementById('learn-title');
const style = () => store.settings.pieceStyle;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let view = 'list';        // 'list' | 'rule'
let rule = null;          // regeln som visas
let board = null;
let state = null;         // schackställningen på regelbrädet
let lastMove = null;
let selected = -1;
let mode = 'demo';        // 'demo' (spelas upp) | 'task' (barnet gör draget) | 'done'
let busy = false;
let movesMade = 0;
let token = 0;            // ökar när man byter sida, så gamla uppspelningar avbryts


// ---------- Listan med regler ----------

export function showRules() {
  view = 'list';
  token++;
  rule = null;
  title.textContent = 'Reglerna';
  const done = RULES.filter((r) => store.learnedRules.includes(r.id)).length;
  content.innerHTML = `
    <div class="learn-picker">
      <p class="learn-intro">Vilken regel vill du lära dig?</p>
      ${done ? `<p class="learn-progress">Du kan ${done} av ${RULES.length} regler ${icon(done === RULES.length ? 'trophy' : 'star', 'icon-inline')}</p>` : ''}
      <div class="rule-list">
        ${RULES.map((r, i) => `
          <button class="rule-card card${r.hard ? ' hard' : ''}" type="button" data-rule="${r.id}">
            <span class="rule-num">${i + 1}</span>
            <span class="rule-icon">${icon(r.icon)}</span>
            <span class="rule-name">${r.title}</span>
            ${store.learnedRules.includes(r.id) ? `<span class="rule-check" aria-label="Klar">${icon('check')}</span>` : ''}
          </button>`).join('')}
      </div>
    </div>`;
}

// Tillbaka-knappen: från en regel till listan. Returnerar false när listan redan visas.
export function rulesBack() {
  if (view === 'rule') { showRules(); return true; }
  token++;
  return false;
}

content.addEventListener('click', (e) => {
  const id = e.target.closest('[data-rule]')?.dataset.rule;
  if (id) { showRule(RULES.find((r) => r.id === id)); return; }
  const action = e.target.closest('[data-lesson]')?.dataset.lesson;
  if (action === 'replay') playDemo();
  if (action === 'try') startTask();
});

// ---------- En regel ----------

function showRule(r) {
  view = 'rule';
  rule = r;
  sfx('select');
  title.textContent = r.title;
  if (r.values) { showValues(r); return; }
  content.innerHTML = `
    <div class="learn-top card rule-text">
      <span class="rule-icon">${icon(r.icon)}</span>
      <p class="learn-tip" id="rule-text">${r.text}</p>
    </div>
    <div class="board-wrap"><div class="board learn-board" id="rule-board"></div></div>
    <div class="rule-buttons">
      <button class="btn btn-blue btn-with-icon" type="button" data-lesson="replay">${icon('again', 'icon-inline')} Visa igen</button>
      ${r.task ? `<button class="btn btn-green btn-with-icon" type="button" data-lesson="try">${icon('play', 'icon-inline')} Prova själv!</button>` : ''}
    </div>`;
  board = new BoardView(document.getElementById('rule-board'), onSquare);
  playDemo();
}

// Spela upp regeln: pjäserna flyttar av sig själva
async function playDemo() {
  const my = ++token;
  mode = 'demo';
  selected = -1;
  document.getElementById('rule-text').innerHTML = rule.text;
  state = newGame(fenOf(rule.demo.fen));
  lastMove = null;
  render();
  await sleep(900);
  for (const uci of rule.demo.moves) {
    if (my !== token) return;
    const m = findMove(state, uci);
    await board.slide(slidesFor(m), 650, style());
    if (my !== token) return;
    playMove(state, m);
    lastMove = m;
    sfx(inCheck(state) ? 'check' : m.captured ? 'capture' : 'move');
    render();
    await sleep(800);
  }
  if (my !== token) return;
  if (!rule.task) {                               // regler utan uppgift räknas som klara när man sett dem
    const st = gameStatus(state);
    if (st.result === 'stalemate') sfx('draw');
    store.addLearnedRule(rule.id);
  }
}

function startTask() {
  token++;
  mode = 'task';
  movesMade = 0;
  selected = -1;
  state = newGame(fenOf(rule.task.fen));
  lastMove = null;
  document.getElementById('rule-text').innerHTML = `<strong>${rule.task.prompt}</strong>`;
  sfx('select');
  render();
}

function render() {
  const hints = mode === 'task' && selected >= 0
    ? legalMoves(state, selected).map((m) => ({ to: m.to, capture: !!m.captured }))
    : [];
  board.render(state.board, {
    selected: selected >= 0 ? selected : undefined,
    hints,
    lastMove,
    checkSq: inCheck(state) ? kingSquare(state, state.turn) : undefined,
    style: style(),
  });
}

// Barnet gör sitt drag i uppgiften
async function onSquare(sq) {
  if (mode !== 'task' || busy) return;
  const p = state.board[sq];
  if (selected >= 0) {
    const moves = legalMoves(state, selected).filter((m) => m.to === sq);
    if (moves.length) { await tryMove(moves); return; }
    if (sq === selected) { selected = -1; render(); return; }
  }
  if (p && colorOf(p) === state.turn) {
    selected = sq;
    sfx('select');
    if (!legalMoves(state, sq).length) { board.shake(sq); sfx('nope'); }
    render();
    return;
  }
  board.shake(sq);
  sfx('nope');
}

async function tryMove(moves) {
  let m = moves[0];
  const dropped = board.dropped;
  busy = true;
  if (moves.length > 1) {                          // bondeförvandling: välj pjäs
    const white = state.turn === 'w';
    const choice = await popup('<h2>Vad ska bonden bli?</h2>', ['q', 'r', 'b', 'n'].map((t) => ({
      html: pieceSVG(white ? t.toUpperCase() : t, style()), className: 'btn-white promo-btn', value: t,
    })));
    m = moves.find((x) => typeOf(x.promotion) === choice);
  }
  const my = token;
  selected = -1;
  render();
  await board.slide(slidesFor(m), dropped ? 0 : 250, style());
  if (my !== token) { busy = false; return; }
  playMove(state, m);
  lastMove = m;
  movesMade++;
  sfx(m.captured ? 'capture' : 'move');
  render();

  if (rule.task.check(m, state)) { busy = false; await success(); return; }

  // Bonden behöver flera drag fram – låt barnet fortsätta (svart "står still" under tiden)
  if (rule.task.needMoves && typeOf(m.piece) === 'p' && !m.promotion) {
    state.turn = 'w';
    busy = false;
    return;
  }

  // Ett lagligt drag, men inte det uppgiften gällde: börja om uppgiften
  await sleep(500);
  sfx('nope');
  document.getElementById('rule-text').innerHTML = `<strong>Nästan! Försök igen.</strong> ${rule.task.prompt}`;
  await sleep(900);
  if (my !== token) { busy = false; return; }
  state = newGame(fenOf(rule.task.fen));
  lastMove = null;
  movesMade = 0;
  busy = false;
  render();
}

async function success() {
  mode = 'done';
  store.addLearnedRule(rule.id);
  sfx('star');
  await sleep(500);
  sfx('win');
  const index = RULES.indexOf(rule);
  const next = RULES[index + 1];
  const choice = await popup(
    `<div class="popup-icon">${icon('celebrate')}</div>
     <h2>Bra jobbat!</h2><p class="popup-sub">Nu kan du regeln "${rule.title}"!</p>`,
    [
      ...(next ? [{ html: `${icon('play', 'icon-inline')} Nästa regel`, className: 'btn-green', value: 'next' }] : []),
      { html: `${icon('book', 'icon-inline')} Alla regler`, className: 'btn-blue', value: 'list' },
    ],
  );
  if (choice === 'next') showRule(next); else showRules();
}

// ---------- Pjäsernas värde (ingen bräde) ----------

function showValues(r) {
  content.innerHTML = `
    <div class="learn-top card rule-text">
      <span class="rule-icon">${icon(r.icon)}</span>
      <p class="learn-tip">${r.text}</p>
    </div>
    <div class="values-list card">
      ${VALUES.map(([p, n, name]) => `
        <div class="value-row">
          <span class="value-piece">${pieceSVG(p, style())}</span>
          <span class="value-name">${name}</span>
          <span class="value-dots" aria-label="${n} poäng">${'<span class="dot"></span>'.repeat(n)}</span>
        </div>`).join('')}
      <div class="value-row king-row">
        <span class="value-piece">${pieceSVG('K', style())}</span>
        <span class="value-name">Kung</span>
        <span class="value-king">Ovärderlig – den kan aldrig tas!</span>
      </div>
    </div>`;
  store.addLearnedRule(r.id);
}
