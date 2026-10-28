import { expectEqual } from '../_kit.js';

const SUMMARY = 'Breadboard wires emulated Jira, GitHub and GitLab to Markov workflows and agent runners.';

export default {
  title: 'Hello, Workflow',
  difficulty: 'Easy',
  category: 'Create',
  goal: "Write a workflow that asks one agent to summarize the README, and return its answer.",
  concepts: ['meta', 'agent()', 'return'],
  description: `
<p>Every workflow script starts with a <code>meta</code> block and then runs top to bottom inside an async function.
Write your first workflow: spawn <strong>one</strong> agent that summarizes the README and return the agent's answer.</p>
<ul>
  <li><code>meta.name</code> and <code>meta.description</code> are required and must not be empty.</li>
  <li>The prompt must mention <code>README</code>.</li>
  <li>Return the agent's text exactly as you received it.</li>
</ul>
<p>Without a <code>schema</code>, <code>agent()</code> resolves to the subagent's final text as a string.</p>`,
  hints: [
    'Compile errors about meta come first. Fill in name and description.',
    '`const text = await agent(\'Summarize the README\')` and `return text`.',
  ],
  wallClockMs: 2000,
  respond: () => ({ output: SUMMARY, duration: 1500, tokens: 300 }),
  tests: [
    {
      name: 'returns the summary',
      check: r => expectEqual(r, SUMMARY),
    },
    {
      name: 'one agent, prompt mentions README',
      check: (r, run) => {
        if (run.stats.agents !== 1) return `Expected exactly 1 agent, spawned ${run.stats.agents}`;
        if (!/readme/i.test(run.trace.agents[0].prompt)) return 'The prompt should mention README';
        return null;
      },
    },
  ],
};
