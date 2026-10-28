export const meta = {
  name: 'verify-findings',
  description: 'Keep findings that survive three skeptics',
}

const VERDICT = {
  type: 'object',
  properties: { refuted: { type: 'boolean' }, reason: { type: 'string' } },
  required: ['refuted'],
}

// args: [{id, claim}]
// TODO: 3 skeptics per finding; keep a finding when at least 2 failed to refute it.
return []
