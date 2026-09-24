// Startpunkten: växlar mellan skärmarna och kopplar ihop menyn.
import { store } from './storage.js';
import { startGame, confirmExit, setComputerPlayer } from './ui/game.js';
import { computerMove } from './ui/computer.js';
import { renderSettings } from './ui/settings.js';
import { initLearn, showPicker } from './ui/learn.js';
import { icon } from './ui/icons.js';
import { pieceSVG } from './ui/pieces.js';

// Fyll alla platshållare <… data-icon="namn"> i index.html med rätt ikon
for (const el of document.querySelectorAll('[data-icon]')) {
  el.innerHTML = el.dataset.icon === 'knight' ? pieceSVG('N', 'kids') : icon(el.dataset.icon);
}

export const LEVELS = [
  { id: 'chick', emoji: '🐣', name: 'Kyckling', hint: 'Jättelätt', color: 'btn-yellow' },
  { id: 'bunny', emoji: '🐰', name: 'Kanin', hint: 'Lätt', color: 'btn-green' },
  { id: 'fox', emoji: '🦊', name: 'Räv', hint: 'Lite svår', color: 'btn-coral' },
  { id: 'owl', emoji: '🦉', name: 'Uggla', hint: 'Svår', color: 'btn-purple' },
];

const screens = ['name', 'menu', 'levels', 'game', 'learn', 'settings'];

let current = null;
let updateWaiting = false;   // en ny version har installerats – ladda om när det passar

export function show(name) {
  current = name;
  if (updateWaiting && name === 'menu') { location.reload(); return; }
  for (const s of screens) {
    document.getElementById(`screen-${s}`).hidden = s !== name;
  }
  if (name === 'menu') renderMenu();
  if (name === 'settings') renderSettings();
  if (name === 'levels') renderLevels();
  if (name === 'learn') showPicker();
  window.scrollTo(0, 0);
}

// ---------- Namn ----------
const nameForm = document.getElementById('name-form');
const nameInput = document.getElementById('name-input');

nameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }
  store.name = name;
  nameInput.blur();
  show('menu');
});

document.getElementById('profile-chip').addEventListener('click', () => {
  nameInput.value = store.name;
  show('name');
  nameInput.focus();
});

// ---------- Meny ----------
// Hur många vinster som visades förra gången – så nya vinster kan firas med ett skutt
let shownWins = null;

function renderMenu() {
  document.getElementById('profile-name').textContent = store.name;
  document.getElementById('learn-button').hidden = !store.settings.teaching;

  const total = store.totalWins;
  const text = total === 0
    ? 'Vinn mot datorn och samla djurmärken!'
    : `Du har vunnit ${total} ${total === 1 ? 'gång' : 'gånger'}!`;
  const badges = LEVELS.map((l) => {
    const n = store.wins[l.id];
    const isNew = shownWins && n > shownWins[l.id];
    return `<span class="badge ${n ? '' : 'locked'} ${isNew ? 'new' : ''}">
        <span class="badge-emoji">${l.emoji}</span>
        <span class="badge-count">${n ? `×${n}` : ''}</span>
      </span>`;
  }).join('');
  const cheer = shownWins && total > Object.values(shownWins).reduce((a, b) => a + b, 0);
  shownWins = { ...store.wins };

  document.getElementById('trophy').innerHTML = `
    <div class="trophy-cup ${cheer ? 'cheer' : ''}" aria-hidden="true">${icon(total ? 'trophy' : 'star')}</div>
    <div>
      <div class="trophy-text">${text}</div>
      <div class="trophy-badges">${badges}</div>
    </div>`;
}

function renderLevels() {
  document.getElementById('level-grid').innerHTML = LEVELS.map((l) => `
    <button class="btn btn-big ${l.color}" data-level="${l.id}">
      <span class="btn-icon" aria-hidden="true">${l.emoji}</span>${l.name}
      <small>${l.hint}</small>
      ${store.wins[l.id] ? `<span class="level-wins">${icon('trophy', 'icon-inline')} ${store.wins[l.id]}</span>` : ''}
    </button>`).join('');
}

// Alla knappar med data-go="..." byter skärm
document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]')?.dataset.go;
  if (!go) return;
  if (go === 'friend') { play({ mode: 'friend' }); return; }
  show(go);
});

document.getElementById('level-grid').addEventListener('click', (e) => {
  const id = e.target.closest('[data-level]')?.dataset.level;
  if (id) play({ mode: 'computer', level: LEVELS.find((l) => l.id === id) });
});

function play(options) {
  show('game');
  startGame({ ...options, onExit: () => show('menu') });
}

document.getElementById('game-back').addEventListener('click', confirmExit);

// ---------- Offline (service worker) ----------
// Sparar appen på enheten. Kommer en ny version laddas sidan om – men aldrig mitt i ett
// parti: då väntar vi tills man är tillbaka i menyn.
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => { /* appen fungerar ändå, bara inte offline */ });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;               // första installationen – inget att uppdatera
    if (current === 'menu' || current === 'name') location.reload();
    else updateWaiting = true;
  });
}

// ---------- Vänd telefonen ----------
// När en mobil vänds upprätt igen: börja alltid från toppen av sidan. Annars kan
// iPhone stå kvar nedscrollad så att översta raden hamnar bakom klockan.
// (Samma villkor som för "Vänd telefonen"-bilden i style.css.)
const lyingPhone = matchMedia('(orientation: landscape) and (max-height: 500px)');
// Scrolla bara om sidan faktiskt hamnat fel – annars syns ett onödigt ryck.
const backToTop = () => { if (window.scrollY !== 0) window.scrollTo(0, 0); };
lyingPhone.addEventListener('change', (e) => {
  if (e.matches) return;
  backToTop();
  setTimeout(backToTop, 400);   // iOS gör klart vridningen efter en liten stund
});

// ---------- Start ----------
setComputerPlayer(computerMove);
initLearn(() => show('menu'));
show(store.name ? 'menu' : 'name');
