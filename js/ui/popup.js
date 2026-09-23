// En enkel popup-ruta. buttons: [{ html, className, value }]
// Returnerar ett Promise med värdet för knappen som trycktes.
const overlay = document.getElementById('overlay');
const box = document.getElementById('popup');

// flipped: vänd rutan upp och ner – för svart spelare som sitter mitt emot i kompisläget
export function popup(html, buttons, { flipped = false } = {}) {
  return new Promise((resolve) => {
    box.classList.toggle('flipped', flipped);
    box.innerHTML = `${html}<div class="popup-buttons"></div>`;
    const row = box.querySelector('.popup-buttons');
    for (const b of buttons) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `btn ${b.className ?? ''}`;
      el.innerHTML = b.html;
      el.addEventListener('click', () => { closePopup(); resolve(b.value); });
      row.appendChild(el);
    }
    overlay.hidden = false;
  });
}

export function closePopup() {
  overlay.hidden = true;
  box.innerHTML = '';
}
