import { expectEqual } from '../_kit.js';

export default {
  tier: 0,
  title: "Objects Aren't Quite Dicts",
  difficulty: 'Medium',
  category: 'JS',
  goal: "Return the <code>[name, count]</code> pairs sorted by count (highest first), and the total.",
  concepts: ['Object.entries', 'for…of vs for…in', 'reduce'],
  python: `ranked = sorted(args.items(), key=lambda kv: kv[1], reverse=True)
total = sum(args.values())
return {"ranked": [list(kv) for kv in ranked], "total": total}`,
  description: `
<p><code>args</code> is an object of counts, such as <code>{auth: 3, billing: 7, search: 1}</code>. Return
<code>{ranked, total}</code>. <code>ranked</code> is the <code>[name, count]</code> pairs, highest count first, and
<code>total</code> is the sum.</p>
<ul>
  <li>There is no <code>.items()</code>, <code>.keys()</code> or <code>.values()</code> on objects. Use
  <code>Object.entries(obj)</code>, <code>Object.keys(obj)</code> and <code>Object.values(obj)</code>.</li>
  <li><code>for (const x of array)</code> iterates values, like Python's <code>for</code>.
  <code>for (const k in array)</code> iterates <b>string indexes</b>. Avoid <code>in</code> on arrays.</li>
  <li>There is no <code>sum()</code>. Use <code>xs.reduce((acc, x) =&gt; acc + x, 0)</code>, or a plain loop.</li>
</ul>`,
  hints: [
    'Object.entries(args) gives [["auth", 3], ...]',
    'Object.values(args).reduce((a, b) => a + b, 0)',
  ],
  tests: [{
    name: 'counts',
    args: { auth: 3, billing: 7, search: 1, cdn: 4 },
    expected: { ranked: [['billing', 7], ['cdn', 4], ['auth', 3], ['search', 1]], total: 15 },
  }].map(t => ({ ...t, check: r => expectEqual(r, t.expected) })),
};
