// args: {values: string[], names: string[]} → {numbers, labels: ["1. auth", ...]}
const numbers = args.values.map(parseInt)
const labels = args.names.map((i, name) => `${i + 1}. ${name}`)
return { numbers, labels }
