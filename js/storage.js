// Sparar profil, vinster och inställningar lokalt på enheten.
// localStorage kan saknas (t.ex. privat surfning), så allt är inlindat i try/catch
// och appen fungerar ändå – den minns bara inget till nästa gång.

const KEY = 'minischack.v1';

const DEFAULTS = {
  name: '',
  wins: { chick: 0, bunny: 0, fox: 0, owl: 0 },
  settings: { sound: true, teaching: true, pieceStyle: 'kids' },
  learned: [],          // pjäser man klarat i "Lär dig spela"
  learnedRules: [],     // regler man klarat i "Lär dig spela"
};

let data = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return {
        ...DEFAULTS,
        ...saved,
        wins: { ...DEFAULTS.wins, ...saved.wins },
        settings: { ...DEFAULTS.settings, ...saved.settings },
        learned: Array.isArray(saved.learned) ? saved.learned : [],
        learnedRules: Array.isArray(saved.learnedRules) ? saved.learnedRules : [],
      };
    }
  } catch { /* ignorera – vi börjar om från standardvärden */ }
  return structuredClone(DEFAULTS);
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* lagring otillgänglig */ }
}

export const store = {
  get name() { return data.name; },
  set name(value) { data.name = value; save(); },

  get settings() { return data.settings; },
  setSetting(key, value) { data.settings[key] = value; save(); },

  get wins() { return data.wins; },
  get totalWins() { return Object.values(data.wins).reduce((a, b) => a + b, 0); },
  addWin(level) { data.wins[level] = (data.wins[level] || 0) + 1; save(); },

  get learned() { return data.learned; },
  addLearned(type) { if (!data.learned.includes(type)) { data.learned.push(type); save(); } },

  get learnedRules() { return data.learnedRules; },
  addLearnedRule(id) { if (!data.learnedRules.includes(id)) { data.learnedRules.push(id); save(); } },
};
