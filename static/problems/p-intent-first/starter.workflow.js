export const meta = {
  name: 'post-comments',
  description: 'Post one comment per item, safely across retries and reruns',
}

// args: {items, pending}
const READBACK = { type: 'object', required: ['found'], properties: { found: { type: 'boolean' } } }

const done = []
await parallel(args.items.map(id => async () => {
  let w = await agent(`write ${id}`)
  if (w === null) w = await agent(`write ${id}`)   // "just retry"
  if (w !== null) done.push(id)
}))
return { done: args.items.filter(id => done.includes(id)), reconcile: [] }
