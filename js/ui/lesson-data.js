// Innehållet i "Lär dig spela" → Reglerna: texter, uppspelningar och uppgifter.
// Ren data utan DOM, så att tests/lessons.test.mjs kan kontrollera att alla drag är
// lagliga och att varje uppgift går att lösa.
import { gameStatus, legalMoves, squareIndex, typeOf } from '../chess/rules.js';

// Drag skrivs som "e2e4", med förvandling som "b7b8q"
export const RULES = [
  {
    id: 'start', title: 'Så börjar man', icon: 'flag',
    text: 'Vit börjar alltid. Sedan turas ni om – ett drag var. Man får inte hoppa över sin tur!',
    demo: { fen: 'start', moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6'] },
    task: { fen: 'start', prompt: 'Du är vit. Gör det första draget!', check: () => true },
  },
  {
    id: 'capture', title: 'Ta en pjäs', icon: 'target',
    text: 'Ställ din pjäs på rutan där motståndarens pjäs står – då är den tagen och åker av brädet! Dina egna pjäser kan du aldrig ta.',
    demo: { fen: '4k3/8/8/3p4/8/1B6/8/4K3 w - - 0 1', moves: ['b3d5'] },
    task: { fen: 'k7/8/8/3b4/8/8/8/3RK3 w - - 0 1', prompt: 'Ta den svarta löparen!', check: (m) => !!m.captured },
  },
  {
    id: 'check', title: 'Schack', icon: 'alert',
    text: 'Schack betyder att kungen är hotad! Då måste du rädda den direkt: flytta kungen, ställ en pjäs i vägen eller ta pjäsen som hotar.',
    demo: { fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', moves: ['a1a8', 'e8e7'] },
    task: { fen: '4k3/8/8/8/8/8/4r3/4K3 w - - 0 1', prompt: 'Din kung står i schack! Rädda den!', check: () => true },
  },
  {
    id: 'mate', title: 'Schackmatt – så vinner man', icon: 'crown',
    text: 'Schackmatt är när kungen är hotad och inte kan räddas på något sätt. Då har du vunnit partiet!',
    demo: { fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', moves: ['a1a8'] },
    task: { fen: '6k1/5ppp/8/8/8/8/8/1R4K1 w - - 0 1', prompt: 'Gör schackmatt med ett enda drag!',
      check: (m, after) => gameStatus(after).result === 'checkmate' },
  },
  {
    id: 'promotion', title: 'Bonden blir en dam', icon: 'up',
    text: 'När en bonde kommer ända fram till andra sidan får den bli en annan pjäs. Oftast väljer man damen – den är starkast!',
    demo: { fen: '4k3/1P6/8/8/8/8/8/4K3 w - - 0 1', moves: ['b7b8q'] },
    task: { fen: '4k3/8/6P1/8/8/8/8/K7 w - - 0 1', prompt: 'Gå fram med bonden till sista raden!',
      check: (m) => !!m.promotion, needMoves: 2 },
  },
  {
    id: 'castling', title: 'Rockad', icon: 'castle',
    text: 'Rockad är ett specialdrag. Kungen går två steg mot tornet, och tornet hoppar över kungen. Då står kungen säkrare! Det går bara om kungen och tornet inte har flyttat förut, och om inget står emellan.',
    demo: { fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', moves: ['e1g1', 'e8c8'] },
    task: { fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', prompt: 'Gör en rockad! Tryck på kungen först.',
      check: (m) => m.flag === 'castleK' || m.flag === 'castleQ' },
  },
  {
    id: 'stalemate', title: 'Oavgjort (patt)', icon: 'draw',
    text: 'Om den som ska flytta inte kan göra något drag alls – men inte står i schack – då blir det oavgjort. Ingen vinner! Tips: lämna alltid en ruta åt kungen när du är på väg att vinna.',
    demo: { fen: '7k/8/5K2/6Q1/8/8/8/8 w - - 0 1', moves: ['g5g6'] },
    task: null,
  },
  {
    id: 'values', title: 'Vilka pjäser är mest värda?', icon: 'star',
    text: 'Damen är starkast! Försök att inte förlora den. Byt gärna bort en liten pjäs om du får en stor.',
    values: true,
    task: null,
  },
  {
    id: 'enpassant', title: 'Svår regel: En passant', icon: 'pieces', hard: true,
    text: 'En bonde som går två steg får inte smita förbi din bonde! Hamnar den precis bredvid, får du ta den snett – som om den bara gått ett steg. Men bara direkt, i nästa drag.',
    demo: { fen: '4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1', moves: ['d7d5', 'e5d6'] },
    task: { fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', prompt: 'Svarts bonde gick nyss två steg. Ta den med en passant!',
      check: (m) => m.flag === 'ep' },
  },
];

// Pjäsernas värde, som prickar (kungen kan aldrig bytas bort)
export const VALUES = [['Q', 9, 'Dam'], ['R', 5, 'Torn'], ['B', 3, 'Löpare'], ['N', 3, 'Springare'], ['P', 1, 'Bonde']];

// Hittar det lagliga draget som "e2e4" / "b7b8q" beskriver
export function findMove(s, uci) {
  const from = squareIndex(uci.slice(0, 2)), to = squareIndex(uci.slice(2, 4));
  return legalMoves(s).find((m) => m.from === from && m.to === to &&
    (!m.promotion || typeOf(m.promotion) === (uci[4] ?? 'q')));
}

export const fenOf = (f) => (f === 'start' ? undefined : f);
