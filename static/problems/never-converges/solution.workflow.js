export const meta = {
  name: 'exhaustive-review',
  description: 'Find bugs until dry, confirming each with a judge',
}

const BUGS = {
  type: 'object',
  properties: {
    bugs: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, desc: { type: 'string' } } } },
  },
  required: ['bugs'],
}
const VERDICT = { type: 'object', properties: { real: { type: 'boolean' } }, required: ['real'] }

const seen = new Set()
const confirmed = []
let dry = 0
while (dry < 2) {
  const found = await agent('Find bugs in the payments service.', { schema: BUGS, label: 'finder' })
  const fresh = (found ? found.bugs : []).filter(b => !seen.has(b.id))
  if (!fresh.length) { dry++; continue }
  dry = 0
  fresh.forEach(b => seen.add(b.id))
  const judged = await parallel(fresh.map(b => () =>
    agent(`Is bug ${b.id} real? ${b.desc}`, { schema: VERDICT, label: `judge ${b.id}` })
      .then(v => ({ b, real: Boolean(v && v.real) }))))
  confirmed.push(...judged.filter(j => j && j.real).map(j => j.b))
}
return confirmed.map(b => b.id)
