let total = 0        // reassigned below, so let
const big = []       // never reassigned; push only changes its contents
for (const n of args) {
  total += n
  if (n > 10) big.push(n)
}
return { total, big }
