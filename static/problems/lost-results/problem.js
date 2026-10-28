import { expectEqual, has, mentioned } from '../_kit.js';

const LEAKS = { api: 2, web: 0, infra: 1 };

export default {
  title: 'Lost Results',
  difficulty: 'Medium',
  category: 'Debug',
  goal: "Fix the two bugs so the workflow returns a remediation plan for every repo that has leaks.",
  concepts: ['thunks vs promises', 'stage callback arguments', 'warnings'],
  description: `
<p>This workflow scans each repo for leaked secrets, then drafts a remediation plan for every repo with leaks.
It never crashes. It always returns <code>[]</code>.</p>
<p>Expected: <code>[{repo, plan}]</code> for each repo with <code>leaks &gt; 0</code>, in input order.</p>
<p>There are <strong>two</strong> bugs. Check the <strong>Warnings</strong> on the result panel and read the agent statuses
in the <strong>Agents</strong> tab.</p>`,
  hints: [
    'parallel() takes functions. `args.map(repo => agent(...))` hands it promises.',
    'pipeline stage callbacks receive (prevResult, originalItem, index), in that order.',
  ],
  respond(call) {
    const repo = mentioned(call.prompt, Object.keys(LEAKS));
    if (has(call.schema, 'leaks')) return { output: { repo, leaks: LEAKS[repo] ?? 0 }, duration: 1500 };
    return { output: `Remediation plan for ${repo}`, duration: 2000 };
  },
  tests: [
    {
      name: 'three repos',
      args: Object.keys(LEAKS),
      check: r => expectEqual(r, [
        { repo: 'api', plan: 'Remediation plan for api' },
        { repo: 'infra', plan: 'Remediation plan for infra' },
      ]),
    },
  ],
};
