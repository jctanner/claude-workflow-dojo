export const meta = {
  name: 'process-remaining',
  description: 'Process items that are not already done',
}

const skip = new Set([...args.done, ...args.reviewOnly])
const todo = args.items.filter(id => !skip.has(id))
const skipped = args.items.filter(id => skip.has(id))
if (skipped.length) log(`already done or review-only, skipped: ${skipped.join(' ')}`)

return await parallel(todo.map(id => () => agent(`process ${id}`)))
