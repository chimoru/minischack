# MiniSchack

Schack-PWA för barn 6–7 år (iPhone/iPad). Vanilla HTML/CSS/JS med ES-moduler, inget byggsteg.
Specen ligger i `~/Downloads/minischack-spec.md`. All text i appen är på svenska.

## Struktur
- `js/chess/rules.js` – alla schackregler, ren logik utan DOM (körs även i node).
- `js/chess/ai.js` – datormotorn (alfa-beta), nivåer i `LEVEL_SETTINGS`. Körs i `ai-worker.js`.
- `js/ui/*` – bräde, parti, meny-delar, ljud (Web Audio), pjäser (SVG i kod).
- `js/storage.js` – allt som sparas (localStorage, nyckel `minischack.v1`).

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
node tests/ai.test.mjs 4      # nivåerna mot varandra (tar några minuter)
```

## Förhandsvisning lokalt
På `localhost` hämtar service workern alltid färska filer först (sparad kopia bara om
servern är nere), så ändringar syns direkt. På riktiga adressen gäller sparad kopia först.
Offline kan testas lokalt genom att stoppa servern och ladda om.
