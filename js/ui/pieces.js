// Pjäserna ritas som SVG direkt i koden – två stilar med samma tydliga siluetter:
//   'classic' – traditionella svart/vita pjäser
//   'kids'    – tecknade pjäser med ansikten, tjocka rundade konturer och guldkronor
// Alla ritas i en ruta på 100×100.

const BASE = '<rect x="24" y="78" width="52" height="11" rx="5"/>';
const BODY = 'M35 78 C39 65 41 58 41 52 L59 52 C59 58 61 65 65 78 Z';
const COLLAR = '<rect x="36" y="47" width="28" height="7" rx="3.5"/>';

// Varje pjästyp: silhuett (delar som fylls med lagets färg), "accent"-delar
// (guld i barnstilen) och var ansiktet sitter i barnstilen.
const SHAPES = {
  p: {
    parts: `${BASE}
      <path d="M36 78 C39 62 43 54 44 46 L56 46 C57 54 61 62 64 78 Z"/>
      <rect x="38" y="42" width="24" height="7" rx="3.5"/>
      <circle cx="50" cy="30" r="14"/>`,
    face: [50, 30, 0.8],
  },
  r: {
    parts: `${BASE}
      <path d="M31 78 L35 42 L65 42 L69 78 Z"/>
      <path d="M28 42 L28 18 L38 18 L38 26 L45 26 L45 18 L55 18 L55 26 L62 26 L62 18 L72 18 L72 42 Z"/>`,
    face: [50, 60, 1],
  },
  n: {
    parts: `${BASE}
      <path d="M33 78 L33 64 C33 56 43 50 45 43 C38 48 30 52 25 48 C20 43 27 36 33 30
               C37 24 41 17 47 15 L50 8 L56 15 C69 19 76 34 73 51 C71 63 68 70 68 78 Z"/>`,
    eye: [48, 27],
  },
  b: {
    parts: `${BASE}<path d="${BODY}"/>${COLLAR}
      <path d="M50 15 C36 26 33 39 39 48 L61 48 C67 39 64 26 50 15 Z"/>
      <circle cx="50" cy="12" r="5"/>`,
    slit: 'M45 28 L55 38',
    face: [50, 36, 0.75],
  },
  q: {
    parts: `${BASE}<path d="${BODY}"/>${COLLAR}
      <path d="M27 28 L37 48 L63 48 L73 28 L61 38 L56 22 L50 36 L44 22 L39 38 Z"/>`,
    accent: `<circle cx="27" cy="26" r="5"/><circle cx="44" cy="20" r="5"/>
      <circle cx="56" cy="20" r="5"/><circle cx="73" cy="26" r="5"/>`,
    face: [50, 65, 0.85],
  },
  k: {
    parts: `${BASE}<path d="${BODY}"/>${COLLAR}
      <path d="M31 34 C40 28 60 28 69 34 L62 48 L38 48 Z"/>`,
    accent: '<rect x="46" y="6" width="8" height="24" rx="2"/><rect x="39" y="12" width="22" height="8" rx="2"/>',
    face: [50, 65, 0.85],
  },
};

const COLORS = {
  classic: {
    w: { fill: '#ffffff', stroke: '#1d1d1d', detail: '#1d1d1d', accent: '#ffffff' },
    b: { fill: '#262626', stroke: '#000000', detail: '#e8e8e8', accent: '#262626' },
    width: 3,
  },
  kids: {
    w: { fill: '#fffaf0', stroke: '#6b4a2b', detail: '#6b4a2b', accent: '#ffc933' },
    b: { fill: '#3d3a7a', stroke: '#1c1a45', detail: '#ffffff', accent: '#ffc933' },
    width: 5,
  },
};

function face([x, y, s], color) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <circle cx="-6" cy="-3" r="3.2" fill="${color}"/>
    <circle cx="6" cy="-3" r="3.2" fill="${color}"/>
    <path d="M-6 4 Q0 10 6 4" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="-10" cy="4" r="2.6" fill="#ff8a8a" opacity="0.7"/>
    <circle cx="10" cy="4" r="2.6" fill="#ff8a8a" opacity="0.7"/>
  </g>`;
}

// Returnerar SVG-kod för en pjäs, t.ex. pieceSVG('Q', 'kids')
export function pieceSVG(piece, style = 'kids') {
  const color = piece === piece.toUpperCase() ? 'w' : 'b';
  const type = piece.toLowerCase();
  const shape = SHAPES[type];
  const pal = COLORS[style] ?? COLORS.kids;
  const c = pal[color];
  const kids = style === 'kids';

  let extra = '';
  if (shape.accent) {
    extra += `<g fill="${c.accent}" stroke="${c.stroke}" stroke-width="${pal.width - 1}">${shape.accent}</g>`;
  }
  if (shape.eye) {
    const [x, y] = shape.eye;
    extra += kids
      ? `<circle cx="${x}" cy="${y}" r="4.5" fill="#fff" stroke="${c.stroke}" stroke-width="2"/>
         <circle cx="${x + 1}" cy="${y}" r="2.2" fill="#1c1a45"/>
         <path d="M58 44 Q63 47 67 43" fill="none" stroke="${c.detail}" stroke-width="2.5" stroke-linecap="round"/>`
      : `<circle cx="${x}" cy="${y}" r="3" fill="${c.detail}"/>`;
  }
  if (shape.slit && !kids) {
    extra += `<path d="${shape.slit}" stroke="${c.detail}" stroke-width="3" stroke-linecap="round"/>`;
  }
  if (kids && shape.face) extra += face(shape.face, c.detail);

  return `<svg class="piece" viewBox="0 0 100 100" aria-hidden="true">
    <g fill="${c.fill}" stroke="${c.stroke}" stroke-width="${pal.width}"
       stroke-linejoin="round" stroke-linecap="round">${shape.parts}</g>${extra}</svg>`;
}

export const PIECE_NAMES = { p: 'Bonde', n: 'Springare', b: 'Löpare', r: 'Torn', q: 'Dam', k: 'Kung' };
