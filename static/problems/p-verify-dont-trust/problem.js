import { expectEqual, has } from '../_kit.js';

const idOf = p => (/T-\d+/.exec(p) || ['?'])[0];

export default {
  tier: 2,
  title: "Verify, Don't Trust",
  difficulty: 'Medium',
  category: 'Pattern',
  goal: "Process every item, then let a checkpoint agent decide which ones are really done. Return <code>{done, failed}</code>.",
  concepts: ['receipts vs evidence', 'checkpoint step', 'reconcile and log'],
  description: `
<p><b>Production pattern:</b> an agent's receipt ("I did it") is a claim, not proof. A step can do the work and then
lose its handoff, or hand back a plausible receipt for work it never finished. So after a fan-out, one
<b>checkpoint</b> step reads the real state (on disk, in a DB), and <i>that</i> decides what's done.</p>
<ol>
  <li>Process each item concurrently (prompt <code>process &lt;id&gt;</code>, schema <code>RECEIPT</code>). These are the receipts.</li>
  <li>Run one checkpoint agent: its prompt contains <code>state.py verify</code>, schema <code>VERIFIED</code>.</li>
  <li><code>done</code> is the items the checkpoint lists, and <code>failed</code> is everything else, both in input order. If the checkpoint
  returns <code>null</code>, everything has failed.</li>
  <li><code>log()</code> each item whose receipt was missing or wrong but the checkpoint says is done ("receipt missing,
  verified from saved state"). That line is informational, not a failure.</li>
</ol>
<p>Return <code>{done, failed}</code>.</p>`,
  hints: ['const verified = new Set(check ? check.done : [])', 'Compare receipts[i]?.recorded with args[i] only to decide what to log.'],
  respond(call, test) {
    if (has(call.schema, 'done')) {
      if (test.verified === null) return { fail: 'checkpoint died', duration: 500 };
      return { output: { done: test.verified }, duration: 500 };
    }
    const id = idOf(call.prompt);
    const r = test.receipts[id];
    if (r === null) return { fail: 'handoff lost', duration: 1000 };
    return { output: { recorded: r }, duration: 1000 };
  },
  tests: [
    { name: 'receipts lie both ways', args: ['T-1', 'T-2', 'T-3'], receipts: { 'T-1': 'T-1', 'T-2': null, 'T-3': 'T-3' }, verified: ['T-1', 'T-2'], expected: { done: ['T-1', 'T-2'], failed: ['T-3'] }, logged: ['T-2'] },
    { name: 'checkpoint lost', args: ['T-1', 'T-2'], receipts: { 'T-1': 'T-1', 'T-2': 'T-2' }, verified: null, expected: { done: [], failed: ['T-1', 'T-2'] }, logged: [] },
  ].map(t => ({
    ...t,
    check: (r, run) => expectEqual(r, t.expected)
      || (t.logged.some(id => !run.trace.logs.some(l => l.message.includes(id)))
        ? `Log the items whose receipt was missing but which the checkpoint verified (${t.logged.join(', ')}).` : null),
  })),
};
