export const meta = {
  name: 'health-check',
  description: 'Check the health of every service',
}

const HEALTH = {
  type: 'object',
  properties: { status: { type: 'string', enum: ['ok', 'degraded', 'down'] } },
  required: ['status'],
}

const statuses = []
for (const svc of args) {
  const r = await agent(`Check the health of ${svc}`, { schema: HEALTH, label: svc })
  statuses.push(r.status)
}
return statuses
