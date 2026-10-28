import { expectEqual } from '../_kit.js';

const idOf = p => (/T-\d+/.exec(p) || ['?'])[0];

export default {
  tier: 2,
  title: "Don't Reuse Stale Work",
  difficulty: 'Easy',
  category: 'Pattern',
  goal: "Reuse a saved answer only when both its input and its instructions version still match; redo everything else and log what you redid.",
  concepts: ['freshness keys', 'cache invalidation', 'replay is not freshness'],
  description: `
<p><b>Production pattern:</b> a rerun saves money by reusing answers from the last run. A real pipeline found that
replay happily reused a saved result after the item's input <i>and</i> the project's instructions had changed. Having a
saved answer only proves that you once answered; it doesn't prove the answer still applies. Reuse is safe only when
<b>everything the answer depended on</b> is unchanged.</p>
<p><code>args</code> is <code>{instructions, items, saved}</code>:</p>
<ul>
  <li><code>instructions</code> is the current instructions version, such as <code>"v2"</code>;</li>
  <li><code>items</code> is <code>[{id, input}]</code>, where <code>input</code> is a hash of the item's current input;</li>
  <li><code>saved</code> maps an id to <code>{input, instructions, answer}</code> from an earlier run. It may lack some ids.</li>
</ul>
<p>For each item, reuse <code>saved[id].answer</code> (with no agent) only when both <code>input</code> and
<code>instructions</code> match. Otherwise run <code>process &lt;id&gt; &lt;input&gt;</code>, concurrently. Return the
answers in item order, and <code>log()</code> one line naming each item you redid because its saved answer was stale.</p>`,
  hints: [
    'const s = args.saved[it.id]; const fresh = s && s.input === it.input && s.instructions === args.instructions',
    'Items with no saved answer are new, not stale: process them, but they don\'t need the "stale" log line.',
  ],
  respond(call) {
    const [, id, input] = /process (T-\d+) (\S+)/.exec(call.prompt) || [];
    return { output: `answer ${id || idOf(call.prompt)}@${input || '?'}`, duration: 1000 };
  },
  tests: [
    {
      name: 'one input changed',
      args: {
        instructions: 'v2',
        items: [{ id: 'T-1', input: 'a1' }, { id: 'T-2', input: 'b2' }, { id: 'T-3', input: 'c1' }],
        saved: {
          'T-1': { input: 'a1', instructions: 'v2', answer: 'answer T-1@a1' },
          'T-2': { input: 'b1', instructions: 'v2', answer: 'answer T-2@b1' },
        },
      },
      expected: ['answer T-1@a1', 'answer T-2@b2', 'answer T-3@c1'],
      reused: ['T-1'],
      stale: ['T-2'],
    },
    {
      name: 'instructions changed',
      args: {
        instructions: 'v3',
        items: [{ id: 'T-1', input: 'a1' }, { id: 'T-2', input: 'b1' }],
        saved: {
          'T-1': { input: 'a1', instructions: 'v2', answer: 'answer T-1@a1 (old rules)' },
          'T-2': { input: 'b1', instructions: 'v2', answer: 'answer T-2@b1 (old rules)' },
        },
      },
      expected: ['answer T-1@a1', 'answer T-2@b1'],
      reused: [],
      stale: ['T-1', 'T-2'],
    },
    {
      name: 'nothing changed',
      args: {
        instructions: 'v2',
        items: [{ id: 'T-1', input: 'a1' }],
        saved: { 'T-1': { input: 'a1', instructions: 'v2', answer: 'answer T-1@a1' } },
      },
      expected: ['answer T-1@a1'],
      reused: ['T-1'],
      stale: [],
    },
  ].map(t => ({
    ...t,
    check: (r, run) => {
      const bad = expectEqual(r, t.expected);
      if (bad) return bad;
      const redone = run.trace.agents.filter(a => t.reused.includes(idOf(a.prompt)));
      if (redone.length) return `${idOf(redone[0].prompt)} was still fresh, so it should have been reused without an agent.`;
      const logs = run.trace.logs.map(l => l.message).join('\n');
      const silent = t.stale.filter(id => !logs.includes(id));
      return silent.length ? `Log the items you redid because their saved answer was stale (${silent.join(', ')}).` : null;
    },
  })),
};
