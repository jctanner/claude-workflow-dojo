// Problem catalog, in display order. Each directory holds problem.js plus
// starter.workflow.js and solution.workflow.js (plain text, loaded on demand).
export const SLUGS = [
  // Tier 0: JavaScript for Python developers (plain scripts, no meta)
  'js-arrows',
  'js-template-strings',
  'js-truthiness',
  'js-const-let',
  'js-strings',
  'js-sorting',
  'js-array-predicates',
  'js-loops',
  'js-counting',
  'js-objects',
  'js-sets-maps',
  'js-nullish',
  'js-spread',
  'js-positional-args',
  'js-scope',
  'js-nested-callbacks',
  'js-json',
  'js-errors',
  'js-regex-throw',
  'js-await',
  'js-thunks',
  'js-then',
  // Tier 1: workflows
  'hello-workflow',
  'structured-output',
  'fan-out',
  'pipeline-not-barrier',
  'expect-failures',
  'adversarial-verify',
  'loop-until-dry',
  'spend-the-budget',
  'wont-start',
  'why-so-slow',
  'lost-results',
  'never-converges',
  // Tier 2: production patterns, generalized from a real pipeline
  'p-validate-first',
  'p-hard-stop',
  'p-skip-done',
  'p-failure-ledger',
  'p-verify-dont-trust',
  'p-shape-vs-sense',
  'p-gate-on-coverage',
  'p-drop-one',
  'p-schemas-from-data',
  // Tier 2 continued: lessons from a Bash-to-workflow migration
  'p-stale-reuse',
  'p-intent-first',
  'p-defer-stale',
  'p-real-completion',
];

export async function loadProblem(slug) {
  const mod = await import(`./${slug}/problem.js`);
  return { slug, ...mod.default };
}
