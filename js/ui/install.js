// "Spara MiniSchack på hemskärmen": en ruta som glider upp på mobiler och surfplattor
// och visar hur man installerar appen. Visas aldrig på datorer eller om appen redan
// är installerad.
//
//   Android (Chrome m.fl.): webbläsaren låter oss visa en riktig "Installera"-knapp.
//   iPhone/iPad: Apple tillåter inte det – då visar vi stegen med Dela-knappen.
//   Inbyggda webbläsare (Messenger, Instagram …): kan inte installera alls – då ber vi
//   om att först öppna sidan i Safari/Chrome.
//
// För test i förhandsvisningen: lägg till ?install=ios | ipad | android | inapp i adressen.
import { icon } from './icons.js';
import { sfx } from './sound.js';

const KEY = 'minischack.install';     // { snoozedUntil, never }
const SNOOZE_DAYS = 3;

const ua = navigator.userAgent;
const forced = new URLSearchParams(location.search).get('install');
const touchMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;     // iPad utger sig för att vara en Mac
const platform = forced ?? (
  /FBAN|FBAV|FB_IAB|Instagram|Messenger|Snapchat|TikTok|Line\//i.test(ua) ? 'inapp'
    : /iPad/.test(ua) || touchMac ? 'ipad'
      : /iPhone|iPod/.test(ua) ? 'ios'
        : /Android/.test(ua) ? 'android'
          : 'desktop');
const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// Android/Chrome: spara webbläsarens installationsruta så vi kan visa den när barnet/föräldern trycker
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
window.addEventListener('appinstalled', () => { hide(); remember({ never: true }); });

function load() { try { return JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch { return {}; } }
function remember(obj) { try { localStorage.setItem(KEY, JSON.stringify({ ...load(), ...obj })); } catch { /* ok */ } }

// Går det att installera härifrån? (mobil/surfplatta, och inte redan installerad)
export const canInstall = () => platform !== 'desktop' && !installed();

// Visa rutan automatiskt – om den inte är bortklickad för tillfället eller för alltid
export function maybeShowInstallHint() {
  if (!canInstall() || shown) return;
  const saved = load();
  if (!forced && (saved.never || (saved.snoozedUntil && Date.now() < saved.snoozedUntil))) return;
  setTimeout(() => showInstallHint(), 1200);
}

let sheet = null;
let shown = false;

function steps() {
  const i = (name) => `<span class="step-icon">${icon(name)}</span>`;
  if (platform === 'inapp') {
    return `<ol class="install-steps">
      <li>${i('moreDots')}<span>Tryck på <b>⋯</b> eller <b>Dela</b> här i appen du är i.</span></li>
      <li>${i('share')}<span>Välj <b>Öppna i Safari</b> (iPhone) eller <b>Öppna i Chrome</b> (Android).</span></li>
      <li>${i('addHome')}<span>Där visar vi hur du sparar spelet på hemskärmen.</span></li>
    </ol>`;
  }
  if (platform === 'android') {
    if (deferredPrompt) return '';                     // riktig installera-knapp i stället
    return `<ol class="install-steps">
      <li>${i('menuDots')}<span>Tryck på <b>⋮</b> uppe till höger i webbläsaren.</span></li>
      <li>${i('addHome')}<span>Välj <b>Installera app</b> eller <b>Lägg till på startskärmen</b>.</span></li>
    </ol>`;
  }
  const where = platform === 'ipad' ? 'uppe till höger' : 'längst ner';
  return `<ol class="install-steps">
    <li>${i('share')}<span>Tryck på <b>Dela</b> ${where}. Ser du den inte? Tryck först på <b>⋯</b>.</span></li>
    <li>${i('addHome')}<span>Välj <b>Lägg till på hemskärmen</b>. (Scrolla ner om du inte ser det.)</span></li>
    <li>${i('check')}<span>Tryck på <b>Lägg till</b>. Klart!</span></li>
  </ol>`;
}

export function showInstallHint() {
  if (shown) return;
  shown = true;
  const inApp = platform === 'inapp';
  sheet = document.createElement('div');
  sheet.className = 'install-backdrop';
  sheet.innerHTML = `
    <div class="install-sheet card" role="dialog" aria-label="Spara MiniSchack på hemskärmen">
      <div class="install-head">
        <img src="icons/icon-192.png" alt="" class="install-app-icon">
        <div>
          <h2>${inApp ? 'Öppna i din webbläsare' : 'Spara MiniSchack på hemskärmen!'}</h2>
          <p class="install-sub">${inApp
            ? 'Här inne går det inte att spara spelet på hemskärmen.'
            : 'Då öppnas spelet som en riktig app – och fungerar även utan internet.'}</p>
        </div>
      </div>
      ${steps()}
      <div class="install-buttons">
        ${platform === 'android' && deferredPrompt
          ? `<button class="btn btn-green btn-with-icon" type="button" data-install="go">${icon('addHome', 'icon-inline')} Installera</button>` : ''}
        <button class="btn ${platform === 'android' && deferredPrompt ? 'btn-white' : 'btn-green'}" type="button" data-install="later">${platform === 'android' && deferredPrompt ? 'Inte nu' : 'Okej, jag förstår!'}</button>
      </div>
      <button class="install-never" type="button" data-install="never">Visa inte igen</button>
    </div>`;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.classList.add('open'));

  sheet.addEventListener('click', async (e) => {
    const action = e.target.closest('[data-install]')?.dataset.install;
    if (e.target === sheet) { snooze(); return; }        // tryck utanför rutan = inte nu
    if (!action) return;
    sfx('select');
    if (action === 'go' && deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice.catch(() => ({}));
      deferredPrompt = null;
      if (outcome === 'accepted') remember({ never: true });
      else remember({ snoozedUntil: Date.now() + SNOOZE_DAYS * 864e5 });
      hide();
    } else if (action === 'never') {
      remember({ never: true });
      hide();
    } else {
      snooze();
    }
  });
}

function snooze() {
  remember({ snoozedUntil: Date.now() + SNOOZE_DAYS * 864e5 });
  hide();
}

function hide() {
  if (!sheet) return;
  const el = sheet;
  sheet = null;
  shown = false;
  el.classList.remove('open');
  setTimeout(() => el.remove(), 300);
}
