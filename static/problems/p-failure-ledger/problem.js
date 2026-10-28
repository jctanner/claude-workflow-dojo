import { expectEqual } from '../_kit.js';

const idOf = p => (/T-\d+/.exec(p) || ['?'])[0];

export default {
  tier: 2,
  title: 'Record, Continue, Fail at the End',
  difficulty: 'Medium',
  category: 'Pattern',
  goal: "Process every item, record the ones that fail, always run the report step with those failures, then throw if anything failed.",
  concepts: ['failure ledger', 'soft vs hard failure', 'final verdict'],
  description: `
<p><b>Production pattern:</b> one item failing shouldn't stop the others, but the run must not <i>look</i> successful
either. Keep a ledger:</p>
<pre><code>const failed = []
const fail = (step, key) =&gt; { failed.push(\`\${step}:\${key}\`); log(\`\${step} \${key}: no result\`); return null }</code></pre>
<ol>
  <li>Process every item concurrently (prompt <code>process &lt;id&gt;</code>). A <code>null</code> result calls <code>fail('process', id)</code>.</li>
  <li><b>Always</b> run the report step afterwards: one agent whose prompt contains <code>report</code> followed by
  <code> --failed &lt;entry&gt;</code> for each ledger entry, such as <code>report --failed process:T-2</code>.</li>
  <li>If the ledger isn't empty, <b>throw</b> an error containing <code>not verified</code>. Otherwise return the report's answer.</li>
</ol>
<p>So the run does all the work it can, records exactly what failed, and still ends red. When you're on call, the
<code>log()</code> lines and the report tell you what to re-run.</p>`,
  hints: [
    "const failedArgs = failed.map(f => ` --failed ${f}`).join('')",
    'Throw after the report, not before it.',
  ],
  respond(call, test) {
    if (/report/.test(call.prompt)) return { output: 'report written', duration: 500 };
    const id = idOf(call.prompt);
    if (test.down.includes(id)) return { fail: 'step agent died', duration: 1000 };
    return { output: `done ${id}`, duration: 1000 };
  },
  tests: [
    { name: 'all good', args: ['T-1', 'T-2', 'T-3'], down: [], expected: 'report written', report: 'report' },
    { name: 'one fails', args: ['T-1', 'T-2', 'T-3'], down: ['T-2'], expectError: /not verified/, report: 'report --failed process:T-2' },
    { name: 'two fail', args: ['T-1', 'T-2', 'T-3'], down: ['T-1', 'T-3'], expectError: /not verified/, report: 'report --failed process:T-1 --failed process:T-3' },
  ].map(t => ({
    ...t,
    check: (r, run) => {
      if (!t.expectError) { const bad = expectEqual(r, t.expected); if (bad) return bad; }
      const report = run.trace.agents.find(a => /report/.test(a.prompt));
      if (!report) return 'The report step never ran. Record failures and keep going; throw only after the report.';
      if (!report.prompt.includes(t.report)) return `The report prompt should contain "${t.report}", got "${report.prompt}"`;
      if (t.down.some(id => !run.trace.logs.some(l => l.message.includes(id)))) return 'Each failure should be log()ged.';
      return null;
    },
  })),
};
