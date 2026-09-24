// Kontrollerar "Lär dig spela" → Reglerna. Kör med:  node tests/lessons.test.mjs
//   – varje drag i uppspelningarna är lagligt
//   – varje "Prova själv"-uppgift går att lösa (annars fastnar barnet!)
import { newGame, legalMoves, playMove, cloneState, gameStatus } from '../js/chess/rules.js';
import { RULES, findMove, fenOf } from '../js/ui/lesson-data.js';

let failed = 0;
const ok = (name, pass, extra = '') => { if (!pass) failed++; console.log(`${pass ? '✅' : '❌'} ${name}${extra ? ` – ${extra}` : ''}`); };

// Finns det en dragföljd (högst `left` egna drag, svart står still) som klarar uppgiften?
function solvable(state, task, left) {
  for (const m of legalMoves(state)) {
    const s = cloneState(state);
    playMove(s, m);
    if (task.check(m, s)) return true;
    if (left > 1 && task.needMoves) { s.turn = 'w'; if (solvable(s, task, left - 1)) return true; }
  }
  return false;
}

for (const r of RULES) {
  if (r.demo) {
    const s = newGame(fenOf(r.demo.fen));
    let legal = true;
    for (const uci of r.demo.moves) {
      const m = findMove(s, uci);
      if (!m) { legal = false; break; }
      playMove(s, m);
    }
    ok(`${r.title}: uppspelningen`, legal, legal ? `slutar med: ${gameStatus(s).result ?? (gameStatus(s).check ? 'schack' : 'parti pågår')}` : 'olagligt drag');
  }
  if (r.task) {
    const s = newGame(fenOf(r.task.fen));
    ok(`${r.title}: uppgiften går att lösa`, solvable(s, r.task, r.task.needMoves ?? 1));
    // Uppgiften ska inte vara löst av vilket drag som helst – utom där det är meningen
    const any = legalMoves(s).filter((m) => { const c = cloneState(s); playMove(c, m); return r.task.check(m, c); }).length;
    console.log(`   ${any} av ${legalMoves(s).length} möjliga första drag klarar uppgiften direkt`);
  }
}
console.log(failed ? `\n❌ ${failed} fel` : '\n🎉 Alla regler är lagliga och alla uppgifter går att lösa!');
process.exit(failed ? 1 : 0);
