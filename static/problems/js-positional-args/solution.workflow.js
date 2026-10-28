const numbers = args.values.map(v => Number(v))
const labels = args.names.map((name, i) => `${i + 1}. ${name}`)
return { numbers, labels }
