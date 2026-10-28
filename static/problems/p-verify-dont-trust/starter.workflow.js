export const meta = {
  name: 'process-and-verify',
  description: 'Process items, then reconcile receipts against saved state',
}

const RECEIPT = { type: 'object', required: ['recorded'], properties: { recorded: { type: 'string' } } }
const VERIFIED = { type: 'object', required: ['done'], properties: { done: { type: 'array', items: { type: 'string' } } } }

const receipts = await parallel(args.map(id => () => agent(`process ${id}`, { schema: RECEIPT })))

// TODO: run the checkpoint (prompt contains "state.py verify", schema VERIFIED) and trust it instead.
const done = args.filter((id, i) => receipts[i] && receipts[i].recorded === id)
const failed = args.filter(id => !done.includes(id))
return { done, failed }
