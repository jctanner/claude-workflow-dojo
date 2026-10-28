// Runs user scripts off the main thread so a runaway loop can be killed.
import { judge } from './judge.js';
import { defaultFixture, runWorkflow, sampleFromSchema } from './runtime.js';
import { loadProblem } from '../problems/index.js';

function cloneable(value) {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value, (k, v) => (typeof v === 'function' ? `[function ${v.name || 'anonymous'}]` : v)) ?? 'null');
  }
}

self.onmessage = async ({ data }) => {
  try {
    if (data.kind === 'judge') {
      const problem = await loadProblem(data.slug);
      const out = await judge(problem, data.source, data.mode);
      if (data.mode === 'submit' && out.verdict === 'Accepted' && data.reference) {
        const ref = await judge(problem, data.reference, 'submit');
        out.reference = ref.results.map(r => r.run.stats);
      }
      self.postMessage({ ok: true, out: cloneable(out) });
    } else if (data.kind === 'play') {
      const custom = new Function('call', 'sample', `"use strict";\n${data.fixtureSource}`);
      const fixture = {
        respond: call => custom(call, sampleFromSchema) || defaultFixture.respond(call),
      };
      const run = await runWorkflow(data.source, {
        args: data.args,
        budgetTotal: data.budget,
        concurrency: data.concurrency,
        fixture,
      });
      self.postMessage({ ok: true, out: cloneable({ verdict: run.ok ? 'Finished' : run.error.name, results: [{ name: 'playground', verdict: run.ok ? 'Finished' : run.error.name, detail: run.ok ? null : run.error.message, run }] }) });
    }
  } catch (e) {
    self.postMessage({ ok: false, error: `${e.name}: ${e.message}` });
  }
};
