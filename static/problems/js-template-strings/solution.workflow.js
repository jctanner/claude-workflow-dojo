const { service, count } = args
const s = count === 1 ? '' : 's'
return `service ${service} has ${count} open incident${s}`
