export const meta = {
  name: 'review-items',
  description: 'Review each item and accept only consistent verdicts',
}

// Shape only: a plain object root.
const VERDICT = {
  type: 'object',
  required: ['key', 'recommendation', 'needs_attention'],
  additionalProperties: false,
  properties: {
    key: { type: 'string' },
    recommendation: { type: 'string', enum: ['approve', 'revise', 'reject'] },
    needs_attention: { type: 'boolean' },
  },
}

const verdicts = await parallel(args.map(id => () => agent(`review ${id}`, { schema: VERDICT })))

// Sense: cross-field rules, checked in code.
const makesSense = (v, id) => v && v.key === id && v.needs_attention === (v.recommendation !== 'approve')

const accepted = []
const rejected = []
args.forEach((id, i) => {
  const v = verdicts[i]
  if (makesSense(v, id)) accepted.push({ key: v.key, recommendation: v.recommendation })
  else rejected.push(id)
})
return { accepted, rejected }
