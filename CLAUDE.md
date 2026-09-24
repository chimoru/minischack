# MiniSchack

Schack-PWA för barn 6–7 år (iPhone/iPad). Vanilla HTML/CSS/JS med ES-moduler, inget byggsteg.
Specen ligger i `~/Downloads/minischack-spec.md`. All text i appen är på svenska.

## Struktur
- `js/chess/rules.js` – alla schackregler, ren logik utan DOM (körs även i node).
- `js/chess/ai.js` – datormotorn (alfa-beta), nivåer i `LEVEL_SETTINGS`. Körs i `ai-worker.js`.
- `js/ui/*` – bräde, parti, meny-delar, ljud (Web Audio), pjäser (SVG i kod).
- `js/ui/icons.js` – appens egna ikoner (tecknad stil, som pjäserna). Använd `icon('namn')`
  i JS eller `data-icon="namn"` i index.html – **inga emojis** i UI:t. Djuren för nivåerna
  heter samma sak som nivåns id: `icon('chick' | 'bunny' | 'fox' | 'owl')`.
- `js/storage.js` – allt som sparas (localStorage, nyckel `minischack.v1`).
- "Lär dig spela": `js/ui/learn.js` (startsida + Pjäserna), `js/ui/lessons.js` (Reglerna, UI)
  och `js/ui/lesson-data.js` (reglernas texter, uppspelningar och uppgifter – ren data utan DOM).
  Texterna ska vara skrivna för 6–7-åringar: korta meningar, inga svåra ord.

## Regler vid ändringar
- **Ny fil?** Lägg till den i `FILES` i `sw.js`, annars fungerar appen inte offline.
  `node tests/files.test.mjs` fångar det.
- `VERSION` i `sw.js` stämplas automatiskt med commit-id vid publicering
  (`.github/workflows/deploy.yml`) – behöver inte ändras för hand.
- Publiceras till https://chimoru.dev/minischack/ (repo `chimoru/minischack`) vid push till main.
- Pedagogiken: vid ogiltiga drag visas **ingen förklarande text** – bara skakning + ljud.
- Brädet vänds aldrig.

## Tester
```
node tests/rules.test.mjs     # perft + matt/patt/remi – måste alltid gå igenom
node tests/files.test.mjs     # sw.js listar alla filer
node tests/lessons.test.mjs   # reglernas drag är lagliga och alla uppgifter går att lösa
node tests/ai.test.mjs 4      # nivåerna mot varandra (tar några minuter); --gammal jämför mot förra versionen
```

## Förhandsvisning lokalt
Kör `python3 tools/dev-server.py` (port 8766) – den skickar `Cache-Control: no-store`.
Vanliga `python3 -m http.server` ska INTE användas: webbläsaren sparar då gamla kopior av
modulerna och kör gammal kod blandat med ny.
Förhandsvisningen läser `.claude/launch.json` i mappen *Claude Users Tool*, inte här.

På `localhost` hämtar service workern alltid färska filer först (sparad kopia bara om
servern är nere). På riktiga adressen gäller sparad kopia först.
Offline kan testas lokalt genom att stoppa servern och ladda om.

Testa med **riktiga** klick/dragningar (inte bara syntetiska `pointerdown`) – ett riktigt
tryck skickar även ett `click` efteråt, och det har orsakat buggar tidigare.
