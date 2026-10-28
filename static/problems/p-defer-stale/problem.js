import { expectEqual, has } from '../_kit.js';

const idOf = p => (/T-\d+/.exec(p) || ['?'])[0];
const isFinalize = a => /^finalize/.test(a.prompt);
const isReview = a => /^review T-/.test(a.prompt);
const CHANGED = 'input edited after approval';

export default {
  tier: 2,
  title: 'Defer One, Finish the Rest',
  difficulty: 'Medium',
  category: 'Pattern',
  goal: "Defer each item whose freshness check says stale (with its reason), review and finalize the rest, and throw only if the checker itself is down for every item.",
  concepts: ['per-item deferral', 'valid refusal vs shared failure', 'barrier before a batch step'],
  description: `
<p><b>Production pattern:</b> a real batch of six items failed because a person edited one item's input after it was
approved. The freshness check was <i>right</i> to refuse that item, but the workflow applied the refusal to the whole
batch, so five unchanged items were blocked too. One stale item is that item's problem. A checker that fails for
<b>every</b> item is a shared problem, and that should stop the batch.</p>
<ol>
  <li>For each item, check freshness (prompt <code>check freshness of &lt;id&gt;</code>, schema <code>FRESH</code>). If
  <code>fresh</code> is false, defer the item with the check's <code>reason</code>. If the check returns <code>null</code>,
  defer it with the reason <code>check failed</code>.</li>
  <li>Review each item that isn't deferred (prompt <code>review &lt;id&gt;</code>). Don't wait for every check first.</li>
  <li>If every check returned <code>null</code>, throw an error whose message contains <code>freshness check</code>.</li>
  <li>Once all reviews are done, run one batch step, <code>finalize &lt;id&gt; &lt;id&gt; …</code>, naming only the
  reviewed items in input order. Skip it when nothing is left.</li>
</ol>
<p>Return <code>{finalized, deferred}</code>: the finalized ids, and <code>[{id, reason}]</code>, both in input order.</p>`,
  hints: [
    "const FRESH = { type: 'object', required: ['fresh', 'reason'], properties: { fresh: { type: 'boolean' }, reason: { type: 'string' } } }",
    'In a pipeline stage, throw to drop just that item; record why before you throw.',
    'finalize needs every review, so awaiting the whole pipeline first is a justified barrier.',
  ],
  respond(call, test) {
    const id = idOf(call.prompt);
    if (has(call.schema, 'fresh')) {
      if (test.checkerDown || (test.checkDown || []).includes(id)) return { fail: 'freshness tool crashed', duration: 600 };
      const stale = (test.stale || []).includes(id);
      return { output: { fresh: !stale, reason: stale ? CHANGED : 'unchanged' }, duration: 600 };
    }
    if (/^review T-/.test(call.prompt)) return { output: `reviewed ${id}`, duration: 1000 + 500 * (Number(id.slice(2)) % 3) };
    if (/^finalize/.test(call.prompt)) return { output: 'finalized', duration: 800 };
    return { output: 'unknown step', duration: 500 };
  },
  tests: [
    {
      name: 'one item edited',
      args: ['T-1', 'T-2', 'T-3', 'T-4', 'T-5', 'T-6'],
      stale: ['T-4'],
      expected: { finalized: ['T-1', 'T-2', 'T-3', 'T-5', 'T-6'], deferred: [{ id: 'T-4', reason: CHANGED }] },
    },
    { name: 'all fresh', args: ['T-1', 'T-2'], expected: { finalized: ['T-1', 'T-2'], deferred: [] } },
    {
      name: 'everything edited',
      args: ['T-1', 'T-2'],
      stale: ['T-1', 'T-2'],
      expected: { finalized: [], deferred: [{ id: 'T-1', reason: CHANGED }, { id: 'T-2', reason: CHANGED }] },
    },
    {
      name: 'one check dies',
      args: ['T-1', 'T-2', 'T-3'],
      checkDown: ['T-2'],
      expected: { finalized: ['T-1', 'T-3'], deferred: [{ id: 'T-2', reason: 'check failed' }] },
    },
    { name: 'checker down', args: ['T-1', 'T-2', 'T-3'], checkerDown: true, expectError: /freshness check/ },
  ].map(t => ({
    ...t,
    check: (r, run) => {
      const agents = run.trace.agents;
      const stale = [...(t.stale || []), ...(t.checkDown || [])];
      const reviewedStale = agents.filter(a => isReview(a) && stale.includes(idOf(a.prompt)));
      if (reviewedStale.length) return `${idOf(reviewedStale[0].prompt)} was stale, so it must not be reviewed.`;
      const fin = agents.filter(isFinalize);
      if (t.expectError) return fin.length ? 'The checker was down, so nothing may be finalized.' : null;
      const want = t.expected.finalized;
      if (!want.length) return fin.length ? 'Nothing was left to finalize, so skip the finalize step.' : expectEqual(r, t.expected);
      if (fin.length !== 1) return `Expected one finalize step, got ${fin.length}.`;
      if (fin[0].prompt !== `finalize ${want.join(' ')}`) return `Expected the prompt "finalize ${want.join(' ')}", got "${fin[0].prompt}".`;
      if (agents.some(a => isReview(a) && (a.end == null || a.end > fin[0].start))) return 'finalize started before every review finished.';
      return expectEqual(r, t.expected);
    },
  })),
};
