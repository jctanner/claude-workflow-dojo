import { expectEqual } from '../_kit.js';

export default {
  tier: 0,
  title: 'Callbacks Count Arguments, Not Names',
  difficulty: 'Medium',
  category: 'JS',
  goal: "Convert the numeric strings to numbers, and number the names as <code>\"1. auth\"</code>, <code>\"2. billing\"</code>, ….",
  concepts: ['callback signatures', '(item, index)', 'parseInt trap'],
  python: `numbers = [int(x) for x in args["values"]]
labels = [f"{i + 1}. {name}" for i, name in enumerate(args["names"])]`,
  description: `
<p><code>args</code> is <code>{values, names}</code>, where <code>values</code> are numeric strings. Return
<code>{numbers, labels}</code>. <code>numbers</code> holds the values as numbers, and <code>labels</code> holds strings like
<code>"1. auth"</code>.</p>
<p>JavaScript calls your callback with <b>positional</b> arguments, whatever you name them:
<code>.map((item, index, array) =&gt; …)</code>. Python's <code>enumerate</code> gives <code>(i, item)</code>, but JavaScript's order is
<b>item first</b>. Extra arguments are passed silently:</p>
<ul>
  <li><code>['10','20','30'].map(parseInt)</code> calls <code>parseInt('20', 1)</code>, because the index becomes the radix.
  The result is <code>[10, NaN, NaN]</code>.</li>
  <li><code>(i, name) =&gt; …</code> doesn't swap anything. <code>i</code> just becomes the name.</li>
</ul>
<p>Workflow <code>pipeline()</code> stages work the same way: <code>(prevResult, originalItem, index)</code>.</p>`,
  hints: [
    'values.map(v => Number(v)), or wrap it: v => parseInt(v, 10)',
    'names.map((name, i) => `${i + 1}. ${name}`)',
  ],
  tests: [{
    name: 'numbers and labels',
    args: { values: ['10', '20', '30', '7'], names: ['auth', 'billing', 'search'] },
    expected: { numbers: [10, 20, 30, 7], labels: ['1. auth', '2. billing', '3. search'] },
  }].map(t => ({
    ...t,
    check: r => (r && Array.isArray(r.numbers) && r.numbers.some(n => n === null || Number.isNaN(n))
      ? 'Some numbers came back as NaN (shown as null). map passes (item, index), so parseInt received the index as its radix.'
      : expectEqual(r, t.expected)),
  })),
};
