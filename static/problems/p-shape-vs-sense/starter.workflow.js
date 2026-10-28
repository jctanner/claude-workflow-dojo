export const meta = {
  name: 'review-items',
  description: 'Review each item and accept only consistent verdicts',
}

// Tries to make the schema enforce the rule. The API rejects oneOf at the root.
const VERDICT = {
  type: 'object',
  required: ['key', 'recommendation', 'needs_attention'],
  properties: {
    key: { type: 'string' },
    recommendation: { type: 'string', enum: ['approve', 'revise', 'reject'] },
    needs_attention: { type: 'boolean' },
  },
  oneOf: [
    { properties: { recommendation: { const: 'approve' }, needs_attention: { const: false } } },
    { properties: { recommendation: { enum: ['revise', 'reject'] }, needs_attention: { const: true } } },
  ],
}

const verdicts = await parallel(args.map(id => () => agent(`review ${id}`, { schema: VERDICT })))
return {
  accepted: verdicts.filter(Boolean).map(v => ({ key: v.key, recommendation: v.recommendation })),
  rejected: args.filter((id, i) => !verdicts[i]),
}
