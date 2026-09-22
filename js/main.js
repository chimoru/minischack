// Startpunkten: växlar mellan skärmarna och kopplar ihop menyn.
import { store } from './storage.js';
import { startGame, confirmExit, setComputerPlayer } from './ui/game.js';
import { computerMove } from './ui/computer.js';
import { renderSettings } from './ui/settings.js';

export const LEVELS = [
  { id: 'chick', emoji: '🐣', name: 'Kyckling', hint: 'Jättelätt', color: 'btn-yellow' },
  { id: 'bunny', emoji: '🐰', name: 'Kanin', hint: 'Lätt', color: 'btn-green' },
  { id: 'fox', emoji: '🦊', name: 'Räv', hint: 'Lite svår', color: 'btn-coral' },
  { id: 'owl', emoji: '🦉', name: 'Uggla', hint: 'Svår', color: 'btn-purple' },
];

const screens = ['name', 'menu', 'levels', 'game', 'learn', 'settings'];

export function show(name) {
  for (const s of screens) {
    document.getElementById(`screen-${s}`).hidden = s !== name;
  }
  if (name === 'menu') renderMenu();
  if (name === 'settings') renderSettings();
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
function renderMenu() {
  document.getElementById('profile-name').textContent = store.name;
  document.getElementById('learn-button').hidden = !store.settings.teaching;

  const total = store.totalWins;
  const text = total === 0
    ? 'Vinn mot datorn och samla märken!'
    : `Du har vunnit ${total} ${total === 1 ? 'gång' : 'gånger'}!`;
  const badges = LEVELS.map((l) =>
    `<span class="${store.wins[l.id] ? '' : 'locked'}" title="${l.name}">${l.emoji}</span>`
  ).join(' ');

  document.getElementById('trophy').innerHTML = `
    <div class="trophy-cup" aria-hidden="true">🏆</div>
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

// ---------- Start ----------
setComputerPlayer(computerMove);
renderLevels();
show(store.name ? 'menu' : 'name');
