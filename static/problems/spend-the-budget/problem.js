import { expectEqual, has, nth } from '../_kit.js';

export default {
  title: 'Spend the Budget',
  difficulty: 'Hard',
  category: 'Create',
  goal: "Run brainstorm rounds until the token budget is nearly spent (or exactly 3 rounds with no budget), and return all ideas.",
  concepts: ['budget.total', 'budget.remaining()', 'guarding loops'],
  description: `
<p>When a user says "+500k", the workflow gets a token target in <code>budget</code>:
<code>budget.total</code> (or <code>null</code>), <code>budget.spent()</code> and <code>budget.remaining()</code>.
The target is a hard ceiling, and <code>agent()</code> throws once it is spent.</p>
<p>Brainstorm in rounds. Each round is one agent with a schema containing <code>ideas: string[]</code>, and it costs
3,000 tokens.</p>
<ul>
  <li>With a budget, keep running rounds while <strong>more than 5,000</strong> tokens remain.</li>
  <li>With no budget (<code>budget.total === null</code>), run exactly <strong>3</strong> rounds.
      Note that <code>remaining()</code> is <code>Infinity</code> then, so an unguarded loop runs until the agent cap.</li>
</ul>
<p>Return every idea, in order.</p>`,
  hints: [
    'if (budget.total) { while (budget.remaining() > 5000) {...} } else { for 3 rounds }',
    'Spent is counted when an agent finishes, so check remaining() before each round.',
  ],
  maxAgents: 30,
  respond(call) {
    const n = nth(call.state, 'round') + 1;
    const ideas = [`idea-${n}a`, `idea-${n}b`];
    return { output: has(call.schema, 'ideas') ? { ideas } : ideas.join('; '), duration: 1000, tokens: 3000 };
  },
  tests: [
    { name: 'budget 20k', budget: 20000, rounds: 5 },
    { name: 'no budget', budget: null, rounds: 3 },
    { name: 'tiny budget', budget: 4000, rounds: 0 },
  ].map(t => ({
    ...t,
    check: r => expectEqual(r, Array.from({ length: t.rounds }, (_, i) => [`idea-${i + 1}a`, `idea-${i + 1}b`]).flat()),
  })),
};
