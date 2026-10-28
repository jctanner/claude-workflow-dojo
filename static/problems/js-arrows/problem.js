import { expectEqual } from '../_kit.js';

export default {
  tier: 0,
  title: 'Arrows Return… Sometimes',
  difficulty: 'Easy',
  category: 'JS',
  goal: "Return every number in <code>args</code>, doubled.",
  concepts: ['arrow functions', 'implicit return', 'lambda'],
  python: `doubled = [n * 2 for n in args]
# or
doubled = list(map(lambda n: n * 2, args))   # lambda always returns`,
  description: `
<p>Tier 0 scripts are plain JavaScript: no <code>meta</code> block. The script body runs top to bottom and
<code>return</code> gives the answer. <code>args</code> is an array of numbers. Return each one doubled.</p>
<p>The starter looks right but returns <code>[undefined, undefined, …]</code>. JavaScript arrows come in two forms:</p>
<ul>
  <li><code>n =&gt; n * 2</code> has an <b>expression body</b>, which is returned automatically, like a Python <code>lambda</code>.</li>
  <li><code>n =&gt; { n * 2 }</code> has a <b>block body</b>, which is like a <code>def</code>: without <code>return</code> it returns <code>undefined</code>.</li>
</ul>
<p>This exact bug in a workflow, <code>() =&gt; { agent(...) }</code>, makes <code>parallel()</code> collect nothing.</p>`,
  hints: [
    'Delete the braces: `n => n * 2`.',
    'Or keep them and add return: `n => { return n * 2 }`.',
  ],
  tests: [
    { name: 'three numbers', args: [1, 2, 3], expected: [2, 4, 6] },
    { name: 'negatives and zero', args: [-4, 0, 10], expected: [-8, 0, 20] },
  ].map(t => ({
    ...t,
    check: r => (Array.isArray(r) && r.length && r.every(x => x === undefined)
      ? 'Every element is undefined: your arrow has a { block } body with no return. Python analogy: a def without return.'
      : expectEqual(r, t.expected)),
  })),
};
