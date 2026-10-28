export const meta = {
  name: 'process-with-reuse',
  description: 'Reuse saved answers where they still apply',
}

// A saved answer is fresh only if every input it depended on is unchanged.
const isFresh = (s, it) => s && s.input === it.input && s.instructions === args.instructions

const stale = args.items.filter(it => args.saved[it.id] && !isFresh(args.saved[it.id], it)).map(it => it.id)
if (stale.length) log(`saved answers are stale, redoing: ${stale.join(' ')}`)

return await parallel(args.items.map(it => () => {
  const s = args.saved[it.id]
  if (isFresh(s, it)) return s.answer
  return agent(`process ${it.id} ${it.input}`)
}))
