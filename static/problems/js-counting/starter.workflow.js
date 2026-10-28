// args: [{service, level, msg}] → {byService, errors, top}
const byService = {}
const errors = {}
for (const e of args) {
  byService[e.service]++
  if (e.level === 'ERROR') errors[e.service].push(e.msg)
}
const top = Object.entries(byService).sort((a, b) => b[1] - a[1])[0][0]
return { byService, errors, top }
