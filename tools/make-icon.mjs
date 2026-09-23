// Ritar appikonen (icons/icon.svg): den glada springaren från spelet på fyra stora
// schackrutor. Få och stora former, så den syns tydligt även i hemskärmsstorlek.
//
// Kör:   node tools/make-icon.mjs
// Sedan PNG-filerna (macOS):
//   cd icons && qlmanage -t -s 512 -o . icon.svg && mv icon.svg.png icon-512.png
//   sips -z 192 192 icon-512.png --out icon-192.png
//   sips -z 180 180 icon-512.png --out apple-touch-icon.png
import { writeFileSync } from 'node:fs';
import { pieceSVG } from '../js/ui/pieces.js';

const knight = pieceSVG('N', 'kids')
  .replace(/^<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '');

const LIGHT = '#f0d9b5';
const DARK = '#b58863';
const size = 420;                 // springarens storlek i ikonen (av 512)

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<rect width="256" height="256" fill="${LIGHT}"/>
<rect x="256" width="256" height="256" fill="${DARK}"/>
<rect y="256" width="256" height="256" fill="${DARK}"/>
<rect x="256" y="256" width="256" height="256" fill="${LIGHT}"/>
<ellipse cx="256" cy="450" rx="150" ry="24" fill="#000" opacity="0.12"/>
<g transform="translate(${262 - size / 2} ${262 - size / 2}) scale(${size / 100})">${knight}</g>
</svg>
`;
writeFileSync(new URL('../icons/icon.svg', import.meta.url), svg);
console.log('icons/icon.svg skapad');
