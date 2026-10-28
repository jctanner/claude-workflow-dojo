// Shared helpers for problem fixtures and checkers.

export const show = v => (v === undefined ? 'undefined' : JSON.stringify(v));

export function expectEqual(actual, expected, what = 'result') {
  return show(actual) === show(expected) ? null : `Expected ${what} ${show(expected)}, got ${show(actual)}`;
}

// 0-based count of earlier calls sharing a key, for "the nth time X was asked" fixtures.
export function nth(state, key) {
  state.counts = state.counts || {};
  const n = state.counts[key] || 0;
  state.counts[key] = n + 1;
  return n;
}

// The longest candidate that appears in the prompt, so "auth" never shadows "auth-v2".
export function mentioned(prompt, names) {
  return names.filter(n => prompt.includes(n)).sort((a, b) => b.length - a.length)[0];
}

export const has = (schema, prop) => Boolean(schema && schema.properties && prop in schema.properties);

export const agentsMatching = (run, re) => run.trace.agents.filter(a => re.test(a.prompt));
