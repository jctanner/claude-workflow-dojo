export const meta = {
  name: 'check-review-finalize',
  description: 'Check freshness, review, then finalize the batch',
  phases: [{ title: 'Check and review' }, { title: 'Finalize' }],
}

const FRESH = { type: 'object', required: ['fresh', 'reason'], properties: { fresh: { type: 'boolean' }, reason: { type: 'string' } } }

const deferred = {}
let checkerFailures = 0

const results = await pipeline(args,
  async id => {
    const c = await agent(`check freshness of ${id}`, { phase: 'Check and review', schema: FRESH })
    if (c === null) checkerFailures++
    if (!c || !c.fresh) {
      deferred[id] = c ? c.reason : 'check failed'
      log(`${id}: deferred (${deferred[id]})`)
      throw new Error(`${id} deferred`)          // drops only this item
    }
    return id
  },
  id => agent(`review ${id}`, { phase: 'Check and review' }))

// Every check failing is the checker's problem, not the items'.
if (args.length && checkerFailures === args.length) throw new Error('freshness check failed for every item; stopping the batch')

const finalized = args.filter((id, i) => results[i] !== null)
if (finalized.length) await agent(`finalize ${finalized.join(' ')}`, { phase: 'Finalize' })

return {
  finalized,
  deferred: args.filter(id => id in deferred).map(id => ({ id, reason: deferred[id] })),
}
