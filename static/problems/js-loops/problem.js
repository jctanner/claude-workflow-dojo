import { expectEqual } from '../_kit.js';

export default {
  tier: 0,
  title: 'Loops Are Fine',
  difficulty: 'Easy',
  category: 'JS',
  goal: "Return the even numbers, and the index of the first number over 100 (or <code>null</code>).",
  concepts: ['for…of', 'for…in trap', 'forEach can\'t break', 'break/continue'],
  python: `evens, first_big = [], None
for i, n in enumerate(args):
    if n % 2 == 0:
        evens.append(n)
for i, n in enumerate(args):
    if n > 100:
        first_big = i
        break`,
  description: `
<p><code>args</code> is an array of numbers. Return <code>{evens, firstBigIndex}</code>: the even numbers in order, and the
<b>index</b> (a number) of the first value over 100, or <code>null</code> if there isn't one.</p>
<p>You never have to cram logic into <code>.filter(...).map(...)</code> chains. Plain loops are normal, readable JavaScript:</p>
<ul>
  <li><code>for (const x of xs)</code> is Python's <code>for x in xs</code>.</li>
  <li>Need the index? Use <code>for (let i = 0; i &lt; xs.length; i++)</code>, or <code>for (const [i, x] of xs.entries())</code> (that's <code>enumerate</code>).</li>
  <li><b>Trap:</b> <code>for (const i in xs)</code> gives indexes as <b>strings</b> (<code>"3"</code>, not <code>3</code>).</li>
  <li><b>Trap:</b> <code>return</code> inside <code>xs.forEach(x =&gt; …)</code> only ends that one callback. You can't <code>break</code> out of
  <code>forEach</code>, so use a real loop.</li>
  <li><code>%</code> and <code>break</code>/<code>continue</code> work as in Python.</li>
</ul>`,
  hints: ['for (const [i, n] of args.entries()) { if (n > 100) { firstBigIndex = i; break } }', 'Declare it with let firstBigIndex = null'],
  tests: [
    { name: 'has a big one', args: [5, 8, 101, 4, 300], expected: { evens: [8, 4, 300], firstBigIndex: 2 } },
    { name: 'none big', args: [1, 2, 3], expected: { evens: [2], firstBigIndex: null } },
  ].map(t => ({
    ...t,
    check: r => (r && typeof r.firstBigIndex === 'string'
      ? `firstBigIndex is the string "${r.firstBigIndex}": for…in yields string indexes. Use for…of with .entries().`
      : expectEqual(r, t.expected)),
  })),
};
