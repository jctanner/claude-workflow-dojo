import { expectEqual } from '../_kit.js';

const KEY = /T-\d+/;

export default {
  tier: 2,
  title: 'Validate Args Before Spending',
  difficulty: 'Easy',
  category: 'Pattern',
  goal: "Throw on a bad namespace or key before any agent starts; otherwise process every key and return the answers.",
  concepts: ['fail fast', 'throw before agents', 'namespaced args'],
  description: `
<p><b>Production pattern:</b> check <code>args</code> at the very top and <code>throw</code> before any agent starts.
A bad argument discovered after spawning agents has already cost money, and may have caused side effects.</p>
<p><code>args</code> is <code>{namespace?, keys}</code>. With the same rules as Tier 0's "Regex, raise and 'or' Defaults",
throw on a bad namespace (message mentions <code>namespace</code>) or a bad key (mentions <code>key</code>). Then run
one agent per key with the prompt <code>Run &lt;ns&gt;process &lt;key&gt;</code>, concurrently, and return their answers in order.</p>
<p>The namespace exists so the same script can run under two installs. One calls the skill <code>process</code> and the
other <code>tools:process</code>. The script is identical; only <code>args</code> differ.</p>`,
  hints: ['Move the validation above the parallel() call.', 'Throwing before the first agent() means 0 agents ever ran.'],
  respond(call) {
    const key = (KEY.exec(call.prompt) || ['?'])[0];
    return { output: `processed ${key}`, duration: 1000 };
  },
  tests: [
    { name: 'with namespace', args: { namespace: 'tools:', keys: ['T-1', 'T-2'] }, expected: ['processed T-1', 'processed T-2'], prompt: 'Run tools:process T-1' },
    { name: 'without namespace', args: { keys: ['T-5'] }, expected: ['processed T-5'], prompt: 'Run process T-5' },
    { name: 'bad namespace costs nothing', args: { namespace: 'Tools', keys: ['T-1', 'T-2', 'T-3'] }, expectError: /namespace/ },
    { name: 'bad key costs nothing', args: { keys: ['T-1', 'oops', 'T-3'] }, expectError: /key/ },
  ].map(t => ({
    ...t,
    check: t.expectError
      ? (_, run) => (run.stats.agents ? `The workflow threw, but only after starting ${run.stats.agents} agent(s). Validate before spending.` : null)
      : (r, run) => expectEqual(r, t.expected)
        || (run.trace.agents[0].prompt !== t.prompt ? `First prompt should be exactly "${t.prompt}", got "${run.trace.agents[0].prompt}"` : null),
  })),
};
