// Focused checks for simulator semantics.
import assert from 'node:assert/strict';
import { runWorkflow } from '../static/js/runtime.js';

const META = "export const meta = { name: 't', description: 'd' }\n";
const run = (body, opts) => runWorkflow(META + body, opts);
const tests = {
  async 'meta must come first'() {
    const r = await runWorkflow("const x = 1\nexport const meta = { name: 'a', description: 'b' }");
    assert.equal(r.error.name, 'CompileError');
    assert.equal(r.error.line, 2);
  },
  async 'meta rejects identifiers and interpolation'() {
    for (const m of ["{ name: N, description: 'd' }", "{ name: `a${1}`, description: 'd' }", "{ name, description: 'd' }", "{ ...X }"]) {
      const r = await runWorkflow(`export const meta = ${m}\nreturn 1`);
      assert.match(r.error.message, /pure literal/, m);
    }
  },
  async 'meta accepts comments, trailing commas, escapes'() {
    const r = await runWorkflow("// hi\nexport const meta = {\n  name: 'it\\'s', // c\n  description: \"d\",\n  phases: [{ title: 'A', },],\n};\nreturn meta");
    assert.equal(r.ok, true, JSON.stringify(r.error));
    assert.equal(r.meta.name, "it's");
  },
  async 'Date.now and Math.random throw; Math.max works'() {
    assert.match((await run('return Date.now()')).error.message, /Date.now/);
    assert.match((await run('return Math.random()')).error.message, /Math.random/);
    assert.equal((await run('return Math.max(1, 2)')).result, 2);
    assert.equal((await run("return new Date('2020-01-01').getUTCFullYear()")).result, 2020);
  },
  async 'runtime error line numbers match the editor'() {
    const r = await run('const a = 1\nnull.x\n');
    assert.equal(r.error.line, 3);
  },
  async 'typescript gets a hint'() {
    const r = await run('const x: number = 1\nreturn x');
    assert.match(r.error.hint, /TypeScript/);
  },
  async 'concurrency cap queues agents'() {
    const r = await run('return parallel(Array.from({length: 10}, (_, i) => () => agent("x" + i)))', {
      concurrency: 4, fixture: { respond: () => ({ output: 'y', duration: 1000 }) },
    });
    assert.equal(r.stats.wallClock, 3000);
    assert.equal(r.stats.peakConcurrency, 4);
  },
  async 'pipeline has no barrier'() {
    const d = { a1: 1000, b1: 5000, a2: 5000, b2: 1000 };
    const r = await run("return pipeline(['1','2'], (x) => agent('a' + x), (p, x) => agent('b' + x))", {
      fixture: { respond: c => ({ output: c.prompt, duration: d[c.prompt] }) },
    });
    assert.deepEqual(r.result, ['b1', 'b2']);
    assert.equal(r.stats.wallClock, 6000);
  },
  async 'promises passed to parallel become null with a warning'() {
    const r = await run("return parallel([agent('x')])");
    assert.deepEqual(r.result, [null]);
    assert.ok(r.trace.warnings.some(w => /not a function/.test(w.message)));
  },
  async 'invalid schema throws at agent()'() {
    const r = await run("return agent('x', { schema: { type: 'object', properties: {}, required: ['a'] } })");
    assert.match(r.error.message, /unsatisfiable/);
  },
  async 'log() shows objects as JSON and warns'() {
    const r = await run("log('a'); log({ b: [1] }); log(2); return 1");
    assert.deepEqual(r.trace.logs.map(l => l.message), ['a', '{"b":[1]}', '2']);
    assert.ok(r.trace.warnings.some(w => /JSON.stringify/.test(w.message)));
  },
  async 'prose is shaped to a requested schema, like a model would'() {
    const S = "{ type: 'object', properties: { fileid: { type: 'integer' }, filename: { type: 'string' }, summary: { type: 'string' } } }";
    const r = await run(`return agent('x', { schema: ${S} })`, {
      fixture: { respond: () => ({ output: 'a summary', hints: { file: 'a.py', index: 2 } }) },
    });
    assert.deepEqual(r.result, { fileid: 2, filename: 'a.py', summary: 'a summary' });
  },
  async 'schema mismatch from a structured fixture warns and resolves null'() {
    const r = await run("return agent('x', { schema: { type: 'object', properties: { n: { type: 'number' } }, required: ['n'] } })", {
      fixture: { respond: () => ({ output: { n: 'many' } }) },
    });
    assert.equal(r.result, null);
    assert.ok(r.trace.warnings.some(w => /resolved to null/.test(w.message)));
  },
  async 'deadlock is reported'() {
    const r = await run('await new Promise(() => {})');
    assert.match(r.error.message, /Deadlock/);
  },
  async 'budget refuses agents once spent'() {
    const r = await run("await agent('a'); await agent('b'); return agent('c')", {
      budgetTotal: 500, fixture: { respond: () => ({ output: 'y', tokens: 300 }) },
    });
    assert.match(r.error.message, /budget exhausted/);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}\n     ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
