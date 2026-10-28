import { expectEqual, mentioned } from '../_kit.js';

const MODULES = ['auth', 'billing', 'search', 'storage'];
const SCAN = { auth: 1000, billing: 6000, search: 2000, storage: 5000 };
const DIG = { auth: 6000, billing: 1000, search: 5000, storage: 2000 };
const FINDING = { auth: 'HS-17 token refresh race', billing: 'HS-42 rounding drift', search: 'HS-08 unbounded query', storage: 'HS-23 orphaned blobs' };

export default {
  title: 'Pipeline, Not Barrier',
  difficulty: 'Medium',
  category: 'Create',
  goal: "For each module, run a scan agent and then an investigate agent that uses the scan, and return the investigation reports within the time limit.",
  concepts: ['pipeline()', 'barriers', 'wall clock'],
  description: `
<p>For each module in <code>args</code>, run two stages:</p>
<ol>
  <li><strong>scan</strong>: the prompt contains the word <code>scan</code> and the module name.</li>
  <li><strong>investigate</strong>: the prompt contains <code>investigate</code>, the module name, and what that module's scan found.</li>
</ol>
<p>Return the investigation reports in module order.</p>
<p>Stage durations differ a lot per module: a slow scan is followed by a fast investigation, and the reverse.
If you <code>await parallel(scans)</code> and then <code>await parallel(investigations)</code>, every item waits for the
<em>slowest</em> scan before anything moves on. That is a barrier: 6s + 6s = 12s.</p>
<p><code>pipeline(items, stage1, stage2)</code> moves each item through its stages independently, so wall clock
becomes the slowest single chain. The limit is <strong>8s</strong>.</p>`,
  hints: [
    'Each stage callback receives (prevResult, originalItem, index).',
    'pipeline(args, m => agent(`Scan ${m}`), (scan, m) => agent(`Investigate ${m}: ${scan}`))',
  ],
  wallClockMs: 8000,
  respond(call) {
    const m = mentioned(call.prompt, MODULES);
    if (!m) return { output: 'Which module?', duration: 500 };
    if (/investigate/i.test(call.prompt)) return { output: `report:${m}`, duration: DIG[m] };
    // Deliberately omits the module name: stage 2 must take it from originalItem.
    if (/scan/i.test(call.prompt)) return { output: `found ${FINDING[m]}`, duration: SCAN[m] };
    return { output: 'Unclear task: say scan or investigate.', duration: 500 };
  },
  tests: [
    {
      name: 'four modules under 8s',
      args: MODULES,
      check: (r, run) => {
        const scans = run.trace.agents.filter(a => /scan/i.test(a.prompt) && !/investigate/i.test(a.prompt)).length;
        const digs = run.trace.agents.filter(a => /investigate/i.test(a.prompt)).length;
        if (scans !== 4 || digs !== 4) return `Expected 4 scans and 4 investigations, got ${scans} and ${digs}`;
        for (const m of MODULES) {
          const dig = run.trace.agents.find(a => /investigate/i.test(a.prompt) && a.prompt.includes(m));
          if (!dig) {
            return `No investigate prompt names "${m}". Stage callbacks receive (prevResult, originalItem, index): the first argument of stage 2 is the scan's answer, not the module.`;
          }
          if (!dig.prompt.includes(FINDING[m].split(' ')[0])) {
            return `The investigation of "${m}" doesn't pass along what its scan found ("${FINDING[m]}"). Use stage 2's prevResult.`;
          }
        }
        return expectEqual(r, MODULES.map(m => `report:${m}`));
      },
    },
  ],
};
