// args: number[] → {total, big: numbers > 10}
const total = 0
for (const n of args) {
  total += n
  if (n > 10) {
    big.push(n)
  }
}
return { total, big }
