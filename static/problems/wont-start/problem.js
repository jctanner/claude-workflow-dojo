import { expectEqual, has } from '../_kit.js';

export default {
  title: "It Won't Even Start",
  difficulty: 'Easy',
  category: 'Debug',
  goal: "Fix the four mistakes that stop this workflow from starting, so it returns <code>{notes, startedAt}</code>.",
  concepts: ['meta placement', 'pure literals', 'plain JavaScript', 'resume safety'],
  description: `
<p>A teammate's release-notes workflow fails before a single agent runs. It contains <strong>four</strong> independent
mistakes. Fix them one at a time, guided by each error, until it is accepted.</p>
<p>Expected output: <code>{notes, startedAt}</code>, where <code>notes</code> is the release-notes agent's text and
<code>startedAt</code> comes from <code>args.startedAt</code>.</p>
<p>Workflows can be resumed: unchanged <code>agent()</code> calls replay from a cache. Anything non-deterministic,
such as clocks or randomness, would break that, so it isn't available inside scripts.</p>`,
  hints: [
    'Only comments may come before `export const meta`.',
    'meta must be a pure literal: inline the name instead of using a variable.',
    'Delete the `: number` annotation. Scripts are JavaScript, not TypeScript.',
    'Timestamps come in through args: use args.startedAt.',
  ],
  respond(call) {
    if (has(call.schema, 'prs')) return { output: { prs: ['#12', '#15'] }, duration: 1000 };
    if (call.prompt.includes('#12') && call.prompt.includes('#15')) return { output: 'Release notes covering #12, #15', duration: 1500 };
    return { output: 'I need the PR list to write release notes.', duration: 1500 };
  },
  tests: [
    {
      name: 'release notes',
      args: { startedAt: '2026-10-26T09:00:00Z' },
      check: r => expectEqual(r, { notes: 'Release notes covering #12, #15', startedAt: '2026-10-26T09:00:00Z' }),
    },
  ],
};
