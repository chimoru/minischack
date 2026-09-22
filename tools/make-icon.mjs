// Ritar appikonen (icons/icon.svg) med samma tecknade springare som i spelet.
// Kör med:  node tools/make-icon.mjs   – och gör sedan PNG-filer, se README-kommentaren nedan.
import { writeFileSync } from 'node:fs';
import { pieceSVG } from '../js/ui/pieces.js';

const knight = pieceSVG('N', 'kids')
  .replace('<svg class="piece" viewBox="0 0 100 100" aria-hidden="true">', '')
  .replace(/<\/svg>\s*$/, '');

let squares = '';
for (let r = 0; r < 4; r++) {
  for (let c = 0; c < 4; c++) {
    squares += `<rect x="${130 + c * 63}" y="${150 + r * 63}" width="63" height="63" fill="${(r + c) % 2 ? '#b58863' : '#f0d9b5'}"/>`;
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#ffd34d"/>
<circle cx="256" cy="256" r="230" fill="#ffe27a"/>
<rect x="118" y="138" width="276" height="276" rx="26" fill="#7b5234"/>
<g>${squares}</g>
<g transform="translate(96 40) scale(3.2)">${knight}</g>
</svg>
`;
writeFileSync(new URL('../icons/icon.svg', import.meta.url), svg);
console.log('icons/icon.svg skapad');
