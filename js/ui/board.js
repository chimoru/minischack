// Ritar schackbrädet och tar emot tryck på rutor.
// Brädet vänds aldrig: vit står alltid nederst.
import { pieceSVG } from './pieces.js';

export class BoardView {
  constructor(el, onSquare) {
    this.el = el;
    this.squares = [];
    el.innerHTML = '';
    for (let sq = 0; sq < 64; sq++) {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = `sq ${((sq >> 3) + (sq & 7)) % 2 ? 'dark' : 'light'}`;
      d.dataset.sq = sq;
      el.appendChild(d);
      this.squares.push(d);
    }
    // pointerdown i stället för click: svarar direkt vid beröring på iPad
    el.addEventListener('pointerdown', (e) => {
      const sq = e.target.closest('.sq')?.dataset.sq;
      if (sq !== undefined) onSquare(Number(sq));
    });
  }

  // opts: { selected, hints: [{to, capture}], lastMove, checkSq, style, arrived }
  render(board, opts = {}) {
    const hints = new Map((opts.hints ?? []).map((h) => [h.to, h.capture]));
    for (let sq = 0; sq < 64; sq++) {
      const d = this.squares[sq];
      const p = board[sq];
      d.classList.toggle('selected', sq === opts.selected);
      d.classList.toggle('last', !!opts.lastMove && (sq === opts.lastMove.from || sq === opts.lastMove.to));
      d.classList.toggle('in-check', sq === opts.checkSq);
      d.classList.toggle('hint', hints.has(sq) && !hints.get(sq));
      d.classList.toggle('hint-capture', hints.get(sq) === true);

      const key = p ? `${p}-${opts.style}` : '';
      if (d.dataset.piece !== key) {
        d.innerHTML = p ? pieceSVG(p, opts.style) : '';
        d.dataset.piece = key;
      }
      if (p && sq === opts.arrived) {
        const svg = d.querySelector('.piece');
        svg.classList.remove('pop'); void svg.offsetWidth; svg.classList.add('pop');
      }
    }
  }

  // Liten skakning när man trycker fel – ingen text, bara en mjuk signal
  shake(sq) {
    const d = this.squares[sq];
    d.classList.remove('nope'); void d.offsetWidth; d.classList.add('nope');
  }
}
