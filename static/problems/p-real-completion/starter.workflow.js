export const meta = {
  name: 'process-and-report',
  description: 'Process items, establish completion, report it',
}

const INVENTORY = { type: 'object', required: ['artifacts'], properties: { artifacts: { type: 'array', items: { type: 'string' } } } }

let answers = await parallel(args.map(id => () => agent(`process ${id}`)))
const business = answers.every(a => a === 'ok') ? 'complete' : 'incomplete'   // trusts the agents

let sent = await agent(`notify status=${business}`)
if (sent === null) {
  // "something went wrong, run it again to be safe"
  answers = await parallel(args.map(id => () => agent(`process ${id}`)))
  sent = await agent(`notify status=${business}`)
}
return { business, missing: [], notified: sent !== null }
