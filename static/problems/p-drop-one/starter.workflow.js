export const meta = {
  name: 'score-then-review',
  description: 'Score each item, then review it from its scores',
  phases: [{ title: 'Score' }, { title: 'Review' }],
}

const dirs = await parallel(args.map(id => () => agent(`score ${id}`, { phase: 'Score' })))
const reviews = await parallel(args.map((id, i) => () =>
  agent(`review ${id} --scores-from ${dirs[i]}`, { phase: 'Review' })))

return {
  reviewed: args.filter((id, i) => reviews[i]),
  failed: args.filter((id, i) => !dirs[i]),
}
