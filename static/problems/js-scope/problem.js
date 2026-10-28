import { expectEqual } from '../_kit.js';

export default {
  tier: 0,
  title: 'Where Names Live',
  difficulty: 'Medium',
  category: 'JS',
  goal: "Return <code>\"high\"</code> or <code>\"low\"</code> from the error count, and the ids whose average score is at least 5.",
  concepts: ['block scope', 'callback scope', 'returning values out'],
  python: `level = "low"
if args["errors"] > 10:
    level = "high"          # Python: names set inside if/for leak out

with_avg = [{**i, "avg": sum(i["scores"]) / len(i["scores"])} for i in args["items"]]
return {"level": level, "passing": [i["id"] for i in with_avg if i["avg"] >= 5]}`,
  description: `
<p><code>args</code> is <code>{errors, items: [{id, scores}]}</code>. Return <code>{level, passing}</code>.
<code>level</code> is <code>'high'</code> if <code>errors &gt; 10</code> and <code>'low'</code> otherwise. <code>passing</code> holds the ids
whose average score is at least 5.</p>
<p>This is the <code>votes is not defined</code> error from #6. In Python, a name assigned inside an <code>if</code> or
<code>for</code> block is visible after it. In JavaScript, <code>const</code> and <code>let</code> live only inside the
<code>{ … }</code> they're declared in, and that includes every callback body.</p>
<ul>
  <li>Need a value after an <code>if</code>? Declare it <b>before</b> the block with <code>let</code>, then assign inside.</li>
  <li>Need a value computed inside a callback? <b>Return it out</b>: <code>args.items.map(i =&gt; ({...i, avg}))</code>, then use
  <code>.avg</code> from the result.</li>
</ul>`,
  hints: ["let level = 'low' before the if, then level = 'high' inside it", 'const withAvg = items.map(i => ({ ...i, avg: … })), then filter on i.avg'],
  tests: [
    { name: 'high', args: { errors: 12, items: [{ id: 'a', scores: [4, 6, 8] }, { id: 'b', scores: [1, 2] }] }, expected: { level: 'high', passing: ['a'] } },
    { name: 'low', args: { errors: 3, items: [{ id: 'x', scores: [5] }] }, expected: { level: 'low', passing: ['x'] } },
  ].map(t => ({ ...t, check: r => expectEqual(r, t.expected) })),
};
