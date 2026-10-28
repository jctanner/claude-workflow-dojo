import { expectEqual } from '../_kit.js';

export default {
  tier: 2,
  title: "Skip What's Already Done",
  difficulty: 'Easy',
  category: 'Pattern',
  goal: "Process only the items that aren't already done or review-only, log which ones you skipped, and return the answers.",
  concepts: ['resume points', 'Set membership', 'log what you skipped'],
  description: `
<p><b>Production pattern:</b> long pipelines get re-run after a failure. Saved progress says what's already done, and
the rerun must not redo it, because redoing a step can repeat a side effect such as a second Jira comment.</p>
<p><code>args</code> is <code>{items, done, reviewOnly}</code>. Process (prompt <code>process &lt;id&gt;</code>, concurrently)
only the items that are in neither <code>done</code> nor <code>reviewOnly</code>, and return their answers in order.
<code>log()</code> one line naming the skipped items, so the run explains itself.</p>`,
  hints: ['const skip = new Set([...args.done, ...args.reviewOnly])', 'const todo = args.items.filter(id => !skip.has(id))'],
  respond(call) {
    const id = (/T-\d+/.exec(call.prompt) || ['?'])[0];
    return { output: `done ${id}`, duration: 1000 };
  },
  tests: [
    { name: 'partial rerun', args: { items: ['T-1', 'T-2', 'T-3', 'T-4'], done: ['T-2'], reviewOnly: ['T-4'] }, expected: ['done T-1', 'done T-3'], skipped: ['T-2', 'T-4'] },
    { name: 'nothing left', args: { items: ['T-1'], done: ['T-1'], reviewOnly: [] }, expected: [], skipped: ['T-1'] },
  ].map(t => ({
    ...t,
    check: (r, run) => {
      const bad = expectEqual(r, t.expected);
      if (bad) return bad;
      const logs = run.trace.logs.map(l => l.message).join('\n');
      const silent = t.skipped.filter(id => !logs.includes(id));
      return silent.length ? `Skipped items should be logged; no log line mentions ${silent.join(', ')}` : null;
    },
  })),
};
