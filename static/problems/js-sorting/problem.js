import { expectEqual } from '../_kit.js';

export default {
  tier: 0,
  title: 'Sorting Surprises',
  difficulty: 'Easy',
  category: 'JS',
  goal: "Return the names of the 3 slowest timings, slowest first.",
  concepts: ['.sort()', 'comparators', 'in-place mutation', 'slice'],
  python: `slowest = sorted(args, key=lambda r: r["ms"], reverse=True)[:3]
return [r["name"] for r in slowest]`,
  description: `
<p><code>args</code> is an array of <code>{name, ms}</code> timings. Return the <b>names</b> of the 3 slowest, slowest first.</p>
<p>Three ways JavaScript's <code>sort</code> differs from Python's <code>sorted</code>:</p>
<ul>
  <li>It is a <b>method</b> (<code>xs.sort()</code>), and there is no free <code>sort(xs)</code> function.</li>
  <li>It sorts <b>in place</b> and returns the same array, like <code>list.sort()</code>. Copy first with <code>[...xs].sort()</code> when the original matters.</li>
  <li>With no comparator it compares as <b>strings</b>: <code>[100, 9, 80].sort()</code> gives <code>[100, 80, 9]</code>. There is no
  <code>key=</code>. Pass a comparator that returns a negative number, zero or a positive number: <code>(a, b) =&gt; b.ms - a.ms</code>.</li>
</ul>`,
  hints: [
    'Copy, then sort descending: [...args].sort((a, b) => b.ms - a.ms)',
    '.slice(0, 3) is Python\'s [:3], and .map(r => r.name) is the comprehension.',
  ],
  tests: [
    {
      name: 'numbers that sort wrong as strings',
      args: [{ name: 'auth', ms: 9 }, { name: 'billing', ms: 100 }, { name: 'search', ms: 80 }, { name: 'cdn', ms: 7 }, { name: 'db', ms: 1200 }],
      expected: ['db', 'billing', 'search'],
    },
    {
      name: 'already ascending',
      args: [{ name: 'a', ms: 1 }, { name: 'b', ms: 2 }, { name: 'c', ms: 3 }, { name: 'd', ms: 4 }],
      expected: ['d', 'c', 'b'],
    },
  ].map(t => ({ ...t, check: r => expectEqual(r, t.expected) })),
};
