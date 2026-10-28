import { expectEqual, has, nth } from '../_kit.js';

const ROUNDS = [['P1', 'P2', 'P3'], ['P2', 'P3', 'P4']];
const REAL = { P1: true, P2: false, P3: true, P4: true };

export default {
  title: 'Never Converges',
  difficulty: 'Hard',
  category: 'Debug',
  goal: "Fix the loop so it stops, and returns <code>[\"P1\", \"P3\", \"P4\"]</code>.",
  concepts: ['loop-until-dry', 'dedup vs seen', 'agent cap'],
  description: `
<p>An exhaustive review loop: finders propose bugs, a judge confirms each <em>fresh</em> one, and the loop stops after
two dry rounds. It never stops. It runs until it hits the agent cap.</p>
<p>The finders keep re-reporting a bug the judge rejected. Fix the loop so it converges and returns the confirmed ids
in confirmation order: <code>["P1", "P3", "P4"]</code>.</p>`,
  hints: [
    'What is "fresh" compared against? What happens to a rejected bug next round?',
    'Dedup against everything seen, not only against what was confirmed. The unused `seen` is the clue.',
  ],
  maxAgents: 60,
  respond(call) {
    if (has(call.schema, 'real')) {
      const id = (/\bP\d\b/.exec(call.prompt) || [])[0];
      return { output: { real: Boolean(REAL[id]) }, duration: 1000 };
    }
    const n = nth(call.state, 'finder');
    const ids = ROUNDS[n] || ['P1', 'P2', 'P3', 'P4'];
    return { output: { bugs: ids.map(id => ({ id, desc: `suspected bug ${id}` })) }, duration: 1500 };
  },
  tests: [{ name: 'converges', check: r => expectEqual(r, ['P1', 'P3', 'P4']) }],
};
