const { services, required } = args
const names = services.map(s => s.name)
return {
  anyDown: services.some(s => s.status === 'down'),
  allUp: services.every(s => s.status === 'up'),
  firstDegraded: services.find(s => s.status === 'degraded')?.name ?? null,
  missing: required.filter(r => !names.includes(r)),
}
