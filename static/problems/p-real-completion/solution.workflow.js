export const meta = {
  name: 'process-and-report',
  description: 'Process items, establish completion, report it',
}

const INVENTORY = { type: 'object', required: ['artifacts'], properties: { artifacts: { type: 'array', items: { type: 'string' } } } }

await parallel(args.map(id => () => agent(`process ${id}`)))

// Completion comes from what exists, not from what the agents said.
const inv = await agent('Run `python3 scripts/receipt.py inventory` once and return its JSON.', { label: 'inventory', schema: INVENTORY })
const have = new Set(inv ? inv.artifacts : [])
const missing = inv ? args.filter(id => !have.has(id)) : []
const business = !inv ? 'unknown' : missing.length ? 'incomplete' : 'complete'
if (missing.length) log(`no artifact for: ${missing.join(' ')}`)

// A failed report is a reporting problem; the work stays done.
const sent = await agent(`notify status=${business}`)
if (sent === null) log(`report failed; business status is still ${business}`)
return { business, missing, notified: sent !== null }
