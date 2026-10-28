import { expectEqual, has, nth } from '../_kit.js';

const bug = id => ({ id, desc: `bug ${id}` });

export default {
  title: 'Loop Until Dry',
  difficulty: 'Hard',
  category: 'Create',
  goal: "Keep running bug-finder agents until 2 rounds in a row find nothing new, and return every unique bug id.",
  concepts: ['while loops', 'dedup vs seen', 'unknown-size discovery'],
  description: `
<p>You don't know in advance how many bugs exist. Keep spawning a finder agent, <strong>one round at a time</strong>, until
<strong>2 consecutive rounds</strong> find nothing new. Return the unique bug ids in discovery order.</p>
<ul>
  <li>The finder answers with a schema containing <code>bugs: [{id, desc}]</code>.</li>
  <li>Finders repeat themselves. A round is "dry" when none of its bugs are new, even if it returned some.</li>
  <li>Any round with something new resets the dry counter.</li>
</ul>
<p>Stopping at the first empty response, or at the first round with nothing new, misses the tail.
Simple counters like <code>while (found &lt; N)</code> miss it too.</p>`,
  hints: [
    'Keep a Set of seen ids and a `dry` counter: while (dry < 2) { ... }',
    'fresh = round.bugs.filter(b => !seen.has(b.id)); if (!fresh.length) { dry++; continue }; dry = 0',
  ],
  maxAgents: 40,
  respond(call, test) {
    const n = nth(call.state, 'finder');
    const round = (test.sequence[n] || []).map(bug);
    if (!has(call.schema, 'bugs')) return { output: round.map(b => b.id).join(', ') || 'nothing found', duration: 1000 };
    return { output: { bugs: round }, duration: 1000 };
  },
  tests: [
    { name: 'tail after a dry round', sequence: [['A', 'B'], ['B'], ['C'], [], ['D'], ['A'], []], expected: ['A', 'B', 'C', 'D'], calls: 7 },
    { name: 'one find, then dry', sequence: [['X']], expected: ['X'], calls: 3 },
    { name: 'nothing at all', sequence: [], expected: [], calls: 2 },
  ].map(t => ({
    ...t,
    check: (r, run) => expectEqual(r, t.expected)
      || (run.stats.agents !== t.calls ? `Expected ${t.calls} finder rounds, ran ${run.stats.agents}` : null),
  })),
};
