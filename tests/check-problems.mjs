// Every reference solution must be Accepted; every starter must not be.
import { readFile } from 'node:fs/promises';
import { judge } from '../static/js/judge.js';
import { READING } from '../static/problems/_book.js';
import { SLUGS, loadProblem } from '../static/problems/index.js';

const root = new URL('../static/problems/', import.meta.url);
let failures = 0;
for (const slug of SLUGS) {
  const problem = await loadProblem(slug);
  for (const kind of ['solution', 'starter']) {
    const src = await readFile(new URL(`${slug}/${kind}.workflow.js`, root), 'utf8');
    const { verdict, results } = await judge(problem, src);
    const ok = kind === 'solution' ? verdict === 'Accepted' : verdict !== 'Accepted';
    const first = results.find(r => r.verdict !== 'Accepted') || results[0];
    const stats = first.run.stats;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${slug.padEnd(22)} ${kind.padEnd(8)} ${verdict.padEnd(20)} ${stats.wallClock}ms ${stats.agents} agents ${first.detail ? '— ' + first.detail.slice(0, 110) : ''}`);
    if (!ok) failures++;
  }
}
// Every Tier 0 problem has a reading entry, and every entry names a problem.
for (const slug of Object.keys(READING)) {
  if (!SLUGS.includes(slug)) { console.log(`FAIL _book.js names unknown problem ${slug}`); failures++; }
}
for (const slug of SLUGS) {
  if (!(await loadProblem(slug)).goal) { console.log(`FAIL ${slug} has no goal sentence`); failures++; }
  if ((await loadProblem(slug)).tier === 0 && !READING[slug]) { console.log(`FAIL ${slug} has no Speaking JavaScript entry`); failures++; }
}
process.exit(failures ? 1 : 0);
