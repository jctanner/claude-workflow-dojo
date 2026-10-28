import { expectEqual, mentioned } from '../_kit.js';

const FILES = ['api.py', 'db.py', 'cli.py'];

export default {
  tier: 0,
  title: '.then() Is await, Later',
  difficulty: 'Medium',
  category: 'JS',
  goal: "Summarize every file at the same time and return <code>[{file, summary}]</code> in input order.",
  concepts: ['.then()', 'fire-and-forget', 'return values from promises'],
  python: `async def one(f):
    summary = await agent(f"Summarize {f}")
    return {"file": f, "summary": summary}

return await asyncio.gather(*(one(f) for f in args))`,
  description: `
<p><code>args</code> is a list of files. Return <code>[{file, summary}]</code> in input order, with every agent running
concurrently (each takes 1s, and the limit is 1.5s).</p>
<p>You'll see <code>.then()</code> in Claude-written workflows. <code>p.then(x =&gt; f(x))</code> means "when <code>p</code>
finishes, run <code>f</code> on its value". It returns a <b>new promise</b> of <code>f</code>'s result. So these two are the same:</p>
<pre><code>agent(prompt).then(s =&gt; ({ file, summary: s }))
(async () =&gt; ({ file, summary: await agent(prompt) }))()</code></pre>
<p>The starter makes the classic mistake: it pushes into an outer array from inside <code>.then</code> and never awaits.
The script returns <code>[]</code> before any agent finishes, and the simulator warns about orphaned agents. Return values
out of the promise instead of pushing them.</p>`,
  hints: ['await parallel(args.map(f => () => agent(`Summarize ${f}`).then(summary => ({ file: f, summary }))))'],
  wallClockMs: 1500,
  respond(call) {
    const f = mentioned(call.prompt, FILES);
    return { output: `${f || 'unknown'} summary`, duration: 1000 };
  },
  tests: [{
    name: 'three files',
    args: FILES,
    expected: FILES.map(file => ({ file, summary: `${file} summary` })),
  }].map(t => ({ ...t, check: r => expectEqual(r, t.expected) })),
};
