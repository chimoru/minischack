// Appens egna ikoner (i stället för emojis), ritade som SVG i en ruta på 64×64.
//
// Varje ikon består av delar:
//   { d | c | r, fill: 'färg' }  – en fylld form (path, cirkel [cx,cy,r] eller rektangel [x,y,w,h,rx])
//   { line: 'M…', color }        – en linje/pil (bara streck)
//   { dot: [cx,cy,r] }           – en liten mörk detalj, t.ex. ögon
//   plain: true                  – fylld form utan egen kontur (smälter in i formen under)
//   outline: true                – bara konturen av en form (ritas ovanpå)
// Samma former kan ritas i olika stilar (se STYLES), så alla ikoner hör ihop.

const C = {
  ink: '#4a3424', white: '#ffffff', cream: '#fff6df', gold: '#ffc933', coral: '#ff7a6b',
  blue: '#4fa8ff', green: '#4cc38a', purple: '#a77bf3', dark: '#3d3a7a', brown: '#9a6a44',
  pink: '#ff9d9d', grey: '#e3e8f2', orange: '#ff9447', owl: '#b08a6a', owlDark: '#7a5a42',
};

// Enkel bonde (används av flera ikoner)
const pawn = (x, fill, s = 1) => {
  const t = (v) => (v * s).toFixed(1);
  return [
    { d: `M${x - 9 * s} 56 C${x - 8 * s} 46 ${x - 5 * s} 40 ${x - 4 * s} 33 L${x + 4 * s} 33 C${x + 5 * s} 40 ${x + 8 * s} 46 ${x + 9 * s} 56 Z`, fill },
    { r: [x - 12 * s, 52, 24 * s, 7, 3.5], fill },
    { c: [x, 24 - (s - 1) * 6, t(9)], fill },
  ];
};

function gearPath(cx, cy, rOut, rIn, teeth) {
  const pts = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (Math.PI * i) / teeth - Math.PI / teeth / 2;
    const a1 = a0 + Math.PI / teeth;
    const r = i % 2 === 0 ? rOut : rIn;
    pts.push([cx + r * Math.cos(a0 + 0.08), cy + r * Math.sin(a0 + 0.08)]);
    pts.push([cx + r * Math.cos(a1 - 0.08), cy + r * Math.sin(a1 - 0.08)]);
  }
  return `M${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L')} Z`;
}

function starPath(cx, cy, R, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / 5;
    const rad = i % 2 ? r : R;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)} ${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

export const ICONS = {
  friend: [...pawn(19, C.white), ...pawn(45, C.dark)],
  computer: [
    { line: 'M32 7 V15', color: 'ink' },
    { c: [32, 7, 4.5], fill: C.coral },
    { r: [5, 25, 7, 14, 3.5], fill: C.coral },
    { r: [52, 25, 7, 14, 3.5], fill: C.coral },
    { r: [11, 15, 42, 36, 11], fill: C.grey },
    { dot: [24, 30, 4.5] }, { dot: [40, 30, 4.5] },
    { line: 'M24 41 Q32 46 40 41', color: 'ink' },
  ],
  learn: [
    { d: 'M17 31 V43 C17 50 47 50 47 43 V31 L32 38 Z', fill: C.dark },
    { d: 'M4 25 L32 13 L60 25 L32 37 Z', fill: C.dark },
    { line: 'M55 27 V42', color: 'gold' },
    { c: [55, 45, 4.5], fill: C.gold },
  ],
  settings: [
    { d: `${gearPath(32, 32, 27, 20, 8)} M32 22 A10 10 0 1 0 32.01 22 Z`, fill: C.grey, evenodd: true },
  ],
  home: [
    { r: [42, 12, 7, 14, 1.5], fill: C.coral },
    { r: [14, 28, 36, 26, 3], fill: C.cream },
    { d: 'M6 31 L32 9 L58 31 Z', fill: C.coral },
    { r: [27, 38, 10, 16, 3], fill: C.brown },
  ],
  back: [
    { line: 'M48 32 H18', color: 'ink' },
    { line: 'M31 17 L16 32 L31 47', color: 'ink' },
  ],
  undo: [
    { line: 'M20 25 H38 A12.5 12.5 0 0 1 38 50 H25', color: 'ink' },
    { line: 'M29 15 L18 25 L29 35', color: 'ink' },
  ],
  again: [
    { line: 'M49 28 A18 18 0 0 0 17 21', color: 'ink' },
    { line: 'M14 11 L16 22 L27 20', color: 'ink' },
    { line: 'M15 36 A18 18 0 0 0 47 43', color: 'ink' },
    { line: 'M50 53 L48 42 L37 44', color: 'ink' },
  ],
  pieces: [...pawn(32, C.white, 1.25)],
  check: [
    { line: 'M15 33 L27 45 L50 20', color: 'ink' },
  ],
  profile: [
    { c: [32, 32, 25], fill: C.gold },
    { dot: [24, 28, 3.6] }, { dot: [40, 28, 3.6] },
    { line: 'M22 38 Q32 47 42 38', color: 'ink' },
    { c: [17, 37, 3.5], fill: C.pink, soft: true }, { c: [47, 37, 3.5], fill: C.pink, soft: true },
  ],
  trophy: [
    { line: 'M18 17 H11 C9 17 9 29 19 30', color: 'gold' },
    { line: 'M46 17 H53 C55 17 55 29 45 30', color: 'gold' },
    { r: [28, 38, 8, 11, 1], fill: C.gold },
    { r: [18, 47, 28, 9, 3], fill: C.brown },
    { d: 'M17 9 H47 V22 C47 33 40 40 32 40 C24 40 17 33 17 22 Z', fill: C.gold },
    { line: 'M24 15 V23', color: 'white' },
  ],
  star: [
    { d: starPath(32, 34, 27, 12), fill: C.gold },
  ],
  celebrate: [
    { d: 'M8 56 L20 24 L40 44 Z', fill: C.coral },
    { line: 'M14 43 L25 51', color: 'white' },
    { line: 'M18 33 L32 45', color: 'white' },
    { c: [38, 12, 4], fill: C.gold }, { c: [53, 22, 3.5], fill: C.blue },
    { c: [51, 40, 3.5], fill: C.green }, { c: [28, 8, 3], fill: C.purple },
    { line: 'M32 26 Q37 18 45 20', color: 'purple' },
    { line: 'M38 36 Q46 32 54 34', color: 'blue' },
  ],
  draw: [
    { c: [32, 32, 25], fill: C.blue },
    { r: [18, 22, 28, 6.5, 3.25], fill: C.white },
    { r: [18, 35.5, 28, 6.5, 3.25], fill: C.white },
  ],
  heart: [
    { d: 'M32 55 C14 43 7 33 7 23 C7 15 13 9 21 9 C26 9 30 12 32 16 C34 12 38 9 43 9 C51 9 57 15 57 23 C57 33 50 43 32 55 Z', fill: C.coral },
    { line: 'M17 20 Q18 15 23 15', color: 'white' },
  ],
  castle: [
    { line: 'M32 13 V3', color: 'ink' },
    { d: 'M33 3 L45 7 L33 11 Z', fill: C.coral },
    { d: 'M13 14 H22 V20 H28 V14 H36 V20 H42 V14 H51 V30 H13 Z', fill: C.grey },
    { r: [16, 28, 32, 28, 2], fill: C.grey },
    { d: 'M26 56 V46 A6 6 0 0 1 38 46 V56 Z', fill: C.brown },
  ],
  soundOn: [
    { d: 'M8 24 H19 L32 13 V51 L19 40 H8 Z', fill: C.blue },
    { line: 'M40 24 Q46 32 40 40', color: 'ink' },
    { line: 'M47 17 Q57 32 47 47', color: 'ink' },
  ],
  soundOff: [
    { d: 'M8 24 H19 L32 13 V51 L19 40 H8 Z', fill: C.grey },
    { line: 'M41 25 L55 39', color: 'coral' },
    { line: 'M55 25 L41 39', color: 'coral' },
  ],
  palette: [
    { d: 'M32 7 C16 7 6 19 6 32 C6 46 18 57 30 57 C36 57 37 51 34 47 C31 43 33 39 38 39 H45 C53 39 58 34 58 27 C58 15 46 7 32 7 Z', fill: C.cream },
    { c: [20, 24, 5], fill: C.coral }, { c: [32, 17, 5], fill: C.blue },
    { c: [45, 22, 5], fill: C.green }, { c: [17, 38, 5], fill: C.purple },
  ],
  phone: [
    { r: [19, 6, 26, 52, 6], fill: C.dark },
    { r: [23, 12, 18, 36, 2], fill: C.blue },
    { c: [32, 53, 2.5], fill: C.white },
  ],
};

// ---------- Lär dig spela: regler ----------
Object.assign(ICONS, {
  book: [
    { d: 'M5 14 C15 9 24 11 31 16 V55 C24 50 15 49 5 52 Z', fill: C.white },
    { d: 'M59 14 C49 9 40 11 33 16 V55 C40 50 49 49 59 52 Z', fill: C.white },
    { d: 'M42 11 V27 L46 23 L50 27 V10 Z', fill: C.coral },
  ],
  flag: [
    { line: 'M17 8 V58', color: 'ink' },
    { d: 'M20 9 H50 L42 20 L50 31 H20 Z', fill: C.coral },
  ],
  target: [
    { c: [32, 32, 25], fill: C.white }, { c: [32, 32, 16], fill: C.coral }, { c: [32, 32, 7], fill: C.white },
  ],
  alert: [
    { d: 'M32 7 L60 55 H4 Z', fill: C.gold },
    { line: 'M32 24 V38', color: 'ink' }, { dot: [32, 47, 3.8] },
  ],
  crown: [
    { d: 'M7 22 L20 34 L32 14 L44 34 L57 22 L51 52 H13 Z', fill: C.gold },
    { c: [7, 20, 4.5], fill: C.gold }, { c: [32, 11, 4.5], fill: C.gold }, { c: [57, 20, 4.5], fill: C.gold },
    { r: [13, 44, 38, 8, 2], fill: C.coral },
  ],
  up: [
    { c: [32, 32, 25], fill: C.green },
    { line: 'M32 47 V19', color: 'white' }, { line: 'M20 30 L32 18 L44 30', color: 'white' },
  ],
  play: [
    { d: 'M20 12 L52 32 L20 52 Z', fill: C.white },
  ],
});

// ---------- Djuren (nivåerna mot datorn): icon('chick'), icon('bunny'), icon('fox'), icon('owl') ----------
const cheeks = (y, dx = 12) => [
  { c: [32 - dx, y, 3.2], fill: C.pink, soft: true }, { c: [32 + dx, y, 3.2], fill: C.pink, soft: true },
];

Object.assign(ICONS, {
  // Kyckling som precis kläckts ur ägget
  chick: [
    { d: 'M29 14 C27 7 35 7 34 13 Z', fill: C.gold },
    { c: [32, 29, 16], fill: C.gold },
    { dot: [26, 27, 2.8] }, { dot: [38, 27, 2.8] },
    { d: 'M27.5 31.5 L36.5 31.5 L32 37.5 Z', fill: C.orange },
    ...cheeks(33, 11),
    { d: 'M11 40 L17 34 L23 40 L29 34 L35 40 L41 34 L47 40 L53 35 C53 51 44 59 32 59 C20 59 11 51 11 40 Z', fill: C.cream },
  ],
  // Kanin med öronen rakt upp
  bunny: [
    { d: 'M22 30 C15 20 15 5 22 4 C29 3 30 18 28 30 Z', fill: C.white },
    { d: 'M42 30 C49 20 49 5 42 4 C35 3 34 18 36 30 Z', fill: C.white },
    { d: 'M22.5 25 C19 18 19 10 22 9 C25 9 26 18 25.5 25 Z', fill: C.pink, soft: true },
    { d: 'M41.5 25 C45 18 45 10 42 9 C39 9 38 18 38.5 25 Z', fill: C.pink, soft: true },
    { c: [32, 41, 18], fill: C.white },
    { dot: [25, 39, 2.8] }, { dot: [39, 39, 2.8] },
    { d: 'M29 44 H35 L32 47.5 Z', fill: C.pink },
    ...cheeks(46, 11),
  ],
  // Räv: spetsiga öron, spetsig haka, vit nos med svart nostipp
  fox: [
    { d: 'M10 6 L28 18 L12 28 Z', fill: C.orange },
    { d: 'M54 6 L36 18 L52 28 Z', fill: C.orange },
    { d: 'M15 13 L22 18 L16 22 Z', fill: C.cream },
    { d: 'M49 13 L42 18 L48 22 Z', fill: C.cream },
    { d: 'M7 24 C7 18 18 16 32 16 C46 16 57 18 57 24 C57 38 45 53 32 58 C19 53 7 38 7 24 Z', fill: C.orange },
    { d: 'M15 35 C22 40 27 42 32 42 C37 42 42 40 49 35 C46 46 40 53 32 58 C24 53 18 46 15 35 Z', fill: C.white, plain: true },
    { d: 'M7 24 C7 18 18 16 32 16 C46 16 57 18 57 24 C57 38 45 53 32 58 C19 53 7 38 7 24 Z', outline: true },
    { dot: [22, 30, 3] }, { dot: [42, 30, 3] },
    { c: [32, 53, 3], fill: C.ink },
  ],
  // Brun uggla med örontofsar, stora ögon och ljus mage
  owl: [
    { d: 'M11 30 C11 20 13 12 15 5 L24 13 C29 11 35 11 40 13 L49 5 C51 12 53 20 53 30 V44 C53 54 44 60 32 60 C20 60 11 54 11 44 Z', fill: C.owl },
    { c: [32, 48, 10], fill: C.cream },
    { c: [22.5, 28, 8.5], fill: C.white }, { c: [41.5, 28, 8.5], fill: C.white },
    { dot: [23.5, 28, 4] }, { dot: [40.5, 28, 4] },
    { d: 'M28.5 35 L35.5 35 L32 41 Z', fill: C.gold },
  ],
});

export const ICON_NAMES = {
  friend: 'Mot en kompis', computer: 'Mot datorn', learn: 'Lär dig spela', settings: 'Inställningar',
  profile: 'Profil', home: 'Hem', back: 'Tillbaka', undo: 'Ångra', again: 'Spela igen / Öva mer',
  pieces: 'Andra pjäser', check: 'Klar', trophy: 'Pokal', star: 'Stjärna', celebrate: 'Firande',
  draw: 'Oavgjort', heart: 'Bra kämpat', castle: 'Rockad', soundOn: 'Ljud på', soundOff: 'Ljud av',
  palette: 'Pjässtil', phone: 'Vänd telefonen',
};

const INK = C.ink;

function shape(p, attrs) {
  const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
  if (p.d) return `<path d="${p.d}" ${p.evenodd ? 'fill-rule="evenodd" ' : ''}${a}/>`;
  if (p.c) return `<circle cx="${p.c[0]}" cy="${p.c[1]}" r="${p.c[2]}" ${a}/>`;
  if (p.r) return `<rect x="${p.r[0]}" y="${p.r[1]}" width="${p.r[2]}" height="${p.r[3]}" rx="${p.r[4] ?? 0}" ${a}/>`;
  if (p.dot) return `<circle cx="${p.dot[0]}" cy="${p.dot[1]}" r="${p.dot[2]}" ${a}/>`;
  return '';
}

// Ritar en ikon i den tecknade stilen: färgade former med tjock mörk kontur, precis
// som de tecknade pjäserna. Färgade linjer (t.ex. pokalens handtag) får också kontur.
// Exempel: icon('home')  eller  icon('star', 'icon-inline')
export function icon(name, className = '') {
  const parts = ICONS[name];
  if (!parts) return '';
  let out = '';
  for (const p of parts) {
    if (p.line) {
      const color = p.color === 'ink' ? INK : C[p.color];
      if (p.color !== 'ink') out += `<path d="${p.line}" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;
      out += `<path d="${p.line}" fill="none" stroke="${color}" stroke-width="${p.color === 'ink' ? 6 : 4.5}" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else if (p.dot) {
      out += shape(p, { fill: INK });
    } else if (p.outline) {
      // Bara konturen (ritas ovanpå, t.ex. för att rama in ett helt huvud)
      out += shape(p, { fill: 'none', stroke: INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round' });
    } else if (p.plain) {
      // Färgfält utan egen kontur, som smälter in i formen under (t.ex. rävens vita päls)
      out += shape(p, { fill: p.fill });
    } else {
      out += shape(p, p.soft ? { fill: p.fill, opacity: 0.8 } : { fill: p.fill, stroke: INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round' });
    }
  }
  return `<svg class="icon ${className}" viewBox="0 0 64 64" aria-hidden="true">${out}</svg>`;
}
