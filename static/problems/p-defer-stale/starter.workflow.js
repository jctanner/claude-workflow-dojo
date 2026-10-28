export const meta = {
  name: 'check-review-finalize',
  description: 'Check freshness, review, then finalize the batch',
}

const FRESH = { type: 'object', required: ['fresh', 'reason'], properties: { fresh: { type: 'boolean' }, reason: { type: 'string' } } }

const checks = await parallel(args.map(id => () => agent(`check freshness of ${id}`, { schema: FRESH })))
const stale = args.filter((id, i) => !checks[i] || !checks[i].fresh)
if (stale.length) throw new Error(`stale inputs: ${stale.join(' ')}`)   // one stale item stops everything

await parallel(args.map(id => () => agent(`review ${id}`)))
await agent(`finalize ${args.join(' ')}`)
return { finalized: args, deferred: [] }
