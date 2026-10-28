import { expectEqual } from '../_kit.js';

export default {
  tier: 0,
  title: 'Sets and Maps',
  difficulty: 'Easy',
  category: 'JS',
  goal: "Return the items not yet done, how many distinct items are done, and the latest status for each event key.",
  concepts: ['new Set / .has / .size', 'new Map / .get / .set', 'Object.fromEntries'],
  python: `done = set(args["done"])
todo = [k for k in args["items"] if k not in done]
latest = {}
for e in args["events"]:
    latest[e["key"]] = e["status"]
return {"todo": todo, "doneCount": len(done), "latest": latest}`,
  description: `
<p><code>args</code> is <code>{items, done, events}</code>. Return <code>{todo, doneCount, latest}</code>:</p>
<ul>
  <li><code>todo</code>: the items not in <code>done</code>, in order.</li>
  <li><code>doneCount</code>: how many distinct keys are in <code>done</code>.</li>
  <li><code>latest</code>: each event key mapped to its last status.</li>
</ul>
<p>Workflows track progress with these constantly, as in "already refined" or "already pushed":</p>
<ul>
  <li><code>new Set(array)</code> is <code>set(...)</code>. Membership is <code>s.has(x)</code>, not <code>in</code> or <code>.includes</code>.
  Use <code>s.add(x)</code> to add and <code>s.size</code> for the count (not <code>.length</code>). Spread it back to an array with <code>[...s]</code>.</li>
  <li><code>new Map()</code> is a dict with <code>.get(k)</code>, <code>.set(k, v)</code>, <code>.has(k)</code> and <code>.size</code>.
  A plain object <code>{}</code> also works for string keys.</li>
  <li><b>Trap:</b> a Map or Set turns into <code>{}</code> when serialized as a result. Convert before returning:
  <code>Object.fromEntries(map)</code> or <code>[...set]</code>.</li>
</ul>`,
  hints: ['done.has(k), done.size', 'return { …, latest: Object.fromEntries(latest) }'],
  tests: [{
    name: 'progress',
    args: { items: ['T-1', 'T-2', 'T-3', 'T-4'], done: ['T-2', 'T-4', 'T-2'], events: [{ key: 'T-1', status: 'queued' }, { key: 'T-3', status: 'queued' }, { key: 'T-1', status: 'done' }] },
    expected: { todo: ['T-1', 'T-3'], doneCount: 2, latest: { 'T-1': 'done', 'T-3': 'queued' } },
  }].map(t => ({
    ...t,
    check: r => (r && (r.latest instanceof Map || r.todo instanceof Set)
      ? 'You returned a Map or Set, which serializes as {}. Convert it: Object.fromEntries(map) or [...set].'
      : expectEqual(r, t.expected)),
  })),
};
