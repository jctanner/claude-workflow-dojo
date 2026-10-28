export const meta = {
  name: 'health-check',
  description: 'Check the health of every service',
}

const HEALTH = {
  type: 'object',
  properties: { status: { type: 'string', enum: ['ok', 'degraded', 'down'] } },
  required: ['status'],
}

const results = await parallel(args.map(svc => () =>
  agent(`Check the health of ${svc}`, { schema: HEALTH, label: svc })))
return results.map(r => (r ? r.status : 'unknown'))
