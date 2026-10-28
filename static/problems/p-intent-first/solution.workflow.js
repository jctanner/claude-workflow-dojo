export const meta = {
  name: 'post-comments',
  description: 'Post one comment per item, safely across retries and reruns',
}

const READBACK = { type: 'object', required: ['found'], properties: { found: { type: 'boolean' } } }
const pending = new Set(args.pending)
const done = []
const reconcile = []

// Done if the remote shows it; otherwise a person decides. Never write again.
async function settle(id) {
  const r = await agent(`read back ${id}: is our comment there?`, { label: `read back ${id}`, schema: READBACK })
  if (r && r.found) return done.push(id)
  log(`${id}: write state unknown, needs reconciliation`)
  reconcile.push(id)
}

await parallel(args.items.map(id => async () => {
  if (pending.has(id)) return settle(id)
  const intent = await agent(`Run \`python3 scripts/intent.py record ${id}\` and report the result.`, { label: `intent ${id}` })
  if (intent === null) {
    log(`${id}: intent not recorded, so not writing`)
    return reconcile.push(id)
  }
  const w = await agent(`write ${id}`, { label: `write ${id}` })
  if (w !== null) return done.push(id)
  return settle(id)    // it may have committed before it died
}))

return {
  done: args.items.filter(id => done.includes(id)),
  reconcile: args.items.filter(id => reconcile.includes(id)),
}
