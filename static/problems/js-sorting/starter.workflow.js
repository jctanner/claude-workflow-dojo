// args: [{name, ms}]  → names of the 3 slowest, slowest first
const sorted = args.sort()
return sorted.slice(0, 3).map(r => r.name)
