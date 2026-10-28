// Runs a problem's test cases against a submitted script.
import { runWorkflow } from './runtime.js';

export async function runTest(problem, test, source) {
  const run = await runWorkflow(source, {
    args: test.args,
    budgetTotal: test.budget ?? null,
    concurrency: test.concurrency ?? problem.concurrency ?? 8,
    maxAgents: problem.maxAgents ?? 200,
    requireMeta: problem.tier !== 0,
    fixture: { respond: call => (problem.respond ? problem.respond(call, test) : { output: '' }) },
  });
  const limit = test.wallClockMs ?? problem.wallClockMs;
  let verdict = 'Accepted';
  let detail = null;
  if (test.expectError) {
    // This test passes only if the workflow stops with a matching error.
    if (run.ok) {
      verdict = 'Wrong Answer';
      detail = `Expected the workflow to throw (${test.expectError}), but it returned ${JSON.stringify(run.result)}.`;
    } else if (run.error.name === 'CompileError') {
      verdict = 'Compile Error';
      detail = run.error.message;
    } else if (!test.expectError.test(run.error.message)) {
      verdict = 'Wrong Answer';
      detail = `The workflow threw "${run.error.message}", but this test expects an error matching ${test.expectError}.`;
    } else if (test.check) {
      try {
        detail = test.check(undefined, run) || null;
      } catch (e) {
        detail = `Checker crashed: ${e.message}`;
      }
      if (detail) verdict = 'Wrong Answer';
    }
    return { name: test.name, verdict, detail, limit, run };
  }
  if (!run.ok) {
    verdict = run.error.name === 'CompileError' ? 'Compile Error' : 'Runtime Error';
    detail = run.error.message;
  } else if (limit != null && run.stats.wallClock > limit) {
    verdict = 'Time Limit Exceeded';
    detail = `Simulated wall clock ${fmtMs(run.stats.wallClock)} exceeds the ${fmtMs(limit)} limit.`;
  } else {
    try {
      detail = test.check(run.result, run) || null;
    } catch (e) {
      detail = `Checker crashed on your result: ${e.message}`;
    }
    if (detail) verdict = 'Wrong Answer';
  }
  return { name: test.name, verdict, detail, limit, run };
}

// mode 'run' executes the first test only; 'submit' executes all of them.
export async function judge(problem, source, mode = 'submit') {
  const tests = mode === 'run' ? problem.tests.slice(0, 1) : problem.tests;
  const results = [];
  for (const t of tests) results.push(await runTest(problem, t, source));
  const failed = results.find(r => r.verdict !== 'Accepted');
  return { verdict: failed ? failed.verdict : 'Accepted', results };
}

export function fmtMs(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(ms % 1000 ? 1 : 0)}s` : `${ms}ms`;
}
