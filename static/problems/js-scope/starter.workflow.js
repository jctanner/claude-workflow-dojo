// args: {errors, items: [{id, scores}]} → {level, passing}
if (args.errors > 10) {
  const level = 'high'
} else {
  const level = 'low'
}

const withAvg = args.items.map(item => {
  const avg = item.scores.reduce((a, b) => a + b, 0) / item.scores.length
  return item
})

return {
  level,
  passing: withAvg.filter(item => avg >= 5).map(item => item.id),
}
