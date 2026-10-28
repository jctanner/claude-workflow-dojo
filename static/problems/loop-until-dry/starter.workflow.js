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

// TODO: loop finder rounds until 2 consecutive rounds add nothing new.
const round = await agent('Find bugs in the payments service.', { schema: BUGS })
return round.bugs.map(b => b.id)
