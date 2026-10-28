// args: JSON strings, some broken → {total, bad: indexes that failed}
let total = 0
const bad = []
for (const raw of args) {
  total += JSON.parse(raw).count
}
return { total, bad }
