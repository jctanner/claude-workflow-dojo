import { expectEqual } from '../_kit.js';

export default {
  tier: 0,
  title: 'f-strings Are Backticks',
  difficulty: 'Easy',
  category: 'JS',
  goal: "Return the sentence <code>service &lt;service&gt; has &lt;count&gt; open incidents</code>, with \"incident\" (singular) when the count is 1.",
  concepts: ['template literals', 'ternary', 'string building'],
  python: `s = "" if count == 1 else "s"
return f"service {service} has {count} open incident{s}"`,
  description: `
<p><code>args</code> is <code>{service, count}</code>. Return a sentence like
<code>service api has 3 open incidents</code>, or <code>… 1 open incident</code> for exactly one.</p>
<ul>
  <li>Only <b>backticks</b> interpolate: <code>\`has \${count}\`</code>. In <code>'single'</code> or <code>"double"</code> quotes,
  <code>\${count}</code> stays literal text. There is no <code>f</code> prefix.</li>
  <li>Python's <code>a if cond else b</code> is <code>cond ? a : b</code> in JavaScript.</li>
  <li>Equality is <code>===</code>. Plain <code>==</code> coerces types (<code>'1' == 1</code> is true), so avoid it.</li>
</ul>
<p>Every agent prompt you write in a workflow is a template literal.</p>`,
  hints: [
    'Swap the quotes for backticks.',
    "const s = args.count === 1 ? '' : 's'",
  ],
  tests: [
    { name: 'plural', args: { service: 'api', count: 3 }, expected: 'service api has 3 open incidents' },
    { name: 'singular', args: { service: 'billing', count: 1 }, expected: 'service billing has 1 open incident' },
    { name: 'zero', args: { service: 'cdn', count: 0 }, expected: 'service cdn has 0 open incidents' },
  ].map(t => ({
    ...t,
    check: r => (typeof r === 'string' && r.includes('${')
      ? 'Your string still contains ${...}: only backtick strings interpolate.'
      : expectEqual(r, t.expected)),
  })),
};
