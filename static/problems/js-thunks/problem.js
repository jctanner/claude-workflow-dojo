import { expectEqual, mentioned } from '../_kit.js';

const MIRRORS = ['mirror-a', 'mirror-b', 'mirror-c', 'mirror-d'];

export default {
  tier: 0,
  title: 'Thunks: Recipes, Not Cooking',
  difficulty: 'Medium',
  category: 'JS',
  goal: "Try the mirrors in order and return the first report that comes back, without starting agents for the mirrors after it.",
  concepts: ['thunk = () => work', 'eager promises', 'lazy fallback'],
  python: `# In Python, calling an async function does NOT start it; awaiting does.
for m in args:
    data = await agent(f"Fetch the report from {m}")   # starts only when awaited
    if data is not None:
        return {"mirror": m, "data": data}
return None

thunk = lambda: agent("...")   # a thunk: a zero-argument function you call later`,
  description: `
<p>A <b>thunk</b> is a function with no arguments that does some work <i>when it's called</i>:
<code>const thunk = () =&gt; agent('…')</code>. Defining it does nothing. Calling <code>thunk()</code> starts the work.</p>
<p>This matters because JavaScript is <b>eager</b>: <code>agent(prompt)</code> starts the agent the moment you call it,
whether or not you ever <code>await</code> it. Python's coroutines don't start until awaited, so this one is easy to miss.</p>
<p><b>Task:</b> <code>args</code> is a list of mirrors, in preference order. Fetch the report from the first mirror that
works. The prompt is <code>Fetch the report from &lt;mirror&gt;</code>, and a dead mirror's agent returns <code>null</code>. Return
<code>{mirror, data}</code>, or <code>null</code> if every mirror is dead.</p>
<p>The catch: don't spend agents on mirrors you don't need. If <code>mirror-b</code> answers, <code>mirror-c</code> and
<code>mirror-d</code> must never start. The starter returns the right answer but starts every agent up front.</p>
<p>This is also why <code>parallel()</code> wants thunks. Given <code>() =&gt; agent(…)</code>, it decides <i>when</i> each agent
starts (respecting the concurrency cap) and catches the ones that fail.</p>`,
  hints: [
    'Make a list of thunks: args.map(m => () => agent(`Fetch the report from ${m}`))',
    'Loop over the thunks and call each one only when you get to it: const data = await thunk()',
    'Or skip the list entirely: a for…of loop with await inside is lazy too.',
  ],
  respond(call, test) {
    const m = mentioned(call.prompt, MIRRORS);
    if (!m || test.down.includes(m)) return { fail: 'mirror unreachable', duration: 500 };
    return { output: `report from ${m}`, duration: 500 };
  },
  tests: [
    { name: 'second mirror works', args: MIRRORS, down: ['mirror-a'], expected: { mirror: 'mirror-b', data: 'report from mirror-b' }, needed: 2 },
    { name: 'first mirror works', args: MIRRORS, down: [], expected: { mirror: 'mirror-a', data: 'report from mirror-a' }, needed: 1 },
    { name: 'all dead', args: MIRRORS, down: MIRRORS, expected: null, needed: 4 },
  ].map(t => ({
    ...t,
    check: (r, run) => expectEqual(r, t.expected)
      || (run.stats.agents > t.needed
        ? `Right answer, but you started ${run.stats.agents} agents when ${t.needed} would do. agent() starts work the moment it is called, so wrap each call in a thunk and call it only when you need it.`
        : null),
  })),
};
