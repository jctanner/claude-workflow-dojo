export const meta = {
  name: 'read-then-process',
  description: 'Read run state, then process each item',
}

const READ = {
  type: 'object',
  required: ['run_id', 'items'],
  properties: { run_id: { type: 'string', minLength: 1 }, items: { type: 'array', items: { type: 'string' } } },
}

const run = await agent('Run `python3 scripts/state.py read` once and return its JSON field for field.', { label: 'read', schema: READ })
const processed = await parallel(run.items.map(id => () => agent(`process ${id}`)))
return { runId: run.run_id, processed }
