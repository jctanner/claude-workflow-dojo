import { expectEqual } from '../_kit.js';

export default {
  tier: 0,
  title: 'any, all, next, in',
  difficulty: 'Medium',
  category: 'JS',
  goal: "Answer four questions about the services: is any down, are all up, which is the first degraded one, and which required names are missing.",
  concepts: ['.some/.every', '.find', '.includes', '`in` on arrays'],
  python: `any_down = any(s["status"] == "down" for s in services)
all_up = all(s["status"] == "up" for s in services)
first_degraded = next((s["name"] for s in services if s["status"] == "degraded"), None)
names = [s["name"] for s in services]
missing = [r for r in required if r not in names]`,
  description: `
<p><code>args</code> is <code>{services: [{name, status}], required: [names]}</code>. Return
<code>{anyDown, allUp, firstDegraded, missing}</code>. <code>firstDegraded</code> is a name or <code>null</code>, and
<code>missing</code> lists the required names that aren't present.</p>
<ul>
  <li><code>any(...)</code> is <code>.some(fn)</code>, and <code>all(...)</code> is <code>.every(fn)</code>.</li>
  <li><code>next((... for ...), None)</code> is <code>.find(fn)</code>. When nothing matches it returns <code>undefined</code>,
  so <code>.find(fn).name</code> crashes. Use <code>.find(fn)?.name ?? null</code>.</li>
  <li><b>The trap:</b> <code>x in array</code> checks <b>indexes</b>, not values: <code>'auth' in ['auth']</code> is
  <code>false</code>, and <code>0 in ['auth']</code> is <code>true</code>. Use <code>array.includes(x)</code>.
  (<code>in</code> does work for object keys: <code>'auth' in {auth: 1}</code>.)</li>
</ul>`,
  hints: ["services.some(s => s.status === 'down')", 'required.filter(r => !names.includes(r))'],
  tests: [
    {
      name: 'some trouble',
      args: { services: [{ name: 'auth', status: 'up' }, { name: 'billing', status: 'degraded' }, { name: 'cdn', status: 'down' }], required: ['auth', 'search', 'cdn'] },
      expected: { anyDown: true, allUp: false, firstDegraded: 'billing', missing: ['search'] },
    },
    {
      name: 'all healthy',
      args: { services: [{ name: 'auth', status: 'up' }, { name: 'cdn', status: 'up' }], required: ['auth'] },
      expected: { anyDown: false, allUp: true, firstDegraded: null, missing: [] },
    },
  ].map(t => ({ ...t, check: r => expectEqual(r, t.expected) })),
};
