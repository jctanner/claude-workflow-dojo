import { expectEqual, has } from '../_kit.js';

const idOf = p => (/T-\d+/.exec(p) || ['?'])[0];

export default {
  tier: 2,
  title: 'Gate on Recorded Coverage',
  difficulty: 'Medium',
  category: 'Pattern',
  goal: "Publish once, then review only the items the publish step says it covered, and return those ids.",
  concepts: ['stage gating', 'coverage sets', 'deliberate skips'],
  description: `
<p><b>Production pattern:</b> a later stage may only act on what an earlier stage <i>recorded</i> as done for that item.
Example: only review what was actually published, because a review of text nobody can see would be posted again on the
next run. Coverage is per item: a publish step can succeed overall but cover only some items.</p>
<ol>
  <li>Run one publish step: its prompt contains <code>publish</code>, with schema <code>PUBLISHED</code>. It returns
  <code>{recorded: 'publish', items: [...]}</code>, or <code>null</code>.</li>
  <li>Review (prompt <code>review &lt;id&gt;</code>, concurrently) only the items the publish step covered.</li>
  <li><code>log()</code> one line naming every item that was <b>not</b> reviewed because it wasn't published.</li>
</ol>
<p>Return the ids reviewed, in input order.</p>`,
  hints: ["const covered = new Set(pub && pub.recorded === 'publish' ? pub.items : [])"],
  respond(call, test) {
    if (has(call.schema, 'recorded')) {
      if (test.covered === null) return { fail: 'publish failed', duration: 800 };
      return { output: { recorded: 'publish', items: test.covered }, duration: 800 };
    }
    return { output: `reviewed ${idOf(call.prompt)}`, duration: 1000 };
  },
  tests: [
    { name: 'partial coverage', args: ['T-1', 'T-2', 'T-3'], covered: ['T-1', 'T-3'], expected: ['T-1', 'T-3'], unreviewed: ['T-2'] },
    { name: 'publish failed', args: ['T-1', 'T-2'], covered: null, expected: [], unreviewed: ['T-1', 'T-2'] },
  ].map(t => ({
    ...t,
    check: (r, run) => {
      const bad = expectEqual(r, t.expected);
      if (bad) return bad;
      const reviewedPrompts = run.trace.agents.filter(a => /review/.test(a.prompt)).map(a => idOf(a.prompt));
      const leaked = reviewedPrompts.filter(id => !t.expected.includes(id));
      if (leaked.length) return `Reviewed unpublished item(s): ${leaked.join(', ')}`;
      const logs = run.trace.logs.map(l => l.message).join('\n');
      const silent = t.unreviewed.filter(id => !logs.includes(id));
      return silent.length ? `Log the items skipped for lack of coverage: ${silent.join(', ')}` : null;
    },
  })),
};
