export const meta = {
  name: 'verify-findings',
  description: 'Keep findings that survive three skeptics',
}

const VERDICT = {
  type: 'object',
  properties: { refuted: { type: 'boolean' }, reason: { type: 'string' } },
  required: ['refuted'],
}

const survived = await parallel(args.map(f => async () => {
  const votes = await parallel(Array.from({ length: 3 }, (_, i) => () =>
    agent(`Try to refute finding ${f.id}: "${f.claim}". Default to refuted=true if uncertain.`,
      { schema: VERDICT, label: `${f.id} skeptic ${i + 1}` })))
  return votes.filter(Boolean).filter(v => !v.refuted).length >= 2
}))

return args.filter((f, i) => survived[i]).map(f => f.id)
