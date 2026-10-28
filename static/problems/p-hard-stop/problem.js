import { expectEqual, has } from '../_kit.js';

export default {
  tier: 2,
  title: 'Hard Stop on a Missing Handoff',
  difficulty: 'Easy',
  category: 'Pattern',
  goal: "Read the run state with one agent, then process every item. If the read comes back empty, throw an error starting with <code>read:</code> and start nothing else.",
  concepts: ['step agents run scripts', 'null handoff', 'throw with a clear message'],
  description: `
<p><b>Production pattern:</b> a workflow has no shell, so a "step" is an agent told to run a command and return its JSON
through a schema. The first step usually reads the run's state. If that handoff is missing (<code>null</code>), nothing
after it makes sense, so stop <b>deliberately</b>, with a message an on-call engineer can act on.</p>
<p>Run the <code>read</code> step: one agent whose prompt contains <code>state.py read</code>, using the provided
<code>READ</code> schema. Then process each item, one agent per item with the prompt <code>process &lt;id&gt;</code>, concurrently.
Return <code>{runId, processed}</code>.</p>
<p>If <code>read</code> returns <code>null</code>, throw an error whose message starts with <code>read:</code>, and start no
other agents. A crash such as <code>Cannot read properties of null</code> also stops the run, but it tells the person on call nothing.</p>`,
  hints: ["if (!run) throw new Error('read: state.py read returned no result')"],
  respond(call, test) {
    if (has(call.schema, 'run_id')) {
      if (test.readFails) return { fail: 'step agent died', duration: 800 };
      return { output: { run_id: 'run-42', items: ['T-1', 'T-2'] }, duration: 800 };
    }
    const id = (/T-\d+/.exec(call.prompt) || ['?'])[0];
    return { output: `done ${id}`, duration: 1000 };
  },
  tests: [
    { name: 'read works', expected: { runId: 'run-42', processed: ['done T-1', 'done T-2'] } },
    { name: 'read handoff missing', readFails: true, expectError: /^read:/ },
  ].map(t => ({
    ...t,
    check: t.expectError
      ? (_, run) => (run.stats.agents !== 1 ? `Expected only the read agent to run, but ${run.stats.agents} ran.` : null)
      : r => expectEqual(r, t.expected),
  })),
};
