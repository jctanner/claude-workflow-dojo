let total = 0
const bad = []
for (const [i, raw] of args.entries()) {
  try {
    total += JSON.parse(raw).count
  } catch (e) {
    bad.push(i)
  }
}
return { total, bad }
