import { expectEqual, has, mentioned } from '../_kit.js';

const SERVICES = ['gateway', 'orders', 'payments', 'inventory', 'search', 'notifications'];
const STATUS = { gateway: 'ok', orders: 'ok', payments: 'degraded', inventory: 'ok', search: 'down', notifications: 'ok' };

export default {
  title: 'Why Is It So Slow?',
  difficulty: 'Medium',
  category: 'Debug',
  goal: "Make this workflow finish in 3 seconds instead of 12, without changing what it returns.",
  concepts: ['await in loops', 'Timeline tab'],
  description: `
<p>This health-check workflow returns correct answers, but takes 12 seconds for six services. The limit is <strong>3s</strong>.</p>
<p>Click <strong>Run</strong> and open the <strong>Timeline</strong> tab. Each bar is an agent, and the bars form a staircase.
Find out why, and fix it without changing the output: the status of each service, in input order.</p>`,
  hints: [
    '`await` inside a for loop waits for each agent before starting the next one.',
    'Collect thunks and use parallel(); the result order matches the input order.',
  ],
  wallClockMs: 3000,
  respond(call) {
    const s = mentioned(call.prompt, SERVICES);
    const status = STATUS[s] || 'unknown';
    return { output: has(call.schema, 'status') ? { status } : status, duration: 2000 };
  },
  tests: [
    {
      name: 'six services',
      args: SERVICES,
      check: (r, run) => expectEqual(r, SERVICES.map(s => STATUS[s]))
        || (run.stats.agents !== 6 ? `Expected 6 agents, got ${run.stats.agents}` : null),
    },
  ],
};
