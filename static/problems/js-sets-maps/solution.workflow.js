const done = new Set(args.done)
const todo = args.items.filter(k => !done.has(k))
const latest = new Map()
for (const e of args.events) latest.set(e.key, e.status)
return { todo, doneCount: done.size, latest: Object.fromEntries(latest) }
