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
  agent(`Count open incidents in ${shard}`, { schema: COUNT, label: shard })))

const failed = args.filter((shard, i) => results[i] == null)
for (const shard of failed) log(`no result from ${shard}; it is excluded from the total`)

const total = results.filter(Boolean).reduce((sum, r) => sum + r.count, 0)
return { total, failed }
