import { expectEqual, mentioned } from '../_kit.js';

const FILES_A = ['src/api.py', 'src/db.py', 'src/cli.py', 'src/auth.py'];
const FILES_B = Array.from({ length: 12 }, (_, i) => `pkg/mod${i + 1}.go`);

export default {
  title: 'Fan Out',
  difficulty: 'Easy',
  category: 'Create',
  goal: "Summarize every file with its own agent, all at once, and return <code>[{file, summary}]</code> in input order.",
  concepts: ['args', 'parallel()', 'thunks', 'concurrency cap'],
  description: `
<p><code>args</code> is an array of file paths. Spawn one summarizer agent <strong>per file</strong>, all at once, and return
<code>[{file, summary}]</code> in input order.</p>
<p>Each summary takes 2s. <code>parallel(thunks)</code> runs the tasks concurrently and waits for all of them.
A <em>thunk</em> is a function with no arguments that does the work when called later: <code>() =&gt; agent(...)</code>.
Pass thunks, not <code>agent(...)</code> calls, because <code>agent()</code> starts immediately and
<code>parallel</code> needs to decide when each one runs (see Tier 0, "Thunks").</p>
<p>Concurrent agents are capped (8 here). Extra calls queue until a slot frees, so 12 files take two waves.</p>`,
  hints: [
    'parallel(args.map(file => () => agent(`Summarize ${file}`)))',
    'The results array is in the same order as the thunks, so pair it back with args by index.',
  ],
  respond(call) {
    const file = mentioned(call.prompt, [...FILES_A, ...FILES_B]);
    const index = (call.args || []).indexOf(file);
    return {
      output: file ? `summary of ${file}` : 'Which file did you mean?',
      hints: { file, index: index < 0 ? undefined : index, summary: file ? `summary of ${file}` : undefined },
      duration: 2000,
    };
  },
  tests: [
    {
      name: 'four files in one wave',
      args: FILES_A,
      wallClockMs: 2500,
      check: (r, run) => run.stats.agents !== 4 ? `Expected 4 agents, got ${run.stats.agents}`
        : expectEqual(r, FILES_A.map(file => ({ file, summary: `summary of ${file}` }))),
    },
    {
      name: 'twelve files, concurrency 8',
      args: FILES_B,
      wallClockMs: 4500,
      check: (r, run) => run.stats.agents !== 12 ? `Expected 12 agents, got ${run.stats.agents}`
        : expectEqual(r, FILES_B.map(file => ({ file, summary: `summary of ${file}` }))),
    },
  ],
};
