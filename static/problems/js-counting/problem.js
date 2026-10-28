import { expectEqual } from '../_kit.js';

export default {
  tier: 0,
  title: 'Counter Without Counter',
  difficulty: 'Medium',
  category: 'JS',
  goal: "Count events per service, collect each service's ERROR messages, and name the busiest service.",
  concepts: ['counting into objects', 'undefined + 1', 'grouping'],
  python: `from collections import Counter, defaultdict
by_service = Counter(e["service"] for e in args)
errors = defaultdict(list)
for e in args:
    if e["level"] == "ERROR":
        errors[e["service"]].append(e["msg"])
top = by_service.most_common(1)[0][0]`,
  description: `
<p><code>args</code> is an array of events <code>{service, level, msg}</code>. Return
<code>{byService, errors, top}</code>:</p>
<ul>
  <li><code>byService</code>: the event count per service.</li>
  <li><code>errors</code>: per service, the <code>msg</code> of each <code>ERROR</code> event.</li>
  <li><code>top</code>: the service with the most events.</li>
</ul>
<p>There is no <code>Counter</code> or <code>defaultdict</code>. A plain object works, but a missing key is <code>undefined</code>,
and <code>undefined + 1</code> is <code>NaN</code>. That happens silently, with no <code>KeyError</code>. Supply the default yourself:</p>
<ul>
  <li><code>counts[k] = (counts[k] ?? 0) + 1</code></li>
  <li><code>(groups[k] ??= []).push(x)</code>. <code>??=</code> assigns only if the key is missing, like <code>setdefault</code>.</li>
</ul>
<p>Workflows do this when tallying votes or grouping findings by file.</p>`,
  hints: ['byService[e.service] = (byService[e.service] ?? 0) + 1', 'Object.entries(byService).sort((a, b) => b[1] - a[1])[0][0]'],
  tests: [{
    name: 'events',
    args: [
      { service: 'auth', level: 'ERROR', msg: 'token expired' },
      { service: 'cdn', level: 'INFO', msg: 'purge' },
      { service: 'auth', level: 'INFO', msg: 'login' },
      { service: 'auth', level: 'ERROR', msg: 'lockout' },
      { service: 'cdn', level: 'ERROR', msg: '502' },
    ],
    expected: { byService: { auth: 3, cdn: 2 }, errors: { auth: ['token expired', 'lockout'], cdn: ['502'] }, top: 'auth' },
  }].map(t => ({
    ...t,
    check: r => (r && r.byService && Object.values(r.byService).some(v => v === null || Number.isNaN(v))
      ? 'byService contains NaN (shown as null): undefined + 1 is NaN. Start each count at 0 with ?? 0.'
      : expectEqual(r, t.expected)),
  })),
};
