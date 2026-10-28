import { expectEqual } from '../_kit.js';

export default {
  tier: 0,
  title: "None Has Two Cousins",
  difficulty: 'Medium',
  category: 'JS',
  goal: "Fill in missing job settings with defaults (30 seconds, 2 retries, team \"unowned\") without overwriting real zeros.",
  concepts: ['null vs undefined', '?? vs ||', 'optional chaining ?.'],
  python: `timeout = job.get("timeoutSec")
timeout = 30 if timeout is None else timeout     # not: job.get(...) or 30
retries = 2 if job.get("retries") is None else job["retries"]
owner = (job.get("owner") or {}).get("team", "unowned")`,
  description: `
<p><code>args</code> is an array of jobs. Return <code>[{name, timeoutSec, retries, team}]</code> with defaults:
<code>timeoutSec</code> 30, <code>retries</code> 2, and <code>team</code> <code>'unowned'</code>.</p>
<ul>
  <li>JavaScript has two "nothing" values. <code>undefined</code> means missing, such as an absent key or a function with no return.
  <code>null</code> means deliberately empty, and it's what a failed <code>agent()</code> returns.</li>
  <li><code>a || b</code> falls back on <i>any</i> falsy value, including <code>0</code> and <code>''</code>, which is Python's <code>or</code> trap.
  <code>a ?? b</code> falls back only on <code>null</code> or <code>undefined</code>.</li>
  <li><code>job.owner?.team</code> gives <code>undefined</code> instead of crashing when <code>owner</code> is missing. In workflows you'll write
  <code>result?.findings ?? []</code> constantly.</li>
</ul>
<p>Here <code>0</code> is a real setting: a timeout of 0 means "none", and 0 retries means "don't retry".</p>`,
  hints: [
    'job.timeoutSec ?? 30 keeps 0; job.timeoutSec || 30 does not.',
    "job.owner?.team ?? 'unowned'",
  ],
  tests: [{
    name: 'zeros are real values',
    args: [
      { name: 'build', timeoutSec: 0, retries: 0, owner: { team: 'ci' } },
      { name: 'deploy', owner: null },
      { name: 'lint', timeoutSec: null, retries: 5, owner: {} },
    ],
    expected: [
      { name: 'build', timeoutSec: 0, retries: 0, team: 'ci' },
      { name: 'deploy', timeoutSec: 30, retries: 2, team: 'unowned' },
      { name: 'lint', timeoutSec: 30, retries: 5, team: 'unowned' },
    ],
  }].map(t => ({ ...t, check: r => expectEqual(r, t.expected) })),
};
