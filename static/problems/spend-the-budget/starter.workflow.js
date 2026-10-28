export const meta = {
  name: 'brainstorm',
  description: 'Brainstorm ideas until the token budget is nearly spent',
}

const IDEAS = {
  type: 'object',
  properties: { ideas: { type: 'array', items: { type: 'string' } } },
  required: ['ideas'],
}

const all = []
// TODO: scale the number of rounds to budget (see the description).
const r = await agent('Brainstorm two new ideas for faster CI.', { schema: IDEAS })
all.push(...r.ideas)
return all
