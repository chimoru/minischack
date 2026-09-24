// Inställningssidan: ljud, pedagogiskt stöd och pjässtil. Sparas direkt när man trycker.
import { store } from '../storage.js';
import { pieceSVG } from './pieces.js';
import { icon } from './icons.js';
import { canInstall, showInstallHint } from './install.js';
import { sfx } from './sound.js';

const el = document.getElementById('settings-content');

function toggle(key, iconHtml, title, subtitle) {
  const on = store.settings[key];
  return `
    <button class="setting card" type="button" data-toggle="${key}" aria-pressed="${on}">
      <span class="setting-icon" aria-hidden="true">${iconHtml}</span>
      <span class="setting-text"><strong>${title}</strong><small>${subtitle}</small></span>
      <span class="switch ${on ? 'on' : ''}" aria-hidden="true"><span></span></span>
    </button>`;
}

export function renderSettings() {
  const style = store.settings.pieceStyle;
  const styleButton = (id, label) => `
    <button class="style-choice ${style === id ? 'chosen' : ''}" type="button" data-style="${id}"
            aria-pressed="${style === id}">
      <span class="style-pieces">${pieceSVG('N', id)}${pieceSVG('q', id)}</span>
      <span>${label}</span>
    </button>`;

  el.innerHTML = `
    <div class="settings-list">
      ${toggle('sound', icon(store.settings.sound ? 'soundOn' : 'soundOff'), 'Ljud', 'Ljud när pjäserna flyttas')}
      ${toggle('teaching', icon('learn'), 'Hjälp att lära', 'Gröna rutor visar vart pjäsen kan gå, och "Lär dig spela" finns i menyn')}
      <div class="card">
        <div class="setting-text"><strong>${icon('palette', 'icon-inline')} Pjäser</strong><small>Välj hur pjäserna ser ut</small></div>
        <div class="style-row">
          ${styleButton('kids', 'Tecknade')}
          ${styleButton('classic', 'Klassiska')}
        </div>
      </div>
      ${canInstall() ? `
      <button class="setting card" type="button" data-install-open>
        <span class="setting-icon" aria-hidden="true">${icon('addHome')}</span>
        <span class="setting-text"><strong>Spara på hemskärmen</strong><small>Så öppnas spelet som en app, även utan internet</small></span>
      </button>` : ''}
      <p class="about">MiniSchack · version 1<br><small>Typsnitt: Nunito (SIL Open Font License)</small></p>
    </div>`;
}

el.addEventListener('click', (e) => {
  if (e.target.closest('[data-install-open]')) { sfx('select'); showInstallHint(); return; }
  const key = e.target.closest('[data-toggle]')?.dataset.toggle;
  if (key) {
    store.setSetting(key, !store.settings[key]);
    renderSettings();
    sfx('select');
    return;
  }
  const style = e.target.closest('[data-style]')?.dataset.style;
  if (style) {
    store.setSetting('pieceStyle', style);
    renderSettings();
    sfx('move');
  }
});
