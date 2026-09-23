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
    this.onSquare = onSquare;
    this.drag = null;
    // Två sätt att flytta, som båda fungerar:
    //   tryck på pjäsen, tryck på rutan  – eller –  dra pjäsen med fingret och släpp
    el.addEventListener('pointerdown', (e) => this.down(e));
    el.addEventListener('pointermove', (e) => this.move(e));
    el.addEventListener('pointerup', (e) => this.up(e));
    el.addEventListener('pointercancel', () => this.endDrag());
  }

  squareAt(x, y) {
    const sq = document.elementFromPoint(x, y)?.closest('.sq');
    return sq && this.el.contains(sq) ? Number(sq.dataset.sq) : -1;
  }

  down(e) {
    const sqEl = e.target.closest('.sq');
    if (!sqEl) return;
    const sq = Number(sqEl.dataset.sq);
    this.endDrag();
    this.onSquare(sq);   // pointerdown i stället för click: svarar direkt vid beröring

    // Är pjäsen nu vald kan den dras. "Spöket" följer fingret tills man släpper.
    const d = this.squares[sq];
    const svg = d.querySelector('.piece');
    if (!svg || !d.classList.contains('selected')) return;
    const rect = d.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.style.width = ghost.style.height = `${rect.width * 1.25}px`;
    ghost.innerHTML = svg.outerHTML;
    this.drag = { sq, ghost, svg, x0: e.clientX, y0: e.clientY, moved: false, id: e.pointerId };
    // Fånga fingret, så brädet får höra var det släpps även utanför rutan man började på
    try { this.el.setPointerCapture(e.pointerId); } catch { /* äldre webbläsare */ }
  }

  move(e) {
    const g = this.drag;
    if (!g || e.pointerId !== g.id) return;
    if (!g.moved && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < 8) return;   // bara ett tryck
    if (!g.moved) {
      g.moved = true;
      document.body.appendChild(g.ghost);
      g.svg.style.opacity = '0.3';
    }
    g.ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -60%)`;
  }

  up(e) {
    const g = this.drag;
    if (!g || e.pointerId !== g.id) return;
    this.endDrag();
    if (!g.moved) return;                      // vanligt tryck – redan hanterat i down()
    const target = this.squareAt(e.clientX, e.clientY);
    if (target < 0 || target === g.sq) return;
    this.dropped = true;                       // draget kom från en dragning – ingen glidning behövs
    try { this.onSquare(target); } finally { this.dropped = false; }
  }

  // Låter pjäser glida från sin ruta till den nya, så man ser hur draget gick.
  // slides: [{ from, to, piece }] – flera samtidigt, t.ex. kung + torn vid rockad.
  // Brädet visar fortfarande ställningen FÖRE draget medan pjäserna glider.
  async slide(slides, ms, style) {
    if (!ms || !Element.prototype.animate) return;
    const ghosts = slides.map(({ from, to, piece }) => {
      const a = this.squares[from].getBoundingClientRect();
      const b = this.squares[to].getBoundingClientRect();
      const ghost = document.createElement('div');
      ghost.className = 'slide-ghost';
      Object.assign(ghost.style, {
        left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`,
      });
      ghost.innerHTML = pieceSVG(piece, style);
      document.body.appendChild(ghost);
      const orig = this.squares[from].querySelector('.piece');
      if (orig) orig.style.opacity = '0';
      const dx = b.left - a.left, dy = b.top - a.top;
      const anim = ghost.animate([
        { transform: 'translate(0, 0) scale(1)' },
        { transform: `translate(${dx / 2}px, ${dy / 2}px) scale(1.25)`, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(1)` },
      ], { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
      return { ghost, anim, orig };
    });
    await Promise.all(ghosts.map((g) => g.anim.finished.catch(() => {})));
    // Spökena tas bort först när brädet ritats om (i nästa bildruta), så inget blinkar
    requestAnimationFrame(() => ghosts.forEach((g) => {
      g.ghost.remove();
      if (g.orig) g.orig.style.opacity = '';
    }));
  }

  endDrag() {
    if (!this.drag) return;
    this.drag.ghost.remove();
    this.drag.svg.style.opacity = '';
    this.drag = null;
  }

  // opts: { selected, hints: [{to, capture}], lastMove, checkSq, style, arrived, stars: [sq] }
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

      const star = opts.stars?.includes(sq);
      const key = `${p ? `${p}-${opts.style}` : ''}${star ? '*' : ''}`;
      if (d.dataset.drawn !== key) {       // rita bara om rutan när något ändrats
        d.innerHTML = (p ? pieceSVG(p, opts.style) : '') + (star ? '<span class="star-mark">⭐</span>' : '');
        d.dataset.drawn = key;
      }
      if (p && sq === opts.arrived) {
        const svg = d.querySelector('.piece');
        svg.classList.remove('pop'); void svg.offsetWidth; svg.classList.add('pop');
        // Ta bort effekten när den spelats klart, så den aldrig spelas upp igen av sig själv
        svg.addEventListener('animationend', () => svg.classList.remove('pop'), { once: true });
      }
    }
  }

  // Liten skakning när man trycker fel – ingen text, bara en mjuk signal
  shake(sq) {
    const d = this.squares[sq];
    d.classList.remove('nope'); void d.offsetWidth; d.classList.add('nope');
    d.addEventListener('animationend', () => d.classList.remove('nope'), { once: true });
  }
}
