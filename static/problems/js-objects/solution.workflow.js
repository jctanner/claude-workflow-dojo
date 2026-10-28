const ranked = Object.entries(args).sort((a, b) => b[1] - a[1])
const total = Object.values(args).reduce((sum, n) => sum + n, 0)
return { ranked, total }
