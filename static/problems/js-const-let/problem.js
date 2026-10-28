import { expectEqual } from '../_kit.js';

export default {
  tier: 0,
  title: "const Isn't Frozen",
  difficulty: 'Easy',
  category: 'JS',
  goal: "Return the sum of the numbers, and the numbers bigger than 10.",
  concepts: ['const vs let', 'declarations', 'mutation'],
  python: `total = 0
big = []
for n in args:
    total += n
    if n > 10:
        big.append(n)
return {"total": total, "big": big}`,
  description: `
<p><code>args</code> is an array of numbers. Return <code>{total, big}</code>: the sum, and the numbers greater than 10 in order.</p>
<p>Python just assigns. JavaScript wants every name <b>declared</b> once:</p>
<ul>
  <li><code>let x = 0</code> declares a name you will <b>reassign</b>, as in <code>x += 1</code>.</li>
  <li><code>const x = []</code> declares a name you will <b>never reassign</b>. The value can still change:
  <code>x.push(1)</code> is fine, but <code>x = []</code> throws <code>Assignment to constant variable</code>.</li>
  <li>Using a name without declaring it, such as <code>count = 0</code>, throws <code>count is not defined</code> in workflow scripts.</li>
</ul>
<p>Rule of thumb: use <code>const</code> everywhere, and switch to <code>let</code> only for counters and accumulators.</p>`,
  hints: ['let total = 0', 'const big = [] is fine, because push changes the array, not the name.'],
  tests: [
    { name: 'some big', args: [3, 12, 7, 40], expected: { total: 62, big: [12, 40] } },
    { name: 'none big', args: [1, 2], expected: { total: 3, big: [] } },
  ].map(t => ({ ...t, check: r => expectEqual(r, t.expected) })),
};
