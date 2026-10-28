import { expectEqual, has } from '../_kit.js';

const idOf = p => (/T-\d+/.exec(p) || ['?'])[0];

export default {
  tier: 2,
  title: 'Schemas Built From Data',
  difficulty: 'Hard',
  category: 'Pattern',
  goal: "Give each item its own receipt schema, pin the report's <code>run_id</code> to this run, and return what was recorded, what failed, and the report.",
  concepts: ['schema factory functions', 'enum of the expected key', 'const via spread override'],
  description: `
<p><b>Production pattern:</b> build a schema per call from what you <i>expect</i>, so a confused agent can't hand back
something plausible but wrong. Two tools:</p>
<ul>
  <li>A factory: <code>const receiptFor = id =&gt; ({ …, properties: { recorded: { type: 'string', enum: [id, 'none'] } } })</code>.
  An agent that answers about the wrong item fails validation and becomes <code>null</code>, instead of slipping through.</li>
  <li>An override with spread, pinning one field to this run:
  <code>{ ...REPORT, properties: { ...REPORT.properties, run_id: { type: 'string', const: runId } } }</code>.</li>
</ul>
<p><code>args</code> is <code>{runId, items}</code>. Process each item concurrently (prompt <code>process &lt;id&gt;</code>) with a
per-item receipt schema. An item counts as recorded only if its receipt's <code>recorded</code> equals its id. Then run one report step
(prompt contains <code>report</code>) whose schema pins <code>run_id</code> to <code>runId</code>. If the report comes back
<code>null</code>, throw an error mentioning <code>report</code>. Return <code>{recorded, failed, report}</code>.</p>`,
  hints: [
    "const receiptFor = id => ({ type: 'object', additionalProperties: false, required: ['recorded'], properties: { recorded: { type: 'string', enum: [id, 'none'] } } })",
    'A stale report (wrong run_id) fails the const check and comes back null.',
  ],
  respond(call, test) {
    if (has(call.schema, 'run_id')) return { output: { run_id: test.reportRunId, summary: 'ok' }, duration: 500 };
    const id = idOf(call.prompt);
    return { output: { recorded: test.receipts[id] }, duration: 1000 };
  },
  tests: [
    {
      name: 'cross-talk and none',
      args: { runId: 'run-7', items: ['T-1', 'T-2', 'T-3'] },
      receipts: { 'T-1': 'T-1', 'T-2': 'T-9', 'T-3': 'none' },
      reportRunId: 'run-7',
      expected: { recorded: ['T-1'], failed: ['T-2', 'T-3'], report: { run_id: 'run-7', summary: 'ok' } },
    },
    {
      name: 'stale report from an older run',
      args: { runId: 'run-8', items: ['T-1'] },
      receipts: { 'T-1': 'T-1' },
      reportRunId: 'run-7',
      expectError: /report/,
    },
  ].map(t => ({
    ...t,
    check: t.expectError
      ? (_, run) => {
        const rep = run.trace.agents.find(a => a.opts && a.opts.schema && a.opts.schema.properties && a.opts.schema.properties.run_id);
        return rep && rep.opts.schema.properties.run_id.const === t.args.runId ? null : 'The report schema should pin run_id with const: runId.';
      }
      : (r, run) => {
        const bad = expectEqual(r, t.expected);
        if (bad) return bad;
        const loose = run.trace.agents.filter(a => /process/.test(a.prompt) && !(a.opts.schema?.properties?.recorded?.enum || []).includes(idOf(a.prompt)));
        return loose.length ? 'Each process call should use a schema whose recorded enum is built from that item\'s id.' : null;
      },
  })),
};
