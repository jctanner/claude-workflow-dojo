export const meta = {
  name: 'process-and-verify',
  description: 'Process items, then reconcile receipts against saved state',
}

const RECEIPT = { type: 'object', required: ['recorded'], properties: { recorded: { type: 'string' } } }
const VERIFIED = { type: 'object', required: ['done'], properties: { done: { type: 'array', items: { type: 'string' } } } }

const receipts = await parallel(args.map(id => () => agent(`process ${id}`, { schema: RECEIPT })))

// The checkpoint reads real state; it decides, not the receipts.
const check = await agent('Run `python3 scripts/state.py verify` once and return its JSON.', { label: 'verify', schema: VERIFIED })
const verified = new Set(check ? check.done : [])

const done = []
const failed = []
args.forEach((id, i) => {
  if (!verified.has(id)) return failed.push(id)
  done.push(id)
  if (receipts[i]?.recorded !== id) log(`${id}: receipt missing or wrong; verified from saved state`)
})
return { done, failed }
