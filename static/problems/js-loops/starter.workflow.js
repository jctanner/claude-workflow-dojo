// args: number[] → {evens, firstBigIndex: index of first n > 100, or null}
const evens = []
args.forEach(n => {
  if (n % 2 === 0) evens.push(n)
})

let firstBigIndex = null
for (const i in args) {
  if (args[i] > 100) {
    firstBigIndex = i
    break
  }
}
return { evens, firstBigIndex }
