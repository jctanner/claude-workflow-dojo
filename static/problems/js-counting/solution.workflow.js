const byService = {}
const errors = {}
for (const e of args) {
  byService[e.service] = (byService[e.service] ?? 0) + 1
  if (e.level === 'ERROR') (errors[e.service] ??= []).push(e.msg)
}
const top = Object.entries(byService).sort((a, b) => b[1] - a[1])[0][0]
return { byService, errors, top }
