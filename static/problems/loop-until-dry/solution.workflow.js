export const meta = {
  name: 'find-until-dry',
  description: 'Run finders until two consecutive rounds find nothing new',
}

const BUGS = {
  type: 'object',
  properties: {
    bugs: {
      type: 'array',
      items: { type: 'object', properties: { id: { type: 'string' }, desc: { type: 'string' } }, required: ['id'] },
    },
  },
  required: ['bugs'],
}

const seen = new Set()
const found = []
let dry = 0
let round = 0
while (dry < 2) {
  round++
  const r = await agent('Find bugs in the payments service.', { schema: BUGS, label: `finder round ${round}` })
  const fresh = (r ? r.bugs : []).filter(b => !seen.has(b.id))
  if (!fresh.length) {
    dry++
    log(`round ${round}: nothing new (${dry}/2 dry)`)
    continue
  }
  dry = 0
  for (const b of fresh) {
    seen.add(b.id)
    found.push(b.id)
  }
  log(`round ${round}: ${fresh.length} new, ${found.length} total`)
}
return found
