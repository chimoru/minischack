// Liten "knäpp" i handen när man trycker på knappar.
//
// Android: vanliga vibrations-API:t.
// iPhone (iOS 18+): Safari saknar vibrations-API, men en omkopplare
// (<input type="checkbox" switch>) ger en haptisk knäpp när den trycks. Vi trycker på
// en osynlig sådan. Fungerar bara mitt i ett riktigt tryck, och gör inget på iPad
// (som saknar vibrationsmotor) eller äldre iOS.

export function haptic() {
  try {
    if (navigator.vibrate) { navigator.vibrate(10); return; }
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    label.appendChild(input);
    document.head.appendChild(label);
    label.click();
    label.remove();
  } catch { /* haptik är bara en bonus */ }
}

// Alla knappar i appen (meny, nivåer, inställningar, resultat, popup-rutor)
const TAPPABLE = '.btn, .setting, .style-choice, .profile-chip';

document.addEventListener('click', (e) => {
  if (e.target.closest?.(TAPPABLE)) haptic();
}, { capture: true });
