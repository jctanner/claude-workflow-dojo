const evens = []
for (const n of args) {
  if (n % 2 === 0) evens.push(n)
}

let firstBigIndex = null
for (const [i, n] of args.entries()) {   // enumerate()
  if (n > 100) {
    firstBigIndex = i
    break
  }
}
return { evens, firstBigIndex }
