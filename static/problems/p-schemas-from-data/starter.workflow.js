export const meta = {
  name: 'process-with-receipts',
  description: 'Process items with strict per-item receipts, then write a run report',
}

const RECEIPT = { type: 'object', required: ['recorded'], properties: { recorded: { type: 'string' } } }
const REPORT = {
  type: 'object',
  required: ['run_id', 'summary'],
  properties: { run_id: { type: 'string' }, summary: { type: 'string' } },
}

const { runId, items } = args
const receipts = await parallel(items.map(id => () => agent(`process ${id}`, { schema: RECEIPT })))
const recorded = items.filter((id, i) => receipts[i] && receipts[i].recorded !== 'none')
const failed = items.filter(id => !recorded.includes(id))

const report = await agent('Run `python3 scripts/state.py report` and return its JSON.', { schema: REPORT })
return { recorded, failed, report }
