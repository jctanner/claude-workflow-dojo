// args: {name: count}  → {ranked: [[name, count], ...] highest first, total}
const ranked = args.items().sort((a, b) => b[1] - a[1])
const total = sum(args.values())
return { ranked, total }
