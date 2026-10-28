export const meta = {
  name: 'score-then-review',
  description: 'Score each item, then review it from its scores',
  phases: [{ title: 'Score' }, { title: 'Review' }],
}

const failed = []
const results = await pipeline(args,
  async id => {
    const dir = await agent(`score ${id}`, { phase: 'Score', label: `score ${id}` })
    if (dir === null) {
      failed.push(id)
      log(`score ${id}: no result`)
      throw new Error(`score ${id}`)          // drops only this item
    }
    return dir
  },
  (dir, id) => agent(`review ${id} --scores-from ${dir}`, { phase: 'Review', label: `review ${id}` }))

return {
  reviewed: args.filter((id, i) => results[i] !== null),
  failed: args.filter(id => failed.includes(id)),
}
