import { expectEqual, has } from '../_kit.js';

const idOf = p => (/T-\d+/.exec(p) || ['?'])[0];
const isWrite = a => /\bwrite T-\d+/.test(a.prompt) && !has(a.opts.schema, 'found');
const isIntent = a => /intent\.py record/.test(a.prompt);
const BEFORE_COMMIT = 'died before committing';

export default {
  tier: 2,
  title: 'Record Intent Before Writing',
  difficulty: 'Hard',
  category: 'Pattern',
  goal: "Write each item's comment exactly once: record intent first, read back instead of retrying, and return <code>{done, reconcile}</code>.",
  concepts: ['side effects vs replay', 'intent before write', 'read back, never blind-retry'],
  description: `
<p><b>Production pattern:</b> the workflow journal records what an agent <i>returned</i>; it does not make an external
write happen exactly once. In a real pipeline an agent posted a Jira comment and was killed before its result was
recorded, so the replay posted it again. The repair: durably record the <b>intent</b> before writing, and after any
doubt, <b>read back</b> the remote state instead of retrying.</p>
<p><code>args</code> is <code>{items, pending}</code>. <code>pending</code> lists items whose intent an earlier, interrupted run
recorded: that run may or may not have written them. Each item needs exactly one comment.</p>
<ul>
  <li><b>Pending item:</b> don't write. Read back (prompt <code>read back &lt;id&gt;</code>, schema <code>READBACK</code>).
  If <code>found</code>, it's done. If not, add it to <code>reconcile</code>: a search that comes back empty doesn't prove the
  first write never landed (the remote may lag), so a person decides.</li>
  <li><b>Other items:</b> record intent (prompt contains <code>intent.py record &lt;id&gt;</code>), and only after that has
  returned, write (prompt <code>write &lt;id&gt;</code>). A non-null write is done. If the write returns <code>null</code>, it may
  have committed before it died: read back, then <i>done</i> if found, <i>reconcile</i> if not. Never write twice.</li>
</ul>
<p>Handle items concurrently. Return <code>{done, reconcile}</code>, each in input order.</p>`,
  hints: [
    "const READBACK = { type: 'object', required: ['found'], properties: { found: { type: 'boolean' } } }",
    'One async thunk per item keeps each chain sequential while the items run concurrently: parallel(args.items.map(id => async () => { ... }))',
    'A null read back is no evidence either way: reconcile.',
  ],
  respond(call, test) {
    const s = call.state;
    s.posted ??= Object.fromEntries((test.alreadyPosted || []).map(id => [id, 1]));
    const id = idOf(call.prompt);
    if (has(call.schema, 'found')) return { output: { found: (s.posted[id] || 0) > 0 }, duration: 500 };
    if (/intent\.py record/.test(call.prompt)) return { output: `intent recorded for ${id}`, duration: 300 };
    if (/\bwrite T-\d+/.test(call.prompt)) {
      if ((test.dieBeforeCommit || []).includes(id)) return { fail: BEFORE_COMMIT, duration: 800 };
      s.posted[id] = (s.posted[id] || 0) + 1;
      if ((test.dieAfterCommit || []).includes(id) && s.posted[id] === 1) return { fail: 'committed, then the connection dropped', duration: 1000 };
      return { output: `comment posted on ${id}`, duration: 1000 };
    }
    return { output: 'unknown step', duration: 500 };
  },
  tests: [
    { name: 'clean run', args: { items: ['T-1', 'T-2'], pending: [] }, expected: { done: ['T-1', 'T-2'], reconcile: [] } },
    { name: 'write dies after committing', args: { items: ['T-1', 'T-2', 'T-3'], pending: [] }, dieAfterCommit: ['T-2'], expected: { done: ['T-1', 'T-2', 'T-3'], reconcile: [] } },
    { name: 'write dies before committing', args: { items: ['T-1', 'T-2'], pending: [] }, dieBeforeCommit: ['T-2'], expected: { done: ['T-1'], reconcile: ['T-2'] } },
    { name: 'resume with pending intents', args: { items: ['T-1', 'T-2', 'T-3'], pending: ['T-1', 'T-3'] }, alreadyPosted: ['T-1'], expected: { done: ['T-1', 'T-2'], reconcile: ['T-3'] } },
  ].map(t => ({
    ...t,
    check: (r, run) => {
      const agents = run.trace.agents;
      for (const w of agents.filter(isWrite)) {
        const id = idOf(w.prompt);
        if (t.args.pending.includes(id)) return `${id} had a pending intent, so it must be read back, not written again.`;
        if (!agents.some(a => isIntent(a) && idOf(a.prompt) === id && a.end != null && a.end <= w.start)) {
          return `write ${id} started before its intent was recorded (run "intent.py record ${id}" first, and await it).`;
        }
      }
      for (const id of t.args.items) {
        const commits = ((t.alreadyPosted || []).includes(id) ? 1 : 0)
          + agents.filter(a => isWrite(a) && idOf(a.prompt) === id && a.note !== BEFORE_COMMIT).length;
        if (commits > 1) return `${id} got ${commits} comments. A null write may already have committed: read back instead of retrying.`;
      }
      return expectEqual(r, t.expected);
    },
  })),
};
