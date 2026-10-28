// args: {items, done, events: [{key, status}]} → {todo, doneCount, latest}
const done = new Set(args.done)
const todo = args.items.filter(k => !done.includes(k))
const latest = new Map()
for (const e of args.events) latest.set(e.key, e.status)
return { todo, doneCount: done.length, latest }
