import { expectEqual } from '../_kit.js';

export default {
  tier: 0,
  title: 'Callbacks Inside Callbacks',
  difficulty: 'Medium',
  category: 'JS',
  goal: "Return the names of teams with at least 2 members on call.",
  concepts: ['nested callbacks', 'named helpers', '#6 in disguise'],
  python: `def on_call_count(team):
    return sum(1 for m in team["members"] if m["oncall"])

return [t["team"] for t in args if on_call_count(t) >= 2]`,
  description: `
<p><code>args</code> is an array of <code>{team, members: [{name, oncall}]}</code>. Return the names of teams with at least
<b>2</b> members on call, in order. Treat a member that is <code>null</code> as not on call.</p>
<p>This is exactly the shape of #6, Adversarial Verify (findings → votes → count → keep), without any agents.
Nested one-liners are where JavaScript gets hard to read. The cure is the same as in Python: <b>pull the inner
part out into a named function</b>.</p>
<pre><code>const onCallCount = team =&gt; { … return count }
return args.filter(t =&gt; onCallCount(t) &gt;= 2).map(t =&gt; t.team)</code></pre>
<p>The starter has one bug you've seen before. Fix it, then make it readable.</p>`,
  hints: [
    'The outer filter callback has { braces } but no return (problem 0.1).',
    'Write onCallCount with a plain for…of loop and a let counter, and check m && m.oncall.',
  ],
  tests: [{
    name: 'teams',
    args: [
      { team: 'platform', members: [{ name: 'a', oncall: true }, { name: 'b', oncall: true }, { name: 'c', oncall: false }] },
      { team: 'billing', members: [{ name: 'd', oncall: true }, null, { name: 'e', oncall: false }] },
      { team: 'search', members: [{ name: 'f', oncall: true }, { name: 'g', oncall: true }] },
    ],
    expected: ['platform', 'search'],
  }].map(t => ({ ...t, check: r => expectEqual(r, t.expected) })),
};
