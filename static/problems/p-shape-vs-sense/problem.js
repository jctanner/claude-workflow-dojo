import { expectEqual, has } from '../_kit.js';

const idOf = p => (/T-\d+/.exec(p) || ['?'])[0];

export default {
  tier: 2,
  title: 'Schemas Check Shape, Code Checks Sense',
  difficulty: 'Medium',
  category: 'Pattern',
  goal: "Replace the schema's root <code>oneOf</code> with checks in code, and return which reviews to accept and which to reject.",
  concepts: ['cross-field rules', 'no oneOf at the root', 'reject inconsistent handoffs'],
  description: `
<p><b>Production pattern:</b> a schema guarantees <i>shape</i>, meaning the right fields with the right types. It can't easily
guarantee <i>sense</i>: "<code>needs_attention</code> is true exactly when the recommendation isn't <code>approve</code>", or
"the verdict is about the item I asked about". You might reach for <code>oneOf</code> to encode the rule, but the API rejects
<code>oneOf</code>/<code>anyOf</code>/<code>allOf</code> at a schema's root with a 400. Real pipelines hit this.</p>
<p>The starter tries exactly that. Fix it: keep a plain object schema, and check the rules in code after each answer.</p>
<p>Review each item concurrently (prompt <code>review &lt;id&gt;</code>). Accept a verdict only if it's non-null,
<code>v.key === id</code>, and <code>v.needs_attention === (v.recommendation !== 'approve')</code>. Return
<code>{accepted: [{key, recommendation}], rejected: [ids]}</code> in input order.</p>`,
  hints: ['Delete the oneOf block; keep type/required/properties at the root.', 'const ok = v => v && v.key === id && v.needs_attention === (v.recommendation !== "approve")'],
  respond(call, test) {
    if (!has(call.schema, 'recommendation')) return { output: 'needs a schema with recommendation', duration: 1000 };
    const v = test.verdicts[idOf(call.prompt)];
    if (v === null) return { fail: 'reviewer died', duration: 1000 };
    return { output: v, duration: 1000 };
  },
  tests: [{
    name: 'mixed verdicts',
    args: ['T-1', 'T-2', 'T-3', 'T-4', 'T-5'],
    verdicts: {
      'T-1': { key: 'T-1', recommendation: 'approve', needs_attention: false },
      'T-2': { key: 'T-7', recommendation: 'approve', needs_attention: false },
      'T-3': { key: 'T-3', recommendation: 'revise', needs_attention: false },
      'T-4': null,
      'T-5': { key: 'T-5', recommendation: 'reject', needs_attention: true },
    },
    expected: { accepted: [{ key: 'T-1', recommendation: 'approve' }, { key: 'T-5', recommendation: 'reject' }], rejected: ['T-2', 'T-3', 'T-4'] },
  }].map(t => ({ ...t, check: r => expectEqual(r, t.expected) })),
};
