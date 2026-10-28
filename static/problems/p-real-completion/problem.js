import { expectEqual, has } from '../_kit.js';

const idOf = p => (/T-\d+/.exec(p) || ['?'])[0];
const isProcess = a => /^process T-/.test(a.prompt);
const isInventory = a => has(a.opts.schema, 'artifacts');
const isNotify = a => /^notify/.test(a.prompt);

export default {
  tier: 2,
  title: 'Count Completion Yourself',
  difficulty: 'Medium',
  category: 'Pattern',
  goal: "Decide <code>complete</code>, <code>incomplete</code> or <code>unknown</code> from the artifact inventory alone, report it, and never redo work because the report failed.",
  concepts: ['business vs runtime vs report status', 'three-valued outcome', "don't rerun on a notification failure"],
  description: `
<p><b>Production pattern:</b> a real pipeline saw three "success" signals disagree. A workflow could finish its work and
then fail while reporting it, and a job could exit cleanly with work missing. Two rules came out of that:
<b>a failed report must not cause the work to run again</b>, and <b>an agent saying "ok" is not completion</b>. Completion
comes from evidence: an inventory of the artifacts that actually exist.</p>
<ol>
  <li>Process each item once, concurrently (prompt <code>process &lt;id&gt;</code>). Every agent answers "ok"; ignore that.</li>
  <li>After all of them finish, take one inventory (prompt contains <code>receipt.py inventory</code>, schema
  <code>INVENTORY</code>). <code>business</code> is <code>complete</code> when every item has an artifact, otherwise
  <code>incomplete</code> with <code>missing</code> listing the items without one, in input order. If the inventory returns
  <code>null</code>, <code>business</code> is <code>unknown</code> and <code>missing</code> is empty: you can't claim either way.</li>
  <li>Then report: one agent with the prompt <code>notify status=&lt;business&gt;</code>. <code>notified</code> is whether
  it returned non-null. If it fails, just say so. The work is already done.</li>
</ol>
<p>Return <code>{business, missing, notified}</code>.</p>`,
  hints: [
    "const INVENTORY = { type: 'object', required: ['artifacts'], properties: { artifacts: { type: 'array', items: { type: 'string' } } } }",
    "const business = !inv ? 'unknown' : missing.length ? 'incomplete' : 'complete'",
  ],
  respond(call, test) {
    if (has(call.schema, 'artifacts')) {
      if (test.inventoryDown) return { fail: 'inventory step died', duration: 600 };
      return { output: { artifacts: call.args.filter(id => !(test.missing || []).includes(id)) }, duration: 600 };
    }
    if (/^process T-/.test(call.prompt)) return { output: 'ok', duration: 1000 };
    if (/^notify/.test(call.prompt)) return test.notifyDown ? { fail: 'notification turn failed', duration: 400 } : { output: 'sent', duration: 400 };
    return { output: 'unknown step', duration: 500 };
  },
  tests: [
    { name: 'all good', args: ['T-1', 'T-2', 'T-3'], expected: { business: 'complete', missing: [], notified: true } },
    { name: 'report fails after the work', args: ['T-1', 'T-2', 'T-3'], notifyDown: true, expected: { business: 'complete', missing: [], notified: false } },
    { name: 'says ok, artifact missing', args: ['T-1', 'T-2', 'T-3'], missing: ['T-2'], expected: { business: 'incomplete', missing: ['T-2'], notified: true } },
    { name: 'inventory lost', args: ['T-1', 'T-2'], inventoryDown: true, expected: { business: 'unknown', missing: [], notified: true } },
  ].map(t => ({
    ...t,
    check: (r, run) => {
      const agents = run.trace.agents;
      for (const id of t.args) {
        const n = agents.filter(a => isProcess(a) && idOf(a.prompt) === id).length;
        if (n !== 1) return `${id} was processed ${n} times; process each item exactly once, even when the report fails.`;
      }
      const inv = agents.filter(isInventory);
      if (inv.length !== 1) return `Expected one inventory step, got ${inv.length}.`;
      if (agents.some(a => isProcess(a) && (a.end == null || a.end > inv[0].start))) return 'The inventory started before every item finished.';
      const notes = agents.filter(isNotify);
      if (notes.length !== 1) return `Expected one notify step, got ${notes.length}.`;
      if (notes[0].prompt !== `notify status=${t.expected.business}`) return `Expected the prompt "notify status=${t.expected.business}", got "${notes[0].prompt}".`;
      if (notes[0].start < inv[0].end) return 'notify must wait for the inventory: it reports what the inventory found.';
      return expectEqual(r, t.expected);
    },
  })),
};
