// Kör datorns tänkande i en bakgrundstråd, så att appen inte fryser under tiden.
import { chooseMove } from './ai.js';
import { legalMoves } from './rules.js';

self.onmessage = (e) => {
  const { id, state, level } = e.data;
  let move;
  try {
    move = chooseMove(state, level);
  } catch {
    move = legalMoves(state)[0];   // nödutgång: spela hellre ett enkelt drag än att hänga
  }
  self.postMessage({ id, move });
};
