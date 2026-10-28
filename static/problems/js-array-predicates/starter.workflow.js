// args: {services: [{name, status}], required: string[]}
const { services, required } = args
const names = services.map(s => s.name)
return {
  anyDown: services.some(s => s.status === 'down'),
  allUp: services.every(s => s.status === 'up'),
  firstDegraded: services.find(s => s.status === 'degraded').name,
  missing: required.filter(r => !(r in names)),
}
