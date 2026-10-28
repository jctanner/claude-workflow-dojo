import { expectEqual, has, mentioned } from '../_kit.js';

export default {
  title: 'Expect Failures',
  difficulty: 'Medium',
  category: 'Create',
  goal: "Count open incidents across shards with one agent each, and return the total plus the shards whose agent failed.",
  concepts: ['null results', 'filter(Boolean)', 'log()', 'no silent caps'],
  description: `
<p><code>args</code> is a list of shard names. Ask one agent per shard to count open incidents, using a schema with a
numeric <code>count</code>. Return <code>{total, failed}</code>, where <code>failed</code> lists the shards that produced
no result, in input order.</p>
<p>Agents fail in real runs. <code>agent()</code> resolves to <code>null</code> when the subagent dies on a terminal error
or is skipped, and a <code>parallel()</code> thunk that throws resolves to <code>null</code> as well. Code that assumes every
result is an object will crash.</p>
<p>Don't drop failures silently: <code>log()</code> each failed shard name so the operator sees what was not covered.</p>`,
  hints: [
    'const COUNT = {type: "object", properties: {count: {type: "number"}}, required: ["count"]}',
    'Keep the index: args.filter((s, i) => results[i] == null) gives the failed shards.',
    'log(`no result from ${shard}`)',
  ],
  wallClockMs: 3000,
  respond(call, test) {
    const shard = mentioned(call.prompt, Object.keys(test.shards));
    const v = shard ? test.shards[shard] : undefined;
    if (v === 'down') return { fail: 'terminal API error', duration: 1500 };
    if (!has(call.schema, 'count')) return { output: `about ${v} incidents`, duration: 1500 };
    return { output: { count: v ?? 0 }, duration: 1500 };
  },
  tests: [1, 2, 3].map(n => {
    const cases = {
      1: { shards: { 'shard-1': 4, 'shard-2': 7, 'shard-3': 'down', 'shard-4': 1, 'shard-5': 'many', 'shard-6': 3 }, total: 15, failed: ['shard-3', 'shard-5'] },
      2: { shards: { east: 2, west: 5 }, total: 7, failed: [] },
      3: { shards: { a: 'down', b: 'down' }, total: 0, failed: ['a', 'b'] },
    }[n];
    return {
      name: ['mixed failures', 'all healthy', 'everything down'][n - 1],
      args: Object.keys(cases.shards),
      shards: cases.shards,
      check: (r, run) => {
        const bad = expectEqual(r, { total: cases.total, failed: cases.failed });
        if (bad) return bad;
        const text = run.trace.logs.map(l => l.message).join('\n');
        const silent = cases.failed.filter(s => !text.includes(s));
        return silent.length ? `Failures were dropped silently: log() should mention ${silent.join(', ')}` : null;
      },
    };
  }),
};
