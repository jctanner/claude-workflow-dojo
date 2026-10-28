import { expectEqual } from '../_kit.js';

const idOf = p => (/T-\d+/.exec(p) || ['?'])[0];
const SCORE = { 'T-1': 1000, 'T-2': 4000, 'T-3': 1000, 'T-4': 3000 };
const REVIEW = { 'T-1': 4000, 'T-2': 1000, 'T-3': 3000, 'T-4': 1000 };

export default {
  tier: 2,
  title: 'Drop One Item, Keep the Rest',
  difficulty: 'Hard',
  category: 'Pattern',
  goal: "Score each item, then review it using its score. Drop items whose score failed, and keep going with the rest.",
  concepts: ['throw inside a pipeline stage', 'per-item failure', 'no barrier'],
  description: `
<p><b>Production pattern:</b> a two-stage chain per item (score, then review using that score) as a
<code>pipeline</code>. If an item's score fails, that item must <b>not</b> be reviewed (there's nothing to review from),
but the other items carry on. In a pipeline, <code>throw</code> inside a stage drops just that item to
<code>null</code> and skips its remaining stages.</p>
<ul>
  <li>Stage 1: prompt <code>score &lt;id&gt;</code>. Its answer is a directory path. On <code>null</code>, record the failure and <code>throw</code>.</li>
  <li>Stage 2: prompt <code>review &lt;id&gt; --scores-from &lt;dir&gt;</code>.</li>
</ul>
<p>Return <code>{reviewed, failed}</code> (ids, in input order). Durations vary per item, so a barrier between the stages
blows the <b>5.5s</b> limit.</p>`,
  hints: [
    'pipeline(args, async id => { const dir = await agent(`score ${id}`); if (dir === null) { failed.push(id); throw new Error(`score ${id}`) } return dir }, (dir, id) => agent(`review ${id} --scores-from ${dir}`))',
    'The pipeline result has null for dropped items: filter by index.',
  ],
  wallClockMs: 5500,
  respond(call, test) {
    const id = idOf(call.prompt);
    if (/score/.test(call.prompt) && !/review/.test(call.prompt)) {
      if (test.down.includes(id)) return { fail: 'scorer died', duration: SCORE[id] };
      return { output: `/tmp/scores/${id}`, duration: SCORE[id] };
    }
    if (!call.prompt.includes(`--scores-from /tmp/scores/${id}`)) return { output: 'review without scores', duration: REVIEW[id] };
    return { output: `reviewed ${id}`, duration: REVIEW[id] };
  },
  tests: [
    { name: 'one scorer dies', args: ['T-1', 'T-2', 'T-3', 'T-4'], down: ['T-2'], expected: { reviewed: ['T-1', 'T-3', 'T-4'], failed: ['T-2'] } },
    { name: 'all good', args: ['T-1', 'T-2', 'T-3', 'T-4'], down: [], expected: { reviewed: ['T-1', 'T-2', 'T-3', 'T-4'], failed: [] } },
  ].map(t => ({
    ...t,
    check: (r, run) => {
      const bad = expectEqual(r, t.expected);
      if (bad) return bad;
      const reviewedDead = run.trace.agents.filter(a => /review/.test(a.prompt) && t.down.includes(idOf(a.prompt)));
      if (reviewedDead.length) return 'An item whose score failed was still reviewed.';
      const noScores = run.trace.agents.filter(a => a.output === 'review without scores');
      return noScores.length ? 'Each review prompt must include --scores-from <the dir that item\'s score returned>.' : null;
    },
  })),
};
