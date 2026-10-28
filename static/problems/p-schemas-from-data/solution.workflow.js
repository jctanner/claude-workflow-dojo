export const meta = {
  name: 'process-with-receipts',
  description: 'Process items with strict per-item receipts, then write a run report',
}

const receiptFor = id => ({
  type: 'object',
  additionalProperties: false,
  required: ['recorded'],
  properties: { recorded: { type: 'string', enum: [id, 'none'] } },
})
const REPORT = {
  type: 'object',
  required: ['run_id', 'summary'],
  properties: { run_id: { type: 'string' }, summary: { type: 'string' } },
}

const { runId, items } = args
const receipts = await parallel(items.map(id => () => agent(`process ${id}`, { schema: receiptFor(id) })))
const recorded = items.filter((id, i) => receipts[i]?.recorded === id)
const failed = items.filter(id => !recorded.includes(id))

const report = await agent('Run `python3 scripts/state.py report` and return its JSON.', {
  schema: { ...REPORT, properties: { ...REPORT.properties, run_id: { type: 'string', const: runId } } },
})
if (!report) throw new Error('report: missing or from a different run')
return { recorded, failed, report }
