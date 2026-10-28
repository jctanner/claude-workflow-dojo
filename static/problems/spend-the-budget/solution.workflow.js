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
const more = round => (budget.total ? budget.remaining() > 5000 : round < 3)
for (let round = 0; more(round); round++) {
  const r = await agent(`Brainstorm two new ideas for faster CI (round ${round + 1}).`, { schema: IDEAS })
  if (r) all.push(...r.ideas)
  log(`round ${round + 1}: ${budget.spent()} tokens spent`)
}
return all
