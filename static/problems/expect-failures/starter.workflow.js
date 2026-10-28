export const meta = {
  name: 'count-incidents',
  description: 'Count open incidents per shard',
}

const COUNT = {
  type: 'object',
  properties: { count: { type: 'number' } },
  required: ['count'],
}

const results = await parallel(args.map(shard => () =>
  agent(`Count open incidents in ${shard}`, { schema: COUNT })))

// TODO: this crashes when a shard fails. Handle nulls, log failures, return {total, failed}.
const total = results.reduce((sum, r) => sum + r.count, 0)
return { total, failed: [] }
