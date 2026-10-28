import { expectEqual, has, nth } from '../_kit.js';

export default {
  title: 'Adversarial Verify',
  difficulty: 'Medium',
  category: 'Create',
  goal: "Ask 3 skeptics to refute each finding, and return the ids of findings that at least 2 skeptics failed to refute.",
  concepts: ['skeptic votes', 'nested parallel', 'majority'],
  description: `
<p><code>args</code> is a list of findings <code>{id, claim}</code>. For each finding, spawn <strong>3 independent skeptics</strong>
and ask each to refute it. Use a schema with a boolean <code>refuted</code>, and put the finding id in the prompt.</p>
<p>A finding survives when at least <strong>2</strong> skeptics returned <code>refuted: false</code>. A skeptic that returns
<code>null</code> does not count as support. Return the surviving ids in input order.</p>
<p>Each vote takes 2s and the concurrency cap is 8, so 12 votes need at least two waves. The limit is <strong>4s</strong>:
all findings must be verified concurrently, not one after another.</p>`,
  hints: [
    'Outer parallel over findings; inner parallel over 3 votes.',
    'Array.from({length: 3}, () => () => agent(...))',
    'votes.filter(Boolean).filter(v => !v.refuted).length >= 2',
  ],
  wallClockMs: 4000,
  respond(call, test) {
    const f = test.args.find(x => call.prompt.includes(x.id));
    if (!f) return { output: { refuted: true }, duration: 2000 };
    const vote = test.votes[f.id][nth(call.state, f.id)];
    if (vote === undefined || vote === null) return { fail: vote === null ? 'subagent crashed' : 'extra vote ignored', duration: 2000 };
    if (!has(call.schema, 'refuted')) return { output: vote ? 'I think this is wrong.' : 'Looks right.', duration: 2000 };
    return { output: { refuted: vote }, duration: 2000 };
  },
  tests: [
    {
      name: 'four findings',
      args: [
        { id: 'F1', claim: 'Token refresh races with logout' },
        { id: 'F2', claim: 'Cache keys collide across tenants' },
        { id: 'F3', claim: 'Retry loop has no backoff' },
        { id: 'F4', claim: 'Webhook signature is not verified' },
      ],
      votes: { F1: [false, false, true], F2: [true, true, false], F3: [false, true, false], F4: [null, false, true] },
      expected: ['F1', 'F3'],
    },
    {
      name: 'unanimous and split',
      args: [{ id: 'B7', claim: 'Off-by-one in paginator' }, { id: 'B9', claim: 'Leaks file handles' }],
      votes: { B7: [false, false, false], B9: [true, false, null] },
      expected: ['B7'],
    },
  ].map(t => ({
    ...t,
    check: (r, run) => {
      for (const f of t.args) {
        const n = run.trace.agents.filter(a => a.prompt.includes(f.id)).length;
        if (n !== 3) return `Expected exactly 3 votes for ${f.id}, spawned ${n}`;
      }
      return expectEqual(r, t.expected);
    },
  })),
};
